import type { SupabaseClient } from "@supabase/supabase-js";
import { nowInTZ } from "./dates";
import { computeLedger, type Ledger, type LessonEvent, type Package, type Schedule } from "./ledger";

export type Plan = "1x" | "2x";

export type Student = {
  id: string;
  teacher_id: string;
  slug: string;
  name: string;
  email: string | null;
  plan: Plan;
  price_override: number | null;
  active: boolean;
  notes: string | null;
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
  price_1x: number;
  price_2x: number;
};

export type ScheduleRow = Schedule & { id: string };

export const PLAN_LESSONS: Record<Plan, number> = { "1x": 4, "2x": 8 };

export function studentPrice(student: Student, teacher: Teacher): number {
  return student.price_override ?? (student.plan === "2x" ? teacher.price_2x : teacher.price_1x);
}

const trimTime = (t: string | null) => (t ? t.slice(0, 5) : t);

/** Carrega agenda, pacotes e exceções de vários alunos e calcula o saldo de cada um. */
export type StudentLedger = {
  ledger: Ledger;
  schedules: ScheduleRow[];
  packages: Package[];
  today: string;
};

export async function loadLedgers(supabase: SupabaseClient, studentIds: string[]): Promise<Map<string, StudentLedger>> {
  const result = new Map<string, StudentLedger>();
  if (studentIds.length === 0) return result;
  const [schedules, packages, events] = await Promise.all([
    supabase.from("schedules").select("id, student_id, weekday, time, starts_on, ends_on").in("student_id", studentIds),
    supabase.from("packages").select("id, student_id, paid_on, lessons, amount").in("student_id", studentIds),
    supabase.from("lesson_events").select("id, student_id, date, time, kind, note").in("student_id", studentIds),
  ]);
  for (const r of [schedules, packages, events]) if (r.error) throw r.error;

  const { today, time } = nowInTZ();
  const byStudent = <T extends { student_id: string }>(rows: T[], id: string) => rows.filter((r) => r.student_id === id);

  for (const id of studentIds) {
    const s = byStudent(schedules.data!, id).map((r) => ({ ...r, time: trimTime(r.time)! })) as ScheduleRow[];
    const p = byStudent(packages.data!, id) as Package[];
    const e = byStudent(events.data!, id).map((r) => ({ ...r, time: trimTime(r.time) })) as LessonEvent[];
    result.set(id, { ledger: computeLedger({ schedules: s, events: e, packages: p, today, time }), schedules: s, packages: p, today });
  }
  return result;
}
