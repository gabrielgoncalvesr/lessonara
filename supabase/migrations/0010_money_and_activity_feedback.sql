begin;
alter table public.plans alter column price type numeric(12,2) using price::numeric;
alter table public.students alter column price_override type numeric(12,2) using price_override::numeric;
alter table public.packages alter column amount type numeric(12,2) using amount::numeric;
alter table public.packages add constraint package_lessons_positive check(lessons between 1 and 1000) not valid;
alter table public.packages add constraint package_amount_nonnegative check(amount>=0) not valid;
alter table public.plans add constraint plan_lessons_positive check(lessons between 1 and 1000) not valid;
alter table public.plans add constraint plan_price_nonnegative check(price>=0) not valid;
alter table public.students add constraint student_price_nonnegative check(price_override is null or price_override>=0) not valid;
create table public.activity_feedback_documents(
 activity_id uuid primary key,
 teacher_id uuid not null references public.teachers(id) on delete cascade,
 student_id uuid not null,
 document_id uuid not null references public.documents(id) on delete cascade,
 foreign key(activity_id,teacher_id,student_id) references public.activities(id,teacher_id,student_id) on delete cascade
);
alter table public.activity_feedback_documents enable row level security;
revoke all on public.activity_feedback_documents from anon;
grant select,insert,update,delete on public.activity_feedback_documents to authenticated,service_role;
create policy "own feedback files" on public.activity_feedback_documents for all to authenticated
 using(teacher_id=auth.uid()) with check(teacher_id=auth.uid() and exists(select 1 from public.documents d where d.id=document_id and d.teacher_id=auth.uid() and d.status='ready'));
create function public.review_activity(p_id uuid,p_feedback text,p_document uuid default null) returns void
language plpgsql security invoker set search_path='' as $$
declare a public.activities;
begin
 select * into a from public.activities where id=p_id and teacher_id=auth.uid() for update;
 if not found or length(p_feedback)>4000 then raise exception 'Atividade ou comentário inválido.';end if;
 if not exists(select 1 from public.activity_submissions where activity_id=a.id and submitted_at is not null) then raise exception 'A atividade ainda não foi entregue.';end if;
 if p_document is not null and not exists(select 1 from public.documents where id=p_document and teacher_id=auth.uid() and status='ready') then raise exception 'Arquivo não disponível na sua biblioteca.';end if;
 update public.activities set feedback=trim(p_feedback),reviewed_at=now() where id=a.id;
 if p_document is null then delete from public.activity_feedback_documents where activity_id=a.id;
 else insert into public.activity_feedback_documents(activity_id,teacher_id,student_id,document_id) values(a.id,a.teacher_id,a.student_id,p_document) on conflict(activity_id) do update set document_id=excluded.document_id;end if;
end;
$$;
revoke execute on function public.review_activity(uuid,text,uuid) from public,anon;
grant execute on function public.review_activity(uuid,text,uuid) to authenticated;
commit;
