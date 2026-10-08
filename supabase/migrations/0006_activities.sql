begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
select 'lessonara-activities','lessonara-activities',false,file_size_limit,allowed_mime_types from storage.buckets where id='lessonara-documents'
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create table public.activities (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.teachers on delete cascade,
 student_id uuid not null references public.students on delete cascade,
 document_id uuid references public.documents on delete set null,
 title text not null check(length(trim(title)) between 1 and 120),
 instructions text not null default '' check(length(instructions)<=4000),
 assigned_at timestamptz not null default now(),
 due_on date,
 reviewed_at timestamptz,
 feedback text not null default '' check(length(feedback)<=4000),
 archived_at timestamptz,
 unique(id,teacher_id,student_id)
);
create index activities_teacher_date on public.activities(teacher_id,assigned_at desc);
create index activities_student on public.activities(student_id);
create table public.activity_submissions (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null unique,
 teacher_id uuid not null,
 student_id uuid not null,
 file_name text not null check(length(file_name) between 1 and 180),
 storage_path text not null unique,
 mime_type text not null,
 byte_size bigint not null check(byte_size between 1 and 20971520),
 status text not null default 'uploading' check(status in ('uploading','ready','deleting','deleted')),
 submitted_at timestamptz,
 submitted_late boolean not null default false,
 note text not null default '' check(length(note)<=4000),
 foreign key(activity_id,teacher_id,student_id) references public.activities(id,teacher_id,student_id) on delete cascade,
 check(storage_path like teacher_id::text || '/' || id::text || '/file.%'),
 check(status not in ('ready','deleted') or submitted_at is not null)
);
create index submissions_teacher on public.activity_submissions(teacher_id);
alter table public.activities enable row level security;
alter table public.activity_submissions enable row level security;
revoke all on public.activities,public.activity_submissions from public,anon,authenticated;
grant select,insert,update on public.activities to authenticated;
grant select on public.activity_submissions to authenticated;
grant all on public.activities,public.activity_submissions to service_role;
create policy "own activities" on public.activities for all to authenticated using(teacher_id=auth.uid())
 with check(teacher_id=auth.uid() and exists(select 1 from public.students s where s.id=student_id and s.teacher_id=auth.uid())
 and (document_id is null or exists(select 1 from public.documents d where d.id=document_id and d.teacher_id=auth.uid() and d.status='ready')));
create policy "own submissions" on public.activity_submissions for select to authenticated using(teacher_id=auth.uid());
create policy "read own activity files" on storage.objects for select to authenticated using(bucket_id='lessonara-activities' and exists(select 1 from public.activity_submissions s where s.storage_path=name and s.teacher_id=auth.uid()));
create policy "delete own activity files" on storage.objects for delete to authenticated using(bucket_id='lessonara-activities' and exists(select 1 from public.activity_submissions s where s.storage_path=name and s.teacher_id=auth.uid()));

create function public.submission_storage_usage() returns bigint language sql security invoker set search_path='' as $$
 select coalesce(sum(byte_size),0)::bigint from public.activity_submissions where teacher_id=auth.uid() and status<>'deleted';
$$;
revoke all on function public.submission_storage_usage() from public,anon;
grant execute on function public.submission_storage_usage() to authenticated;

-- Uma reserva por atividade e a mesma cota/lock usados pela biblioteca.
create function public.reserve_activity_submission(p_id uuid,p_activity_id uuid,p_teacher_id uuid,p_student_id uuid,p_file_name text,p_storage_path text,p_mime_type text,p_byte_size bigint) returns uuid language plpgsql security invoker set search_path='' as $$
declare used_bytes bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-documents:' || p_teacher_id::text));
 if not exists(select 1 from public.activities where id=p_activity_id and teacher_id=p_teacher_id and student_id=p_student_id and archived_at is null) then raise exception 'Atividade indisponível'; end if;
 select coalesce((select sum(byte_size) from public.documents where teacher_id=p_teacher_id),0)+coalesce((select sum(byte_size) from public.activity_submissions where teacher_id=p_teacher_id and status<>'deleted'),0) into used_bytes;
 if used_bytes+p_byte_size>1073741824 then raise exception 'Limite de armazenamento atingido'; end if;
 insert into public.activity_submissions(id,activity_id,teacher_id,student_id,file_name,storage_path,mime_type,byte_size)
 values(p_id,p_activity_id,p_teacher_id,p_student_id,p_file_name,p_storage_path,p_mime_type,p_byte_size);
 return p_id;
end;
$$;
revoke all on function public.reserve_activity_submission(uuid,uuid,uuid,uuid,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_activity_submission(uuid,uuid,uuid,uuid,text,text,text,bigint) to service_role;

create or replace function public.reserve_document_upload(p_id uuid,p_title text,p_subject text,p_file_name text,p_storage_path text,p_mime_type text,p_byte_size bigint) returns uuid language plpgsql security invoker set search_path='' as $$
declare tid uuid:=auth.uid(); used_bytes bigint;
begin
 if tid is null then raise exception 'Não autenticado'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-documents:' || tid::text));
 select coalesce((select sum(byte_size) from public.documents where teacher_id=tid),0)+coalesce((select sum(byte_size) from public.activity_submissions where teacher_id=tid and status<>'deleted'),0) into used_bytes;
 if used_bytes+p_byte_size>1073741824 then raise exception 'Limite de armazenamento da biblioteca atingido'; end if;
 insert into public.documents(id,teacher_id,title,subject,file_name,storage_path,mime_type,byte_size) values(p_id,tid,p_title,p_subject,p_file_name,p_storage_path,p_mime_type,p_byte_size);
 return p_id;
end;
$$;

-- Finalização serializada com o arquivamento e carimbo de entrega do servidor.
create function public.complete_activity_submission(p_submission_id uuid,p_activity_id uuid,p_teacher_id uuid,p_student_id uuid,p_note text) returns uuid language plpgsql security invoker set search_path='' as $$
declare deadline date; saved uuid;
begin
 select due_on into deadline from public.activities where id=p_activity_id and teacher_id=p_teacher_id and student_id=p_student_id and archived_at is null for update;
 if not found then raise exception 'Atividade indisponível'; end if;
 update public.activity_submissions set status='ready',submitted_at=now(),submitted_late=coalesce((now() at time zone 'America/Sao_Paulo')::date>deadline,false),note=p_note
 where id=p_submission_id and activity_id=p_activity_id and teacher_id=p_teacher_id and student_id=p_student_id and status='uploading' returning id into saved;
 if saved is null then raise exception 'Envio não encontrado ou já concluído'; end if;
 return saved;
end;
$$;
revoke all on function public.complete_activity_submission(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_activity_submission(uuid,uuid,uuid,uuid,text) to service_role;

commit;
