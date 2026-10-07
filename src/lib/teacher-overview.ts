import { getOrigin } from "./origin";
import { loadLedgers, type Student, type Teacher } from "./data";
import { addDays, nowInTZ } from "./dates";
import { calendarRange, type CalendarLesson } from "./calendar";
import { requireUser } from "./supabase/server";

export async function loadTeacherOverview(includeCalendar = false) {
  const { supabase, userId } = await requireUser();
  const [{ data, error }, { data: teacher }] = await Promise.all([
    supabase.from("students").select("*, plans(name)").order("name"),
    supabase.from("teachers").select("name").eq("id", userId).maybeSingle<Pick<Teacher, "name">>(),
  ]);
  if (error) throw error;
  const students = (data ?? []) as (Student & { plans: { name: string } | null })[];
  const ledgers = await loadLedgers(supabase, students.map((student) => student.id));
  const origin = await getOrigin();
  const { today } = nowInTZ();
  const range = calendarRange(today);
  const rows = students.map((student) => {
    const { ledger } = ledgers.get(student.id)!;
    const next = ledger.lessons.find((lesson) => !lesson.past && lesson.counts);
    return { id: student.id, name: student.name, active: student.active, plan: student.plans?.name ?? "Sem plano", remaining: ledger.remaining, credits: ledger.credits, used: ledger.used, link: `${origin}/a/${student.slug}`, next: next ? { date: next.date, time: next.time } : null };
  }).sort((a, b) => Number(b.active) - Number(a.active) || a.remaining - b.remaining);
  const upcoming = students.filter((student) => student.active).flatMap((student) => ledgers.get(student.id)!.ledger.lessons.filter((lesson) => !lesson.past && lesson.counts && lesson.date < addDays(today, 7)).map((lesson) => ({ studentId: student.id, name: student.name, date: lesson.date, time: lesson.time, status: lesson.status }))).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
  const calendarLessons: CalendarLesson[] = includeCalendar ? students.flatMap((student) => ledgers.get(student.id)!.ledger.lessons.filter((lesson) => (student.active || lesson.past) && lesson.date >= range.startDate && lesson.date <= range.endDate).map((lesson, index) => ({ id: `${student.id}-${index}`, date: lesson.date, time: lesson.time, status: lesson.status, name: student.name, href: `/alunos/${student.id}`, note: lesson.event?.note }))) : [];
  return { rows, upcoming, teacherName: teacher?.name ?? "", today, calendarLessons, range };
}
