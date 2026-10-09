begin;
alter table public.teachers add column profile_completed_at timestamptz;
alter table public.teachers add column platform_plan text not null default 'essential' check(platform_plan in ('essential','professional','studio'));
alter table public.plans add column is_active boolean not null default false;
-- Existing teachers with an established student base retain their configured plans.
update public.plans p set is_active=true where exists(select 1 from public.students s where s.plan_id=p.id and s.teacher_id=p.teacher_id);
update public.teachers t set profile_completed_at=now() where length(trim(t.name))>0 and exists(select 1 from public.plans p where p.teacher_id=t.id and p.is_active);
revoke update on public.teachers from authenticated;
grant update(name,lesson_minutes,profile_completed_at) on public.teachers to authenticated;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'role'='student' then return new;end if;
 insert into public.teachers(id,email,name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',''));
 return new;
end;
$$;
create function public.guard_initial_setup() returns trigger language plpgsql security definer set search_path='' as $$
declare t public.teachers;
begin
 select * into t from public.teachers where id=new.teacher_id;
 if auth.uid() is not null and new.teacher_id is distinct from auth.uid() then raise exception 'Conta não encontrada.';end if;
 if not found or t.profile_completed_at is null or length(trim(t.name))=0 or not exists(select 1 from public.plans p where p.teacher_id=t.id and p.is_active) then raise exception 'Conclua a configuração inicial em Configurações antes de continuar.';end if;
 if tg_table_name='students' then if not exists(select 1 from public.plans p where p.id=new.plan_id and p.teacher_id=t.id and p.is_active) then raise exception 'Escolha um plano ativo para o aluno.';end if;end if;
 return new;
end;
$$;
revoke execute on function public.guard_initial_setup() from public,anon,authenticated;
create trigger initial_setup_guard before insert on public.students for each row execute function public.guard_initial_setup();
create trigger initial_setup_guard before insert on public.documents for each row execute function public.guard_initial_setup();
create trigger initial_setup_guard before insert on public.activities for each row execute function public.guard_initial_setup();
commit;
