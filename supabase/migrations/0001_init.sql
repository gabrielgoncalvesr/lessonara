-- Professores: 1 linha por usuário do Supabase Auth (criada pelo trigger abaixo).
create table public.teachers (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text not null,
  price_1x integer not null default 300,
  price_2x integer not null default 500,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers on delete cascade,
  slug text not null unique,
  name text not null,
  email text,
  plan text not null default '1x' check (plan in ('1x', '2x')),
  price_override integer,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.students (teacher_id);

-- Horário fixo semanal. Mudou de dia? Encerra o atual (ends_on) e cria outro.
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  time time not null,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now()
);
create index on public.schedules (student_id);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  paid_on date not null,
  lessons integer not null check (lessons > 0),
  amount integer not null,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.packages (student_id);

-- Exceções da agenda fixa:
--   falta      = aviso em cima da hora, consome aula
--   desmarcada = aviso com antecedência, não consome
--   reposicao  = aula extra, consome
create table public.lesson_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  date date not null,
  time time,
  kind text not null check (kind in ('falta', 'desmarcada', 'reposicao')),
  note text,
  created_at timestamptz not null default now()
);
create index on public.lesson_events (student_id);

-- Um lembrete por aluno para cada total de aulas pagas (novo pacote libera novo lembrete).
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  credits integer not null,
  sent_at timestamptz not null default now(),
  unique (student_id, credits)
);

-- RLS: professor só enxerga os próprios dados. Página do aluno e cron usam service role.
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.schedules enable row level security;
alter table public.packages enable row level security;
alter table public.lesson_events enable row level security;
alter table public.reminders enable row level security;

create policy "own teacher" on public.teachers
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own students" on public.students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create function public.owns_student(sid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.students where id = sid and teacher_id = auth.uid())
$$;

create policy "own schedules" on public.schedules
  for all using (public.owns_student(student_id)) with check (public.owns_student(student_id));
create policy "own packages" on public.packages
  for all using (public.owns_student(student_id)) with check (public.owns_student(student_id));
create policy "own events" on public.lesson_events
  for all using (public.owns_student(student_id)) with check (public.owns_student(student_id));
create policy "own reminders" on public.reminders
  for select using (public.owns_student(student_id));

create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.teachers (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
