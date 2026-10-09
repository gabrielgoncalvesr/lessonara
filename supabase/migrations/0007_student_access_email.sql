begin;

-- Auth users de alunos não ganham perfil/plano de professora.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'role' = 'student' then return new; end if;
  insert into public.teachers(id,email,name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',''));
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='plans' and column_name='weekly_lessons') then
    execute 'insert into public.plans(teacher_id,name,lessons,price,weekly_lessons) values($1,''1x por semana'',4,300,1),($1,''2x por semana'',8,500,2)' using new.id;
  else
    insert into public.plans(teacher_id,name,lessons,price) values(new.id,'1x por semana',4,300),(new.id,'2x por semana',8,500);
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
-- Um aluno autenticado não pode fabricar seu próprio perfil de professora.
drop policy if exists "own teacher" on public.teachers;
create policy "read own teacher" on public.teachers for select to authenticated using(id=auth.uid());
create policy "update own teacher" on public.teachers for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

alter table public.students add column access_version bigint not null default 1;
update public.students set email=lower(trim(email)) where email is not null;
-- Preserva o legado incompleto; exige email nos novos cadastros e nas edições.
alter table public.students add constraint student_email_required check(email is not null and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(email)<=254) not valid;
create index students_login_email on public.students(lower(trim(email))) where active;

create table public.email_outbox(
 id uuid primary key default gen_random_uuid(), event_key text not null unique,
 teacher_id uuid references public.teachers on delete cascade, student_id uuid references public.students on delete cascade,
 recipient text not null, template text not null check(template in ('welcome','otp','reminder')),
 payload jsonb not null, status text not null default 'pending' check(status in ('pending','sending','sent','failed','cancelled')),
 attempts integer not null default 0, available_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
 lease_id uuid, locked_at timestamptz, first_attempt_at timestamptz, provider_id text, last_error text, delivery jsonb,
 created_at timestamptz not null default now(), sent_at timestamptz
);
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon,authenticated;
grant select(id,teacher_id,student_id,recipient,template,status,attempts,last_error,created_at,sent_at) on public.email_outbox to authenticated;
grant all on public.email_outbox to service_role;
create policy "own email status" on public.email_outbox for select to authenticated using(teacher_id=auth.uid());
create index email_outbox_due on public.email_outbox(status,available_at);

create table public.student_auth_challenges(
 id uuid primary key, email text not null, auth_user_id uuid references auth.users on delete cascade, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '10 minutes', attempts integer not null default 0,
 consumed_at timestamptz, verified_at timestamptz
);
create table public.student_sessions(
 id uuid primary key default gen_random_uuid(), token_hash text not null unique, auth_user_id uuid not null references auth.users on delete cascade,
 email text not null, expires_at timestamptz not null default now()+interval '30 days', created_at timestamptz not null default now()
);
create table public.student_session_links(
 session_id uuid references public.student_sessions on delete cascade,
 student_id uuid references public.students on delete cascade, access_version bigint not null,
 primary key(session_id,student_id), unique(session_id)
);
create table public.student_auth_limits(
 key text primary key, count integer not null, window_start timestamptz not null
);
create index student_sessions_expiry on public.student_sessions(expires_at);
create index student_challenges_expiry on public.student_auth_challenges(expires_at);

alter table public.student_auth_challenges enable row level security;
alter table public.student_sessions enable row level security;
alter table public.student_session_links enable row level security;
alter table public.student_auth_limits enable row level security;
revoke all on public.student_auth_challenges,public.student_sessions,public.student_session_links,public.student_auth_limits from anon,authenticated;
grant all on public.student_auth_challenges,public.student_sessions,public.student_session_links,public.student_auth_limits to service_role;

create or replace function public.student_email_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 new.email:=lower(trim(new.email));
 if tg_op='UPDATE' then
  if new.email is distinct from old.email or new.active is distinct from old.active or new.slug is distinct from old.slug then
   new.access_version:=old.access_version+1;
   delete from public.student_session_links where student_id=old.id;
   update public.email_outbox set status='cancelled',payload='{}'::jsonb,delivery=null
    where student_id=old.id and status in ('pending','failed');
  end if;
 end if;
 return new;
end;
$$;
create trigger normalize_student_email before insert or update on public.students for each row execute function public.student_email_change();

-- Boas-vindas e cadastro ficam na mesma transação; não dependem do provedor.
create or replace function public.queue_student_welcome() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.active and new.email is not null and (tg_op='INSERT' or new.email is distinct from old.email or (new.active and not old.active)) then
  insert into public.email_outbox(event_key,teacher_id,student_id,recipient,template,payload)
   values('welcome/'||new.id||'/'||new.access_version,new.teacher_id,new.id,new.email,'welcome','{}');
 end if;
 return new;
end;
$$;
create trigger welcome_student after insert or update on public.students for each row execute function public.queue_student_welcome();

-- Contadores persistentes: não dependem da instância serverless que recebe a requisição.
create function public.allow_student_auth(p_keys text[],p_limits integer[],p_seconds integer[]) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; r public.student_auth_limits; allowed boolean:=true;
begin
 if cardinality(p_keys)<>cardinality(p_limits) or cardinality(p_keys)<>cardinality(p_seconds) then return false; end if;
 for n in 1..cardinality(p_keys) loop
  insert into public.student_auth_limits(key,count,window_start) values(p_keys[n],0,now()) on conflict do nothing;
  select * into r from public.student_auth_limits where key=p_keys[n] for update;
  if r.window_start+make_interval(secs=>p_seconds[n])<=now() then
   r.count:=0; r.window_start:=now();
  end if;
  if r.count>=p_limits[n] then allowed:=false; end if;
  update public.student_auth_limits set count=least(r.count+1,p_limits[n]+1),window_start=r.window_start where key=p_keys[n];
 end loop;
 return allowed;
end;
$$;
create function public.attempt_student_code(p_id uuid) returns setof public.student_auth_challenges
language plpgsql security definer set search_path='' as $$
begin
 return query update public.student_auth_challenges set attempts=attempts+1
 where id=p_id and expires_at>now() and consumed_at is null and verified_at is null and attempts<5 returning *;
end;
$$;

-- Sessão e vínculos são criados juntos e somente após confirmação do email pelo Auth.
create function public.open_student_session(p_challenge uuid,p_auth_user uuid,p_token_hash text,p_student uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.student_auth_challenges; sid uuid;
begin
 select * into c from public.student_auth_challenges where id=p_challenge for update;
 if not found or c.consumed_at is not null or c.expires_at<=now() or c.verified_at is null or c.auth_user_id is distinct from p_auth_user then return null; end if;
 update public.student_auth_challenges set consumed_at=now() where id=c.id;
 insert into public.student_sessions(token_hash,auth_user_id,email) values(p_token_hash,p_auth_user,c.email) returning id into sid;
 insert into public.student_session_links(session_id,student_id,access_version)
  select sid,id,access_version from public.students where id=p_student and lower(trim(email))=c.email and active;
 if not found then delete from public.student_sessions where id=sid; return null; end if;
 return sid;
end;
$$;

create function public.claim_email_jobs(p_limit integer default 10,p_id uuid default null)
returns setof public.email_outbox language plpgsql security definer set search_path='' as $$
begin
 update public.email_outbox set status='failed',last_error='Prazo de envio encerrado.',payload='{}',delivery=null
 where status in ('pending','sending') and (expires_at<=now() or first_attempt_at<now()-interval '23 hours' or (status='sending' and attempts>=5 and locked_at<now()-interval '2 minutes'));
 return query with due as (
 select id from public.email_outbox where (p_id is null or id=p_id) and attempts<5 and expires_at>now()
 and ((status='pending' and available_at<=now()) or (status='sending' and locked_at<now()-interval '2 minutes'))
 order by created_at for update skip locked limit least(greatest(p_limit,1),20)
 ) update public.email_outbox q set status='sending',lease_id=gen_random_uuid(),locked_at=now(),
 attempts=q.attempts+1,first_attempt_at=coalesce(q.first_attempt_at,now()) from due where q.id=due.id returning q.*;
end;
$$;

revoke execute on function public.student_email_change(),public.queue_student_welcome(),public.allow_student_auth(text[],integer[],integer[]),public.attempt_student_code(uuid),public.open_student_session(uuid,uuid,text,uuid),public.claim_email_jobs(integer,uuid) from public,anon,authenticated;
grant execute on function public.allow_student_auth(text[],integer[],integer[]),public.attempt_student_code(uuid),public.open_student_session(uuid,uuid,text,uuid),public.claim_email_jobs(integer,uuid) to service_role;
commit;
