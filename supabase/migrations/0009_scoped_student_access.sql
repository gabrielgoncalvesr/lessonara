begin;
alter table public.student_auth_challenges add column student_id uuid references public.students(id) on delete cascade;
-- Desafios antigos sem contexto não são utilizáveis; sessões já validadas continuam com um vínculo.
update public.student_auth_challenges set consumed_at=coalesce(consumed_at,now());
create or replace function public.open_student_session(p_challenge uuid,p_auth_user uuid,p_token_hash text,p_student uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.student_auth_challenges; sid uuid;
begin
 select * into c from public.student_auth_challenges where id=p_challenge for update;
 if not found or c.consumed_at is not null or c.expires_at<=now() or c.verified_at is null or c.auth_user_id is distinct from p_auth_user or c.student_id is distinct from p_student then return null; end if;
 if not exists(select 1 from public.students where id=p_student and email=c.email and active) then return null; end if;
 update public.student_auth_challenges set consumed_at=now() where id=c.id;
 insert into public.student_sessions(token_hash,auth_user_id,email) values(p_token_hash,p_auth_user,c.email) returning id into sid;
 insert into public.student_session_links(session_id,student_id,access_version) select sid,id,access_version from public.students where id=p_student and email=c.email and active;
 if not found then delete from public.student_sessions where id=sid;return null;end if;
 return sid;
end;
$$;
revoke execute on function public.open_student_session(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.open_student_session(uuid,uuid,text,uuid) to service_role;
commit;
