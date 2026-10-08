begin;
create table public.holiday_settings (
 teacher_id uuid primary key references public.teachers on delete cascade,
 enabled boolean not null default false,
 policy text not null default 'consume' check (policy in ('consume','preserve')),
 effective_from date,
 lock_at timestamptz,
 check (not enabled or effective_from is not null)
);
create table public.holidays (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.teachers on delete cascade,
 date date not null,
 name text not null check (length(trim(name)) between 1 and 120),
 unique (teacher_id, date)
);
alter table public.holiday_settings enable row level security;
alter table public.holidays enable row level security;
revoke all on public.holiday_settings, public.holidays from public, anon, authenticated;
grant select on public.holiday_settings to authenticated;
grant select, insert, update, delete on public.holidays to authenticated;
grant all on public.holiday_settings, public.holidays to service_role;
create policy "own holiday settings" on public.holiday_settings for select to authenticated using (teacher_id = auth.uid());
create policy "own holidays" on public.holidays for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- A data prevista de travamento é recalculada enquanto ainda está no futuro.
-- Depois de atingida, fica persistida mesmo se um aluno/horário for removido.
create function public.refresh_holiday_lock(tid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare settings public.holiday_settings; first_lesson timestamptz;
begin
 if tid is null then return; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-holidays:' || tid::text));
 select * into settings from public.holiday_settings where teacher_id = tid for update;
 if not found or (settings.lock_at is not null and settings.lock_at <= now()) then return; end if;
 if settings.enabled then
  select min((h.date + s.time) at time zone 'America/Sao_Paulo') into first_lesson
  from public.holidays h join public.students st on st.teacher_id = h.teacher_id
  join public.schedules s on s.student_id = st.id
  where h.teacher_id = tid and h.date >= settings.effective_from
    and h.date >= s.starts_on and (s.ends_on is null or h.date <= s.ends_on)
    and extract(dow from h.date) = s.weekday
    and not exists (select 1 from public.lesson_events e where e.student_id = st.id
      and e.date = h.date and e.kind <> 'reposicao' and (e.time is null or e.time = s.time));
 end if;
 update public.holiday_settings set lock_at = first_lesson where teacher_id = tid;
end;
$$;
revoke all on function public.refresh_holiday_lock(uuid) from public, anon, authenticated;

create function public.save_holiday_settings(p_enabled boolean, p_policy text) returns void
language plpgsql security definer set search_path = '' as $$
declare tid uuid := auth.uid(); settings public.holiday_settings;
begin
 if tid is null or not exists(select 1 from public.teachers where id = tid) then raise exception 'Não autenticado'; end if;
 if p_enabled is null or p_policy is null or p_policy not in ('consume','preserve') then raise exception 'Regra inválida'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-holidays:' || tid::text));
 perform public.refresh_holiday_lock(tid);
 select * into settings from public.holiday_settings where teacher_id = tid for update;
 if found and settings.lock_at <= now() and (settings.enabled <> p_enabled or settings.policy <> p_policy) then
  raise exception 'A regra está travada: uma aula já foi afetada por um feriado';
 end if;
 insert into public.holiday_settings (teacher_id, enabled, policy, effective_from)
 values (tid, p_enabled, p_policy, case when p_enabled then (now() at time zone 'America/Sao_Paulo')::date + 1 else null end)
 on conflict (teacher_id) do update set enabled = excluded.enabled, policy = excluded.policy,
  effective_from = case when excluded.enabled and not holiday_settings.enabled then excluded.effective_from else holiday_settings.effective_from end;
 perform public.refresh_holiday_lock(tid);
end;
$$;
revoke all on function public.save_holiday_settings(boolean, text) from public, anon;
grant execute on function public.save_holiday_settings(boolean, text) to authenticated;

create function public.guard_holiday_date() returns trigger
language plpgsql set search_path = '' as $$
declare today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 if tg_op <> 'INSERT' and old.date <= today then raise exception 'Feriados de hoje ou anteriores não podem ser alterados'; end if;
 if tg_op <> 'DELETE' and new.date <= today then raise exception 'Cadastre uma data a partir de amanhã'; end if;
 if tg_op = 'DELETE' then return old; end if;
 return new;
end;
$$;
revoke all on function public.guard_holiday_date() from public, anon, authenticated;
create trigger holiday_date_guard before insert or update or delete on public.holidays for each row execute function public.guard_holiday_date();

create function public.holiday_related_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare old_tid uuid; new_tid uuid;
begin
 if tg_table_name in ('holidays','students') then
  if tg_op <> 'INSERT' then old_tid := old.teacher_id; end if;
  if tg_op <> 'DELETE' then new_tid := new.teacher_id; end if;
 else
  if tg_op <> 'INSERT' then select teacher_id into old_tid from public.students where id = old.student_id; end if;
  if tg_op <> 'DELETE' then select teacher_id into new_tid from public.students where id = new.student_id; end if;
 end if;
 perform public.refresh_holiday_lock(old_tid);
 if new_tid is distinct from old_tid then perform public.refresh_holiday_lock(new_tid); end if;
 return null;
end;
$$;
revoke all on function public.holiday_related_change() from public, anon, authenticated;
create trigger holiday_rule_dates after insert or update or delete on public.holidays for each row execute function public.holiday_related_change();
create trigger holiday_rule_schedules after insert or update or delete on public.schedules for each row execute function public.holiday_related_change();
create trigger holiday_rule_events after insert or update or delete on public.lesson_events for each row execute function public.holiday_related_change();
create trigger holiday_rule_students after delete or update on public.students for each row execute function public.holiday_related_change();
commit;
