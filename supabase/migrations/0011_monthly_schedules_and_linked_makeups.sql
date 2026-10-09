begin;
alter table public.plans add column frequency_period text not null default 'week' check(frequency_period in ('week','month'));
alter table public.plans add column frequency_count integer not null default 1;
alter table public.plans add column scheduling_mode text not null default 'recurring' check(scheduling_mode in ('recurring','flexible'));
update public.plans set frequency_count=weekly_lessons;
alter table public.plans add constraint plan_frequency_valid check(frequency_count between 1 and case when frequency_period='week' then 7 else 31 end and (frequency_period='month' or scheduling_mode='recurring'));
comment on column public.students.weekly_lessons is 'Legado preservado; novos agendamentos usam exclusivamente a frequência do plano.';
alter table public.schedules alter column weekday drop not null;
alter table public.schedules add column monthly_day smallint check(monthly_day between 1 and 31);
alter table public.schedules add constraint schedule_cadence check((weekday is not null and monthly_day is null) or (weekday is null and monthly_day is not null));
create table public.appointments(id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete cascade,student_id uuid not null references public.students on delete cascade,date date not null,time time not null,created_at timestamptz not null default now(),unique(student_id,date));
create index appointments_teacher_date on public.appointments(teacher_id,date);
alter table public.appointments enable row level security;
revoke all on public.appointments from anon;
grant select,insert,update,delete on public.appointments to authenticated,service_role;
create policy "own appointments" on public.appointments for all to authenticated using(teacher_id=auth.uid()) with check(teacher_id=auth.uid() and exists(select 1 from public.students where id=student_id and teacher_id=auth.uid()));
alter table public.lesson_events add column source_event_id uuid references public.lesson_events(id) on delete restrict;
create unique index makeup_one_per_cancelled on public.lesson_events(source_event_id) where source_event_id is not null;
alter table public.lesson_events add constraint makeup_source_kind check(source_event_id is null or kind='reposicao');
create function public.schedule_on_day(p_date date,p_starts date,p_ends date,p_weekday integer,p_monthday integer) returns boolean language sql immutable set search_path='' as $$select p_date>=p_starts and (p_ends is null or p_date<=p_ends) and case when p_monthday is not null then extract(day from p_date)=p_monthday else extract(dow from p_date)=p_weekday end$$;
create function public.first_schedule_occurrence(p_start date,p_weekday integer,p_monthday integer) returns date language plpgsql immutable set search_path='' as $$
declare month_start date;candidate date;last_day integer;
begin
 if p_monthday is null then return p_start+((p_weekday-extract(dow from p_start)::integer+7)%7);end if;
 month_start:=date_trunc('month',p_start)::date;
 loop
  last_day:=extract(day from month_start+interval '1 month'-interval '1 day');
  if p_monthday<=last_day then candidate:=month_start+p_monthday-1;if candidate>=p_start then return candidate;end if;end if;
  month_start:=(month_start+interval '1 month')::date;
 end loop;
end;
$$;
-- Duration is one hour. A per-teacher lock prevents concurrent double bookings.
create function public.ensure_lesson_slot(p_teacher uuid,p_date date,p_time time,p_schedule uuid default null,p_appointment uuid default null,p_event uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare starts timestamp:=p_date+p_time;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-calendar:'||p_teacher::text));
 if exists(select 1 from public.appointments a where a.teacher_id=p_teacher and a.id is distinct from p_appointment and a.date+a.time<starts+interval '1 hour' and a.date+a.time+interval '1 hour'>starts and not exists(select 1 from public.lesson_events e where e.student_id=a.student_id and e.date=a.date and e.kind='desmarcada' and (e.time is null or e.time=a.time))) then raise exception 'Já existe uma aula nesse horário.';end if;
 if exists(select 1 from public.lesson_events e join public.students st on st.id=e.student_id where st.teacher_id=p_teacher and e.kind='reposicao' and e.id is distinct from p_event and e.date+e.time<starts+interval '1 hour' and e.date+e.time+interval '1 hour'>starts) then raise exception 'Já existe uma reposição nesse horário.';end if;
 if exists(select 1 from public.schedules s join public.students st on st.id=s.student_id cross join generate_series(p_date-1,p_date+1,interval '1 day') d where st.teacher_id=p_teacher and s.id is distinct from p_schedule and public.schedule_on_day(d::date,s.starts_on,s.ends_on,s.weekday,s.monthly_day) and d::date+s.time<starts+interval '1 hour' and d::date+s.time+interval '1 hour'>starts and not exists(select 1 from public.lesson_events e where e.student_id=s.student_id and e.date=d::date and e.kind='desmarcada' and (e.time is null or e.time=s.time))) then raise exception 'Já existe uma aula fixa nesse horário.';end if;
end;
$$;
create or replace function public.enforce_weekly_frequency() returns trigger language plpgsql security definer set search_path='' as $$
declare st public.students;p public.plans;first_day date;boundary date;used integer;d date;
begin
 select * into st from public.students where id=new.student_id;
 if auth.uid() is not null and st.teacher_id is distinct from auth.uid() then raise exception 'Aluno não encontrado nesta conta.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-calendar:'||st.teacher_id::text));
 select * into st from public.students where id=new.student_id for update;
 if tg_op='UPDATE' and new.student_id<>old.student_id then raise exception 'Não é permitido mover um horário entre alunos.';end if;
 if tg_op='UPDATE' and new.student_id=old.student_id and new.weekday is not distinct from old.weekday and new.monthly_day is not distinct from old.monthly_day and new.starts_on=old.starts_on and new.time=old.time and new.ends_on is not distinct from old.ends_on then return new;end if;
 if tg_op='UPDATE' and new.weekday is not distinct from old.weekday and new.monthly_day is not distinct from old.monthly_day and new.starts_on=old.starts_on and new.time=old.time and new.ends_on is not null and (old.ends_on is null or new.ends_on<=old.ends_on) then return new;end if;
 select * into p from public.plans where id=st.plan_id and teacher_id=st.teacher_id;
 if not found or p.scheduling_mode<>'recurring' then raise exception 'Escolha um plano com datas fixas.';end if;
 if (p.frequency_period='week')<>(new.monthly_day is null) then raise exception 'O horário deve seguir a frequência do plano.';end if;
 first_day:=public.first_schedule_occurrence(new.starts_on,new.weekday,new.monthly_day);
 if new.ends_on is not null and new.ends_on<first_day then return new;end if;
 for boundary in select first_day union select public.first_schedule_occurrence(s.starts_on,s.weekday,s.monthly_day) from public.schedules s where s.student_id=new.student_id and s.id<>new.id and s.starts_on>first_day and (new.ends_on is null or s.starts_on<=new.ends_on)
 loop
  select count(*) into used from public.schedules s where s.student_id=new.student_id and s.id<>new.id and public.first_schedule_occurrence(s.starts_on,s.weekday,s.monthly_day)<=boundary and (s.ends_on is null or s.ends_on>=boundary);
  if used>=p.frequency_count then raise exception 'Todos os horários do plano já estão configurados.';end if;
 end loop;
 for d in select x::date from generate_series(first_day,least(coalesce(new.ends_on,first_day+730),first_day+730),interval '1 day') x where public.schedule_on_day(x::date,new.starts_on,new.ends_on,new.weekday,new.monthly_day)
 loop
  perform public.ensure_lesson_slot(st.teacher_id,d,new.time,new.id,null);
  if exists(select 1 from public.schedules s where s.student_id=new.student_id and s.id<>new.id and public.schedule_on_day(d,s.starts_on,s.ends_on,s.weekday,s.monthly_day)) then raise exception 'O aluno já tem uma aula nesse dia.';end if;
 end loop;
 return new;
end;
$$;
create function public.guard_appointment() returns trigger language plpgsql security definer set search_path='' as $$
declare st public.students;p public.plans;used integer;max_count integer;
begin
 if tg_op='UPDATE' and new.student_id=old.student_id and new.teacher_id=old.teacher_id and new.date=old.date and new.time=old.time then return new;end if;
 select * into st from public.students where id=new.student_id;
 if auth.uid() is not null and st.teacher_id is distinct from auth.uid() then raise exception 'Aluno não encontrado nesta conta.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-calendar:'||st.teacher_id::text));
 select * into st from public.students where id=new.student_id for update;
 if st.teacher_id<>new.teacher_id then raise exception 'Aluno não pertence a esta conta.';end if;
 select * into p from public.plans where id=st.plan_id and teacher_id=st.teacher_id;
 if not found or p.frequency_period<>'month' or p.scheduling_mode<>'flexible' then raise exception 'Escolha um plano mensal com datas avulsas.';end if;
 max_count:=least(p.frequency_count,extract(day from date_trunc('month',new.date)+interval '1 month'-interval '1 day')::integer);
 select count(*) into used from public.appointments a where a.student_id=new.student_id and a.id<>new.id and date_trunc('month',a.date)=date_trunc('month',new.date) and not exists(select 1 from public.lesson_events e where e.student_id=a.student_id and e.date=a.date and e.kind='desmarcada' and (e.time is null or e.time=a.time));
 if used>=max_count then raise exception 'A quantidade de aulas deste mês já foi agendada.';end if;
 perform public.ensure_lesson_slot(new.teacher_id,new.date,new.time,null,new.id);
 return new;
end;
$$;
create trigger appointment_guard before insert or update on public.appointments for each row execute function public.guard_appointment();
create function public.guard_makeup() returns trigger language plpgsql security definer set search_path='' as $$
declare original public.lesson_events;tid uuid;
begin
 if new.kind<>'reposicao' then return new;end if;
 if tg_op='UPDATE' and new.source_event_id is not distinct from old.source_event_id and new.date=old.date and new.time=old.time then return new;end if;
 select teacher_id into tid from public.students where id=new.student_id;
 if auth.uid() is not null and tid is distinct from auth.uid() then raise exception 'Aluno não encontrado nesta conta.';end if;
 if new.time is null then raise exception 'Informe a hora da reposição.';end if;
 if new.source_event_id is null then raise exception 'Selecione uma aula desmarcada para repor.';end if;
 select * into original from public.lesson_events where id=new.source_event_id for update;
 if not found or original.kind<>'desmarcada' or original.student_id<>new.student_id then raise exception 'A reposição precisa pertencer à aula desmarcada deste aluno.';end if;
 select teacher_id into tid from public.students where id=new.student_id;
 if exists(select 1 from public.lesson_events e where e.student_id=new.student_id and e.kind='reposicao' and e.id<>new.id and e.date=new.date) or exists(select 1 from public.appointments a where a.student_id=new.student_id and a.date=new.date and not exists(select 1 from public.lesson_events e where e.student_id=a.student_id and e.date=a.date and e.kind='desmarcada' and (e.time is null or e.time=a.time))) or exists(select 1 from public.schedules s where s.student_id=new.student_id and public.schedule_on_day(new.date,s.starts_on,s.ends_on,s.weekday,s.monthly_day) and not exists(select 1 from public.lesson_events e where e.student_id=s.student_id and e.date=new.date and e.kind='desmarcada' and (e.time is null or e.time=s.time))) then raise exception 'Este aluno já tem aula nesse dia.';end if;
 perform public.ensure_lesson_slot(tid,new.date,new.time,null,null,new.id);
 return new;
end;
$$;
create trigger makeup_guard before insert or update on public.lesson_events for each row execute function public.guard_makeup();
create function public.guard_lesson_origin() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid;
begin
 select teacher_id into tid from public.students where id=new.student_id;
 if auth.uid() is not null and tid is distinct from auth.uid() then raise exception 'Aluno não encontrado nesta conta.';end if;
 if new.kind='reposicao' then return new;end if;
 if new.time is null or (not exists(select 1 from public.schedules where student_id=new.student_id and public.schedule_on_day(new.date,starts_on,ends_on,weekday,monthly_day) and time=new.time) and not exists(select 1 from public.appointments where student_id=new.student_id and date=new.date and time=new.time)) then raise exception 'A aula não consta na agenda deste aluno.';end if;
 return new;
end;
$$;
revoke execute on function public.guard_lesson_origin() from public,anon,authenticated;
create trigger lesson_origin_guard before insert on public.lesson_events for each row execute function public.guard_lesson_origin();
create function public.guard_student_plan() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.plans;
begin
 if auth.uid() is not null and new.teacher_id is distinct from auth.uid() then raise exception 'Aluno não encontrado nesta conta.';end if;
 if new.plan_id is null then return new;end if;
 select * into p from public.plans where id=new.plan_id and teacher_id=new.teacher_id;
 if not found then raise exception 'O plano não pertence a esta conta.';end if;
 if tg_op='UPDATE' and new.plan_id is distinct from old.plan_id and exists(select 1 from public.schedules where student_id=new.id and (ends_on is null or ends_on>=(now() at time zone 'America/Sao_Paulo')::date) and (p.scheduling_mode='flexible' or (monthly_day is null)<>(p.frequency_period='week'))) then raise exception 'Encerre os horários antigos antes de trocar a frequência do plano.';end if;
 return new;
end;
$$;
create trigger student_plan_guard before insert or update of plan_id on public.students for each row execute function public.guard_student_plan();
create function public.guard_plan_cadence_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.frequency_period is not distinct from old.frequency_period and new.scheduling_mode is not distinct from old.scheduling_mode then return new;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-calendar:'||new.teacher_id::text));
 if exists(select 1 from public.schedules s join public.students st on st.id=s.student_id where st.plan_id=new.id and (s.ends_on is null or s.ends_on>=(now() at time zone 'America/Sao_Paulo')::date) and (new.scheduling_mode='flexible' or (s.monthly_day is null)<>(new.frequency_period='week'))) then raise exception 'Encerre os horários antigos ou crie outro plano antes de trocar a frequência.';end if;
 if new.scheduling_mode<>'flexible' and exists(select 1 from public.appointments a join public.students st on st.id=a.student_id where st.plan_id=new.id and a.date>=(now() at time zone 'America/Sao_Paulo')::date) then raise exception 'Este plano ainda tem aulas avulsas agendadas.';end if;
 return new;
end;
$$;
revoke execute on function public.guard_plan_cadence_change() from public,anon,authenticated;
create trigger plan_cadence_guard before update of frequency_period,scheduling_mode on public.plans for each row execute function public.guard_plan_cadence_change();
create or replace function public.refresh_holiday_lock(tid uuid) returns void language plpgsql security definer set search_path='' as $$
declare settings public.holiday_settings;first_lesson timestamptz;
begin
 if tid is null then return;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lessonara-holidays:'||tid::text));
 select * into settings from public.holiday_settings where teacher_id=tid for update;
 if not found or (settings.lock_at is not null and settings.lock_at<=now()) then return;end if;
 if settings.enabled then
  select min((h.date+occ.time) at time zone 'America/Sao_Paulo') into first_lesson from public.holidays h cross join lateral(
   select s.student_id,s.time from public.schedules s join public.students st on st.id=s.student_id where st.teacher_id=tid and public.schedule_on_day(h.date,s.starts_on,s.ends_on,s.weekday,s.monthly_day)
   union all select a.student_id,a.time from public.appointments a where a.teacher_id=tid and a.date=h.date
  )occ where h.teacher_id=tid and h.date>=settings.effective_from and not exists(select 1 from public.lesson_events e where e.student_id=occ.student_id and e.date=h.date and e.kind<>'reposicao' and (e.time is null or e.time=occ.time));
 end if;
 update public.holiday_settings set lock_at=first_lesson where teacher_id=tid and lock_at is distinct from first_lesson;
end;
$$;
create trigger holiday_rule_appointments after insert or update or delete on public.appointments for each row execute function public.holiday_related_change();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'role'='student' then return new;end if;
 insert into public.teachers(id,email,name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',''));
 insert into public.plans(teacher_id,name,lessons,price,weekly_lessons,frequency_period,frequency_count,scheduling_mode) values(new.id,'1 aula por semana',4,300,1,'week',1,'recurring'),(new.id,'2 aulas por semana',8,500,2,'week',2,'recurring');return new;
end;
$$;
revoke execute on function public.schedule_on_day(date,date,date,integer,integer),public.first_schedule_occurrence(date,integer,integer),public.ensure_lesson_slot(uuid,date,time,uuid,uuid,uuid),public.guard_appointment(),public.guard_makeup(),public.guard_student_plan() from public,anon,authenticated;
commit;
