begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lessonara-documents', 'lessonara-documents', false, 20971520, array[
  'application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers on delete cascade,
  title text not null check (length(title) between 1 and 120),
  subject text not null default '' check (length(subject) <= 80),
  file_name text not null check (length(file_name) between 1 and 180),
  storage_path text not null unique,
  mime_type text not null,
  byte_size bigint not null check (byte_size between 1 and 20971520),
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'deleting')),
  created_at timestamptz not null default now(),
  unique (id, teacher_id),
  check (storage_path like teacher_id::text || '/' || id::text || '/file.%')
);
create index if not exists documents_teacher_created on public.documents (teacher_id, created_at desc);

create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers on delete cascade,
  document_id uuid not null,
  student_id uuid not null references public.students on delete cascade,
  expires_on date,
  created_at timestamptz not null default now(),
  unique (document_id, student_id),
  foreign key (document_id, teacher_id) references public.documents (id, teacher_id) on delete cascade
);
create index if not exists document_shares_student on public.document_shares (student_id);
create index if not exists document_shares_teacher on public.document_shares (teacher_id);

alter table public.documents enable row level security;
alter table public.document_shares enable row level security;
revoke all on public.documents, public.document_shares from anon;
grant select, insert, update, delete on public.documents, public.document_shares to authenticated, service_role;

drop policy if exists "own documents" on public.documents;
create policy "own documents" on public.documents for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists "own document shares" on public.document_shares;
create policy "own document shares" on public.document_shares for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and exists (select 1 from public.students s where s.id = document_shares.student_id and s.teacher_id = auth.uid())
    and exists (select 1 from public.documents d where d.id = document_shares.document_id
      and d.teacher_id = auth.uid() and d.status = 'ready'));

drop policy if exists "lessonara document upload" on storage.objects;
create policy "lessonara document upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'lessonara-documents'
    and exists (select 1 from public.documents d where d.storage_path = name
      and d.teacher_id = auth.uid() and d.status = 'uploading'));
drop policy if exists "lessonara document read" on storage.objects;
create policy "lessonara document read" on storage.objects for select to authenticated
  using (bucket_id = 'lessonara-documents'
    and exists (select 1 from public.documents d where d.storage_path = name and d.teacher_id = auth.uid()));
drop policy if exists "lessonara document delete" on storage.objects;
create policy "lessonara document delete" on storage.objects for delete to authenticated
  using (bucket_id = 'lessonara-documents'
    and exists (select 1 from public.documents d where d.storage_path = name and d.teacher_id = auth.uid()));

-- Reserva espaço antes de assinar o upload. O lock evita ultrapassar a cota
-- com dois envios simultâneos da mesma professora. Não recebe arquivos.
create or replace function public.reserve_document_upload(
  p_id uuid, p_title text, p_subject text, p_file_name text,
  p_storage_path text, p_mime_type text, p_byte_size bigint
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  tid uuid := auth.uid();
  used_bytes bigint;
begin
  if tid is null then raise exception 'Não autenticado'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-documents:' || tid::text));
  select coalesce(sum(byte_size), 0) into used_bytes from public.documents where teacher_id = tid;
  if used_bytes + p_byte_size > 1073741824 then
    raise exception 'Limite de armazenamento da biblioteca atingido';
  end if;
  insert into public.documents (id, teacher_id, title, subject, file_name, storage_path, mime_type, byte_size)
    values (p_id, tid, p_title, p_subject, p_file_name, p_storage_path, p_mime_type, p_byte_size);
  return p_id;
end;
$$;
revoke all on function public.reserve_document_upload(uuid, text, text, text, text, text, bigint) from public, anon;
grant execute on function public.reserve_document_upload(uuid, text, text, text, text, text, bigint) to authenticated;

commit;
