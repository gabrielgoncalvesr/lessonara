begin;
alter table public.students add column promotional_email_opt_out boolean not null default false;
alter table public.email_outbox drop constraint email_outbox_template_check;
alter table public.email_outbox add constraint email_outbox_template_check check(template in ('welcome','otp','reminder','campaign'));
create table public.email_campaigns(id uuid primary key,teacher_id uuid not null references public.teachers(id) on delete cascade,subject text not null check(char_length(subject) between 1 and 120),recipients integer not null check(recipients between 1 and 100),created_at timestamptz not null default now());
alter table public.email_campaigns enable row level security;
revoke all on public.email_campaigns from public,anon,authenticated;
grant select on public.email_campaigns to authenticated;grant all on public.email_campaigns to service_role;
create policy "own campaigns" on public.email_campaigns for select to authenticated using(teacher_id=auth.uid());
create function public.queue_email_campaign(p_id uuid,p_subject text,p_content text,p_students uuid[]) returns integer language plpgsql security definer set search_path='' as $$
declare tid uuid:=auth.uid();n integer;existing public.email_campaigns;
begin
 if tid is null or not exists(select 1 from public.teachers where id=tid and platform_plan='pro') then raise exception 'Campanhas estão disponíveis no plano Pro.' using errcode='42501';end if;
 if p_subject is null or char_length(trim(p_subject)) not between 1 and 120 or p_subject~E'[\\r\\n]' or p_content is null or char_length(p_content) not between 1 and 100000 or p_students is null or array_position(p_students,null) is not null or cardinality(p_students) not between 1 and 100 then raise exception 'Confira os campos e selecione até 100 alunos.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-campaigns:'||tid::text));
 select * into existing from public.email_campaigns where id=p_id;
 if found then if existing.teacher_id<>tid or existing.subject<>trim(p_subject) then raise exception 'Campanha inválida.';end if;return existing.recipients;end if;
 if exists(select 1 from unnest(p_students) as chosen(id) where not exists(select 1 from public.students s where s.id=chosen.id and teacher_id=tid and active and email is not null and not promotional_email_opt_out)) then raise exception 'Um aluno mudou ou não está disponível para esta campanha. Revise os destinatários.';end if;
 select count(distinct lower(trim(email))) into n from public.students where id=any(p_students) and teacher_id=tid;
 if n<1 then raise exception 'Selecione pelo menos um aluno.';end if;
 if exists(select 1 from public.email_campaigns where teacher_id=tid and created_at>now()-interval '1 minute') then raise exception 'Aguarde um minuto antes de registrar outra campanha.';end if;
 if (select coalesce(sum(recipients),0) from public.email_campaigns where teacher_id=tid and created_at>now()-interval '24 hours')+n>500 then raise exception 'O limite de 500 destinatários por dia foi atingido.';end if;
 insert into public.email_campaigns values(p_id,tid,trim(p_subject),n,now());
 insert into public.email_outbox(event_key,teacher_id,student_id,recipient,template,payload)
 select 'campaign/'||p_id||'/'||s.id,tid,s.id,lower(trim(s.email)),'campaign',jsonb_build_object('sealed',p_content) from (select distinct on (lower(trim(email))) id,email from public.students where teacher_id=tid and id=any(p_students) order by lower(trim(email)),id) s;
 return n;
end;$$;
revoke all on function public.queue_email_campaign(uuid,text,text,uuid[]) from public,anon;
grant execute on function public.queue_email_campaign(uuid,text,text,uuid[]) to authenticated;
commit;
