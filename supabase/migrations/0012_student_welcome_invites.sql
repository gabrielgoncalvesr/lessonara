begin;
create table public.student_invites(id uuid primary key default gen_random_uuid(),token_hash text not null unique,student_id uuid not null references public.students on delete cascade,teacher_id uuid not null references public.teachers on delete cascade,auth_user_id uuid not null references auth.users on delete cascade,email text not null,access_version bigint not null,expires_at timestamptz not null default now()+interval '24 hours',used_at timestamptz,created_at timestamptz not null default now());
alter table public.student_invites enable row level security;
revoke all on public.student_invites from anon,authenticated;
grant all on public.student_invites to service_role;
create index student_invites_expiry on public.student_invites(expires_at);
create function public.find_student_auth_user(p_email text) returns uuid language sql security definer set search_path='' as $$select id from auth.users where lower(email)=lower(trim(p_email)) limit 1$$;
create function public.open_student_invite(p_invite_hash text,p_session_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare invite public.student_invites;st public.students;sid uuid;
begin
 select * into invite from public.student_invites where token_hash=p_invite_hash for update;
 if not found or invite.used_at is not null or invite.expires_at<=now() then return null;end if;
 select * into st from public.students where id=invite.student_id for share;
 if not found or not st.active or st.teacher_id<>invite.teacher_id or st.email<>invite.email or st.access_version<>invite.access_version or not exists(select 1 from auth.users where id=invite.auth_user_id and lower(email)=invite.email) then return null;end if;
 update public.student_invites set used_at=now() where id=invite.id;
 insert into public.student_sessions(token_hash,auth_user_id,email) values(p_session_hash,invite.auth_user_id,invite.email) returning id into sid;
 insert into public.student_session_links(session_id,student_id,access_version) values(sid,st.id,st.access_version);
 return jsonb_build_object('id',sid,'student_id',st.id,'teacher_id',st.teacher_id,'slug',st.slug);
end;
$$;
revoke execute on function public.find_student_auth_user(text),public.open_student_invite(text,text) from public,anon,authenticated;
grant execute on function public.find_student_auth_user(text),public.open_student_invite(text,text) to service_role;
commit;
