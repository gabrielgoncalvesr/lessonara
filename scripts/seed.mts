// Dados de teste. Uso: pnpm seed [email-da-professora]
// Recria só os alunos marcados com "[seed]"; não mexe nos demais.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

const SEED = "[seed]";

function check<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error) throw r.error;
  return r.data as NonNullable<T>;
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data do `weekday` (0 = domingo) na semana de `weeksAgo` semanas atrás. */
function weekdayWeeksAgo(weekday: number, weeksAgo: number): string {
  const t = today();
  const current = new Date(`${t}T00:00:00Z`).getUTCDay();
  return addDays(t, (weekday - current) - weeksAgo * 7);
}

async function getTeacher(emailArg?: string) {
  const teachers = check(await supabase.from("teachers").select("id, email, name"));
  if (emailArg) {
    const t = teachers.find((t) => t.email === emailArg);
    if (t) return { teacher: t, password: null };
  } else if (teachers.length === 1) {
    return { teacher: teachers[0], password: null };
  } else if (teachers.length > 1) {
    throw new Error(`Mais de um professor; informe o email: ${teachers.map((t) => t.email).join(", ")}`);
  }

  const email = emailArg ?? "prof@lessonara.test";
  const password = randomBytes(9).toString("base64url");
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const teacher = check(await supabase.from("teachers").select("id, email, name").eq("id", data.user.id).single());
  return { teacher, password };
}

async function main() {
  const { teacher, password } = await getTeacher(process.argv[2]);
  if (!teacher.name) {
    check(await supabase.from("teachers").update({ name: "Prof. Teste" }).eq("id", teacher.id));
  }

  const plans = check(await supabase.from("plans").select("id, lessons, price").eq("teacher_id", teacher.id));
  const plan1x = plans.find((p) => p.lessons === 4);
  const plan2x = plans.find((p) => p.lessons === 8);
  if (!plan1x || !plan2x) throw new Error("Planos padrão (4 e 8 aulas) não encontrados.");

  check(await supabase.from("students").delete().eq("teacher_id", teacher.id).like("notes", `${SEED}%`));

  type SeedStudent = {
    name: string;
    note: string;
    email?: string;
    plan: { id: string; price: number };
    price_override?: number;
    active?: boolean;
    schedules: { weekday: number; time: string; weeksAgo: number; endsWeeksAgo?: number }[];
    packages: { weeksAgo: number; lessons: number; amount?: number }[];
    events: { kind: "falta" | "desmarcada" | "reposicao"; weekday: number; time: string; weeksAgo: number }[];
  };

  const students: SeedStudent[] = [
    {
      name: "Ana Souza",
      note: "2x por semana, saldo folgado, uma falta e uma desmarcada",
      plan: plan2x,
      schedules: [
        { weekday: 1, time: "18:00", weeksAgo: 3 },
        { weekday: 3, time: "18:00", weeksAgo: 3 },
      ],
      packages: [{ weeksAgo: 3, lessons: 8 }, { weeksAgo: 0, lessons: 8 }],
      events: [
        { kind: "falta", weekday: 1, time: "18:00", weeksAgo: 2 },
        { kind: "desmarcada", weekday: 3, time: "18:00", weeksAgo: 1 },
      ],
    },
    {
      name: "Bruno Lima",
      note: "Pacote quase acabando (usa o email da professora pra testar o lembrete)",
      email: teacher.email,
      plan: plan1x,
      schedules: [{ weekday: 4, time: "19:00", weeksAgo: 3 }],
      packages: [{ weeksAgo: 3, lessons: 4 }],
      events: [],
    },
    {
      name: "Carla Mendes",
      note: "Devendo: aulas dadas sem pacote",
      plan: plan1x,
      schedules: [{ weekday: 5, time: "10:00", weeksAgo: 6 }],
      packages: [{ weeksAgo: 6, lessons: 4 }],
      events: [],
    },
    {
      name: "Diego Rocha",
      note: "Valor diferente (R$ 250), desmarcou e fez reposição",
      plan: plan1x,
      price_override: 250,
      schedules: [{ weekday: 2, time: "20:00", weeksAgo: 4 }],
      packages: [{ weeksAgo: 4, lessons: 4, amount: 250 }, { weeksAgo: 0, lessons: 4, amount: 250 }],
      events: [
        { kind: "desmarcada", weekday: 2, time: "20:00", weeksAgo: 2 },
        { kind: "reposicao", weekday: 6, time: "11:00", weeksAgo: 2 },
      ],
    },
    {
      name: "Eva Martins",
      note: "Inativa: parou há 3 semanas, pacote usado inteiro",
      plan: plan1x,
      active: false,
      schedules: [{ weekday: 1, time: "09:00", weeksAgo: 6, endsWeeksAgo: 3 }],
      packages: [{ weeksAgo: 6, lessons: 4 }],
      events: [],
    },
  ];

  for (const s of students) {
    const student = check(
      await supabase
        .from("students")
        .insert({
          teacher_id: teacher.id,
          slug: randomBytes(9).toString("base64url"),
          name: s.name,
          email: s.email ?? null,
          plan_id: s.plan.id,
          price_override: s.price_override ?? null,
          active: s.active ?? true,
          notes: `${SEED} ${s.note}`,
        })
        .select("id, slug")
        .single(),
    );
    check(
      await supabase.from("schedules").insert(
        s.schedules.map((sc) => ({
          student_id: student.id,
          weekday: sc.weekday,
          time: sc.time,
          starts_on: weekdayWeeksAgo(sc.weekday, sc.weeksAgo),
          ends_on: sc.endsWeeksAgo ? weekdayWeeksAgo(sc.weekday, sc.endsWeeksAgo) : null,
        })),
      ),
    );
    check(
      await supabase.from("packages").insert(
        s.packages.map((p) => ({
          student_id: student.id,
          paid_on: addDays(today(), -p.weeksAgo * 7),
          lessons: p.lessons,
          amount: p.amount ?? s.price_override ?? s.plan.price,
        })),
      ),
    );
    if (s.events.length) {
      check(
        await supabase.from("lesson_events").insert(
          s.events.map((e) => ({
            student_id: student.id,
            kind: e.kind,
            date: weekdayWeeksAgo(e.weekday, e.weeksAgo),
            time: e.time,
          })),
        ),
      );
    }
    console.log(`✓ ${s.name.padEnd(14)} /a/${student.slug}`);
  }

  console.log(`\nProfessor: ${teacher.email}`);
  if (password) console.log(`Senha:     ${password}  (usuário criado agora)`);
  else console.log("Senha:     a que você definiu no Supabase");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
