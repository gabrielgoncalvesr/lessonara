-- Assinatura da empresa, separada dos pacotes de aulas. Não cria cobranças.
begin;
alter table public.teachers drop constraint if exists teachers_platform_plan_check;
update public.teachers set platform_plan=case platform_plan when 'professional' then 'plus' when 'studio' then 'pro' else platform_plan end where platform_plan in ('professional','studio');
alter table public.teachers add constraint teachers_platform_plan_check check(platform_plan in ('essential','plus','pro'));
create function public.protect_platform_plan() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.uid() is not null and coalesce(auth.role(),'')<>'service_role' and ((tg_op='INSERT' and new.platform_plan<>'essential') or (tg_op='UPDATE' and new.platform_plan is distinct from old.platform_plan)) then raise exception 'O plano da empresa só pode ser alterado pela administração.' using errcode='42501';end if;
 return new;
end;$$;
create trigger protect_platform_plan before insert or update on public.teachers for each row execute function public.protect_platform_plan();
alter table public.documents drop constraint if exists documents_byte_size_check;
alter table public.documents add constraint documents_byte_size_check check(byte_size between 1 and 1073741824);
alter table public.activity_submissions drop constraint if exists activity_submissions_byte_size_check;
alter table public.activity_submissions add constraint activity_submissions_byte_size_check check(byte_size between 1 and 1073741824);

create function public.platform_storage_limits(p_teacher uuid) returns table(max_file_bytes bigint,storage_bytes bigint) language sql stable security definer set search_path='' as $$
 select case platform_plan when 'pro' then 1073741824 when 'plus' then 104857600 else 20971520 end::bigint,
 case platform_plan when 'pro' then 21474836480 when 'plus' then 5368709120 else 1073741824 end::bigint
 from public.teachers where id=p_teacher;
$$;
revoke all on function public.platform_storage_limits(uuid) from public,anon,authenticated;
grant execute on function public.platform_storage_limits(uuid) to service_role;

create function public.enforce_platform_storage() returns trigger language plpgsql security definer set search_path='' as $$
declare max_file bigint;quota bigint;used_bytes bigint;check_increase boolean;
begin
 if auth.uid() is not null and coalesce(auth.role(),'')<>'service_role' and new.teacher_id<>auth.uid() then raise exception 'Conta não encontrada.' using errcode='42501';end if;
 check_increase:=tg_op='INSERT';
 if tg_op='UPDATE' then
  if new.teacher_id<>old.teacher_id then raise exception 'Não é permitido transferir arquivos entre contas.';end if;
  check_increase:=new.byte_size>old.byte_size or (tg_table_name='activity_submissions' and old.status='deleted' and new.status<>'deleted');
 end if;
 if not check_increase then return new;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-documents:'||new.teacher_id::text));
 select max_file_bytes,storage_bytes into max_file,quota from public.platform_storage_limits(new.teacher_id);
 if max_file is null or new.byte_size>max_file then raise exception 'O arquivo excede o limite do plano da empresa.';end if;
 select coalesce((select sum(byte_size) from public.documents where teacher_id=new.teacher_id and (tg_table_name<>'documents' or id<>new.id)),0)+coalesce((select sum(byte_size) from public.activity_submissions where teacher_id=new.teacher_id and status<>'deleted' and (tg_table_name<>'activity_submissions' or id<>new.id)),0) into used_bytes;
 if used_bytes+new.byte_size>quota then raise exception 'Limite de armazenamento do plano atingido.';end if;
 return new;
end;$$;
create trigger platform_document_quota before insert or update on public.documents for each row execute function public.enforce_platform_storage();
create trigger platform_submission_quota before insert or update on public.activity_submissions for each row execute function public.enforce_platform_storage();

create or replace function public.reserve_document_upload(p_id uuid,p_title text,p_subject text,p_file_name text,p_storage_path text,p_mime_type text,p_byte_size bigint) returns uuid language plpgsql security invoker set search_path='' as $$
declare tid uuid:=auth.uid();begin
 if tid is null then raise exception 'Não autenticado';end if;
 insert into public.documents(id,teacher_id,title,subject,file_name,storage_path,mime_type,byte_size) values(p_id,tid,p_title,p_subject,p_file_name,p_storage_path,p_mime_type,p_byte_size);
 return p_id;
end;$$;
create or replace function public.reserve_activity_submission(p_id uuid,p_activity_id uuid,p_teacher_id uuid,p_student_id uuid,p_file_name text,p_storage_path text,p_mime_type text,p_byte_size bigint) returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.activities where id=p_activity_id and teacher_id=p_teacher_id and student_id=p_student_id and archived_at is null) then raise exception 'Atividade indisponível';end if;
 insert into public.activity_submissions(id,activity_id,teacher_id,student_id,file_name,storage_path,mime_type,byte_size) values(p_id,p_activity_id,p_teacher_id,p_student_id,p_file_name,p_storage_path,p_mime_type,p_byte_size);
 return p_id;
end;$$;
revoke all on function public.reserve_document_upload(uuid,text,text,text,text,text,bigint) from public,anon;
grant execute on function public.reserve_document_upload(uuid,text,text,text,text,text,bigint) to authenticated;
revoke all on function public.reserve_activity_submission(uuid,uuid,uuid,uuid,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_activity_submission(uuid,uuid,uuid,uuid,text,text,text,bigint) to service_role;
revoke all on function public.protect_platform_plan(),public.enforce_platform_storage() from public,anon,authenticated;
create function public.verify_uploaded_document_size() returns trigger language plpgsql security definer set search_path='' as $$
declare actual_bytes bigint;bucket text;verify_ready boolean;
begin
 verify_ready:=new.status='ready';
 if tg_op='UPDATE' then verify_ready:=verify_ready and (old.status<>'ready' or old.byte_size<>new.byte_size or old.storage_path<>new.storage_path);end if;
 if not verify_ready then return new;end if;
 bucket:=case tg_table_name when 'documents' then 'lessonara-documents' else 'lessonara-activities' end;
 select (metadata->>'size')::bigint into actual_bytes from storage.objects where bucket_id=bucket and name=new.storage_path;
 if actual_bytes is null or actual_bytes<>new.byte_size then raise exception 'Não foi possível confirmar o tamanho do arquivo enviado.';end if;
 return new;
end;$$;
create trigger verify_document_size before insert or update on public.documents for each row execute function public.verify_uploaded_document_size();
create trigger verify_submission_size before insert or update on public.activity_submissions for each row execute function public.verify_uploaded_document_size();
revoke all on function public.verify_uploaded_document_size() from public,anon,authenticated;
-- A conta de teste aprovada pelo proprietário continua com os recursos Pro.
update public.teachers set platform_plan='pro' where email='prof@lessonara.test';
-- Os buckets seguem o teto do provedor; as cotas por empresa ficam nos gatilhos acima.
update storage.buckets set file_size_limit=null where id in ('lessonara-documents','lessonara-activities');
commit;
