begin;
alter table public.teachers add column lesson_minutes integer not null default 60 check(lesson_minutes between 15 and 180 and lesson_minutes%15=0);
alter table public.schedules add column duration_minutes integer not null default 60 check(duration_minutes between 15 and 180 and duration_minutes%15=0);
alter table public.appointments add column duration_minutes integer not null default 60 check(duration_minutes between 15 and 180 and duration_minutes%15=0);
alter table public.lesson_events add column duration_minutes integer not null default 60 check(duration_minutes between 15 and 180 and duration_minutes%15=0);
create function public.snapshot_lesson_duration() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid;
begin
 if tg_op='UPDATE' then if new.duration_minutes<>old.duration_minutes then raise exception 'A duração deste agendamento não pode ser alterada.';end if;return new;end if;
 select teacher_id into tid from public.students where id=new.student_id;
 if auth.uid() is not null and tid is distinct from auth.uid() then raise exception 'Aluno não encontrado nesta conta.';end if;
 select lesson_minutes into new.duration_minutes from public.teachers where id=tid;
 return new;
end;
$$;
revoke execute on function public.snapshot_lesson_duration() from public,anon,authenticated;
create trigger aa_duration_snapshot before insert or update on public.schedules for each row execute function public.snapshot_lesson_duration();
create trigger aa_duration_snapshot before insert or update on public.appointments for each row execute function public.snapshot_lesson_duration();
create trigger aa_duration_snapshot before insert or update on public.lesson_events for each row execute function public.snapshot_lesson_duration();
create or replace function public.ensure_lesson_slot(p_teacher uuid,p_date date,p_time time,p_schedule uuid default null,p_appointment uuid default null,p_event uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare starts timestamp:=p_date+p_time;duration integer;
begin
 select lesson_minutes into duration from public.teachers where id=p_teacher;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-calendar:'||p_teacher::text));
 if exists(select 1 from public.appointments a where a.teacher_id=p_teacher and a.id is distinct from p_appointment and a.date+a.time<starts+make_interval(mins=>coalesce(duration,60)) and a.date+a.time+make_interval(mins=>a.duration_minutes)>starts and not exists(select 1 from public.lesson_events e where e.student_id=a.student_id and e.date=a.date and e.kind='desmarcada' and (e.time is null or e.time=a.time))) then raise exception 'Já existe uma aula nesse horário.';end if;
 if exists(select 1 from public.lesson_events e join public.students st on st.id=e.student_id where st.teacher_id=p_teacher and e.kind='reposicao' and e.id is distinct from p_event and e.date+e.time<starts+make_interval(mins=>coalesce(duration,60)) and e.date+e.time+make_interval(mins=>e.duration_minutes)>starts) then raise exception 'Já existe uma reposição nesse horário.';end if;
 if exists(select 1 from public.schedules s join public.students st on st.id=s.student_id cross join generate_series(p_date-1,p_date+1,interval '1 day') d where st.teacher_id=p_teacher and s.id is distinct from p_schedule and public.schedule_on_day(d::date,s.starts_on,s.ends_on,s.weekday,s.monthly_day) and d::date+s.time<starts+make_interval(mins=>coalesce(duration,60)) and d::date+s.time+make_interval(mins=>s.duration_minutes)>starts and not exists(select 1 from public.lesson_events e where e.student_id=s.student_id and e.date=d::date and e.kind='desmarcada' and (e.time is null or e.time=s.time))) then raise exception 'Já existe uma aula fixa nesse horário.';end if;
end;
$$;
commit;
