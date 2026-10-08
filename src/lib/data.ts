import { loadHolidayRules } from "./holiday-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nowInTZ } from "./dates";
import { computeLedger, type Ledger, type LessonEvent, type Package, type Schedule } from "./ledger";

export type Student = {
  id: string;
  teacher_id: string;
  slug: string;
  name: string;
  email: string | null;
  phone?: string | null;
  plan_id: string | null;
  price_override: number | null;
  active: boolean;
  notes: string | null;
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
};

export type Plan = {
  id: string;
  name: string;
  lessons: number;
  price: number;
};

export type ScheduleRow = Schedule & { id: string };

export function studentPrice(student: Student, plan: Plan | undefined): number | undefined {
  return student.price_override ?? plan?.price;
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
  const [students, schedules, packages, events] = await Promise.all([
    supabase.from("students").select("id, teacher_id").in("id", studentIds),
    supabase.from("schedules").select("id, student_id, weekday, time, starts_on, ends_on").in("student_id", studentIds),
    supabase.from("packages").select("id, student_id, paid_on, lessons, amount, created_at").in("student_id", studentIds),
    supabase.from("lesson_events").select("id, student_id, date, time, kind, note").in("student_id", studentIds),
  ]);
  for (const r of [schedules, packages, events, students]) if (r.error) throw r.error;

  const rules = await loadHolidayRules(supabase, [...new Set((students.data ?? []).map(student => student.teacher_id))]);
  const { today, time } = nowInTZ();
  const byStudent = <T extends { student_id: string }>(rows: T[], id: string) => rows.filter((r) => r.student_id === id);

  for (const id of studentIds) {
    const s = byStudent(schedules.data!, id).map((r) => ({ ...r, time: trimTime(r.time)! })) as ScheduleRow[];
    const p = byStudent(packages.data!, id) as Package[];
    const e = byStudent(events.data!, id).map((r) => ({ ...r, time: trimTime(r.time) })) as LessonEvent[];
    const teacherId = students.data?.find(student => student.id === id)?.teacher_id;
    const settings = rules.settings.find(rule => rule.teacher_id === teacherId);
    const holidays = settings?.enabled ? rules.holidays.filter(holiday => holiday.teacher_id === teacherId && holiday.date >= settings.effective_from!) : [];
    result.set(id, { ledger: computeLedger({ schedules: s, events: e, packages: p, holidays, holidayPolicy: settings?.policy, today, time }), schedules: s, packages: p, today });
  }
  return result;
}
