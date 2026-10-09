begin;
create table public.google_calendar_connections(teacher_id uuid primary key references public.teachers on delete cascade,credentials text not null,connected_at timestamptz not null default now(),last_error text);
alter table public.google_calendar_connections enable row level security;
revoke all on public.google_calendar_connections from anon,authenticated;
grant all on public.google_calendar_connections to service_role;
grant select(teacher_id,connected_at,last_error) on public.google_calendar_connections to authenticated;
create policy "own calendar connection status" on public.google_calendar_connections for select to authenticated using(teacher_id=auth.uid());
alter table public.schedules add column meet_url text;
alter table public.appointments add column meet_url text;
alter table public.lesson_events add column meet_url text;
create table public.calendar_jobs(id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete cascade,source_kind text not null check(source_kind in ('schedule','appointment','makeup')),source_id uuid not null,operation text not null check(operation in ('upsert','delete')),version bigint not null default 1,status text not null default 'pending' check(status in ('pending','sending','sent','failed','cancelled')),attempts integer not null default 0,available_at timestamptz not null default now(),lease_id uuid,locked_at timestamptz,last_error text,created_at timestamptz not null default now(),unique(teacher_id,source_kind,source_id));
alter table public.calendar_jobs enable row level security;
revoke all on public.calendar_jobs from anon,authenticated;
grant all on public.calendar_jobs to service_role;
grant select(id,teacher_id,status,attempts,last_error,created_at) on public.calendar_jobs to authenticated;
create policy "own calendar jobs" on public.calendar_jobs for select to authenticated using(teacher_id=auth.uid());
create function public.enqueue_calendar_source(p_teacher uuid,p_kind text,p_id uuid,p_operation text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.google_calendar_connections where teacher_id=p_teacher) then return;end if;
 insert into public.calendar_jobs(teacher_id,source_kind,source_id,operation) values(p_teacher,p_kind,p_id,p_operation) on conflict(teacher_id,source_kind,source_id) do update set operation=excluded.operation,version=calendar_jobs.version+1,status=case when calendar_jobs.status='sending' then 'sending' else 'pending' end,attempts=case when calendar_jobs.status='sending' then calendar_jobs.attempts else 0 end,available_at=now(),lease_id=case when calendar_jobs.status='sending' then calendar_jobs.lease_id else null end,locked_at=case when calendar_jobs.status='sending' then calendar_jobs.locked_at else null end,last_error=null;
end;
$$;
create function public.calendar_source_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare sid uuid;tid uuid;source_id uuid;kind text;item record;
begin
 if tg_table_name='lesson_events' then
  if tg_op<>'DELETE' then sid:=new.student_id;else sid:=old.student_id;end if;
  select teacher_id into tid from public.students where id=sid;
  if tg_op<>'DELETE' and new.kind='reposicao' then
   if tg_op='UPDATE' and new.date=old.date and new.time=old.time and new.note is not distinct from old.note then return null;end if;
   perform public.enqueue_calendar_source(tid,'makeup',new.id,'upsert');
  elsif tg_op='DELETE' and old.kind='reposicao' then perform public.enqueue_calendar_source(tid,'makeup',old.id,'delete');
  else
   if (tg_op='INSERT' and new.kind='falta') or (tg_op='DELETE' and old.kind='falta') then return null;end if;
   for item in select id from public.schedules where student_id=sid loop perform public.enqueue_calendar_source(tid,'schedule',item.id,'upsert');end loop;
   for item in select id from public.appointments where student_id=sid loop perform public.enqueue_calendar_source(tid,'appointment',item.id,'upsert');end loop;
  end if;return null;
 end if;
 if tg_op<>'DELETE' then sid:=new.student_id;source_id:=new.id;else sid:=old.student_id;source_id:=old.id;end if;
 select teacher_id into tid from public.students where id=sid;
 kind:=case when tg_table_name='schedules' then 'schedule' else 'appointment' end;
 if tg_op='UPDATE' then
  if tg_table_name='schedules' then
   if new.starts_on=old.starts_on and new.ends_on is not distinct from old.ends_on and new.weekday is not distinct from old.weekday and new.monthly_day is not distinct from old.monthly_day and new.time=old.time then return null;end if;
  else
   if new.date=old.date and new.time=old.time then return null;end if;
  end if;
 end if;
 perform public.enqueue_calendar_source(tid,kind,source_id,case when tg_op='DELETE' then 'delete' else 'upsert' end);return null;
end;
$$;
create trigger calendar_schedule_changed after insert or update or delete on public.schedules for each row execute function public.calendar_source_changed();
create trigger calendar_appointment_changed after insert or update or delete on public.appointments for each row execute function public.calendar_source_changed();
create trigger calendar_event_changed after insert or update or delete on public.lesson_events for each row execute function public.calendar_source_changed();
create function public.claim_calendar_jobs(p_teacher uuid default null) returns setof public.calendar_jobs language plpgsql security definer set search_path='' as $$
begin
 return query with due as(select id from public.calendar_jobs where (p_teacher is null or teacher_id=p_teacher) and attempts<5 and ((status='pending' and available_at<=now()) or (status='sending' and locked_at<now()-interval '2 minutes')) order by created_at for update skip locked limit 10)
 update public.calendar_jobs j set status='sending',attempts=j.attempts+1,lease_id=gen_random_uuid(),locked_at=now() from due where j.id=due.id returning j.*;
end;
$$;
revoke execute on function public.enqueue_calendar_source(uuid,text,uuid,text),public.calendar_source_changed(),public.claim_calendar_jobs(uuid) from public,anon,authenticated;
grant execute on function public.enqueue_calendar_source(uuid,text,uuid,text),public.claim_calendar_jobs(uuid) to service_role;

create or replace function public.calendar_teacher_context_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid;item record;
begin
 if tg_table_name='students' then tid:=new.teacher_id;
  for item in select id from public.schedules where student_id=new.id loop perform public.enqueue_calendar_source(tid,'schedule',item.id,'upsert');end loop;
  for item in select id from public.appointments where student_id=new.id loop perform public.enqueue_calendar_source(tid,'appointment',item.id,'upsert');end loop;
 else
  if tg_op='DELETE' then tid:=old.teacher_id;else tid:=new.teacher_id;end if;
  for item in select s.id from public.schedules s join public.students st on st.id=s.student_id where st.teacher_id=tid loop perform public.enqueue_calendar_source(tid,'schedule',item.id,'upsert');end loop;
  for item in select id from public.appointments where teacher_id=tid loop perform public.enqueue_calendar_source(tid,'appointment',item.id,'upsert');end loop;
 end if;return null;
end;
$$;
revoke execute on function public.calendar_teacher_context_changed() from public,anon,authenticated;
create trigger calendar_student_context after update of active,email,name on public.students for each row execute function public.calendar_teacher_context_changed();
create trigger calendar_holiday_context after insert or update or delete on public.holidays for each row execute function public.calendar_teacher_context_changed();
create trigger calendar_holiday_rule_context after insert or update of enabled,policy,effective_from on public.holiday_settings for each row execute function public.calendar_teacher_context_changed();

commit;
