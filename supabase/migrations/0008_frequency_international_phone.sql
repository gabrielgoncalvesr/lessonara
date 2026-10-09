begin;
-- Frequência é configuração própria, não uma divisão do tamanho do pacote.
alter table public.plans add column weekly_lessons integer not null default 1 check(weekly_lessons between 1 and 7);
-- Migra uma única vez a regra antiga para manter o padrão dos planos existentes.
update public.plans set weekly_lessons=least(7,greatest(1,lessons/4));
alter table public.students add column weekly_lessons integer check(weekly_lessons between 1 and 7);
alter table public.students add column phone_country text check(phone_country is null or phone_country ~ '^[A-Z]{2}$');
comment on column public.students.weekly_lessons is 'Override explícito; null herda a frequência do plano, sem consultar pagamentos.';
comment on column public.students.phone is 'Novas gravações usam E.164 com + e DDI; legado é normalizado ao editar.';

-- Mantém o padrão dos novos professores e a separação de identidade estudantil.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'role'='student' then return new; end if;
 insert into public.teachers(id,email,name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',''));
 insert into public.plans(teacher_id,name,lessons,price,weekly_lessons)
 values(new.id,'1x por semana',4,300,1),(new.id,'2x por semana',8,500,2);
 return new;
end;
$$;
revoke execute on function public.handle_new_user() from public,anon,authenticated;

-- Serializa alterações por aluno: dois cadastros simultâneos não excedem a frequência.
create function public.enforce_weekly_frequency() returns trigger
language plpgsql security definer set search_path='' as $$
declare freq integer; first_day date; last_day date; boundary date; used integer;
begin
 if tg_op='UPDATE' and new.student_id<>old.student_id then raise exception 'Não é permitido mover um horário entre alunos.'; end if;
 select coalesce(s.weekly_lessons,p.weekly_lessons,1) into freq
 from public.students s left join public.plans p on p.id=s.plan_id where s.id=new.student_id for update of s;
 first_day:=new.starts_on+((new.weekday-extract(dow from new.starts_on)::integer+7)%7);
 last_day:=case when new.ends_on is null then null else new.ends_on-((extract(dow from new.ends_on)::integer-new.weekday+7)%7) end;
 -- Encerrar um horário (mesmo no passado) nunca cria aulas extras.
 if tg_op='UPDATE' and new.weekday=old.weekday and new.starts_on=old.starts_on and new.time=old.time
 and new.ends_on is not null and (old.ends_on is null or new.ends_on<=old.ends_on) then return new; end if;
 if last_day is not null and last_day<first_day then return new; end if;
 for boundary in
  with ranges as (
   select starts_on+((weekday-extract(dow from starts_on)::integer+7)%7) starts,
    case when ends_on is null then null else ends_on-((extract(dow from ends_on)::integer-weekday+7)%7) end ends
   from public.schedules where student_id=new.student_id and id<>new.id
  ) select first_day union select starts from ranges where starts>first_day and (last_day is null or starts<=last_day)
 loop
  select count(*) into used from public.schedules s where s.student_id=new.student_id and s.id<>new.id
  and s.starts_on+((s.weekday-extract(dow from s.starts_on)::integer+7)%7)<=boundary
  and (s.ends_on is null or s.ends_on-((extract(dow from s.ends_on)::integer-s.weekday+7)%7)>=boundary);
  if used>=freq then raise exception 'A frequência semanal já tem todos os horários permitidos.'; end if;
 end loop;
 return new;
end;
$$;
revoke execute on function public.enforce_weekly_frequency() from public,anon,authenticated;
create trigger check_weekly_frequency before insert or update on public.schedules for each row execute function public.enforce_weekly_frequency();
commit;
