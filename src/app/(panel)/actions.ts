"use server";

import { after } from "next/server";
import { processEmails } from "@/lib/mail/outbox";
import { normalizeStudentPhone } from "@/lib/phone";
import { validateWeeklyFrequency } from "@/lib/frequency";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { halfHourTime } from "@/lib/calendar";
import { canAddWeeklySchedule, weeklyScheduleLimit } from "@/lib/schedule-rules";
import type { Schedule } from "@/lib/ledger";

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === null ? null : Math.round(Number(v.replace(",", ".")));
};

function check<T extends { error: unknown }>(r: T): T {
  if (r.error) throw r.error;
  return r;
}

function studentFields(f: FormData) {
  const email = str(f, "email")?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Informe um email válido para o aluno.");
  const phone = str(f, "phone");
  const contact = normalizeStudentPhone(phone ?? "", str(f, "phone_country") ?? "BR");
  const weekly_lessons = validateWeeklyFrequency(String(f.get("weekly_lessons") ?? ""));
  return {
    ...contact,
    weekly_lessons,
    name: str(f, "name") ?? "Sem nome",
    email,
    plan_id: str(f, "plan_id"),
    price_override: int(f, "price_override"),
    notes: str(f, "notes"),
  };
}

export async function createStudent(f: FormData) {
  const { supabase, userId } = await requireUser();
  const { data } = check(
    await supabase
      .from("students")
      .insert({ ...studentFields(f), teacher_id: userId, slug: randomBytes(9).toString("base64url") })
      .select("id")
      .single(),
  );
  after(async () => { try { await processEmails(); } catch { console.error("email_queue_processing_failed"); } });
  redirect(`/students/${data!.id}`);
}

export async function updateStudent(id: string, f: FormData) {
  const { supabase } = await requireUser();
  check(await supabase.from("students").update({ ...studentFields(f), active: f.get("active") === "on" }).eq("id", id));
  after(async () => { try { await processEmails(); } catch { console.error("email_queue_processing_failed"); } });
  revalidatePath(`/students/${id}`);
  revalidatePath("/", "layout");
}

export async function deleteStudent(id: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("students").delete().eq("id", id));
  redirect("/students");
}

export async function regenerateLink(id: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("students").update({ slug: randomBytes(9).toString("base64url") }).eq("id", id));
  revalidatePath(`/students/${id}`);
  revalidatePath("/", "layout");
}

export async function addSchedule(studentId: string, f: FormData) {
  const { supabase, userId } = await requireUser();
  const { data: student } = check(await supabase.from("students").select("plan_id,weekly_lessons").eq("id", studentId).eq("teacher_id", userId).maybeSingle());
  if (!student) throw new Error("Aluno não encontrado.");
  const [planResult, scheduleResult] = await Promise.all([
    student.plan_id ? supabase.from("plans").select("weekly_lessons").eq("id", student.plan_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("schedules").select("weekday, time, starts_on, ends_on").eq("student_id", studentId),
  ]);
  const plan = check(planResult).data;
  const schedules = check(scheduleResult).data as Schedule[];
  const startsOn = str(f, "starts_on");
  const day = int(f, "weekday");
  if (!startsOn || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || day === null || day < 0 || day > 6) throw new Error("Confira o dia e a data do horário.");
  const limit = weeklyScheduleLimit(student.weekly_lessons, plan?.weekly_lessons);
  if (!canAddWeeklySchedule(schedules, limit, startsOn, day)) throw new Error("A frequência semanal já tem todos os horários. Encerre um horário antes de adicionar outro.");
  check(await supabase.from("schedules").insert({ student_id: studentId, weekday: day, time: halfHourTime(str(f, "time")), starts_on: startsOn }));
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

export async function endSchedule(studentId: string, scheduleId: string, f: FormData) {
  const { supabase } = await requireUser();
  check(await supabase.from("schedules").update({ ends_on: str(f, "ends_on") }).eq("id", scheduleId));
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

export async function deleteSchedule(studentId: string, scheduleId: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("schedules").delete().eq("id", scheduleId));
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

export async function addPackage(studentId: string, f: FormData) {
  const { supabase } = await requireUser();
  check(
    await supabase.from("packages").insert({
      student_id: studentId,
      paid_on: str(f, "paid_on"),
      lessons: int(f, "lessons"),
      amount: int(f, "amount"),
      notes: str(f, "notes"),
    }),
  );
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

export async function deletePackage(studentId: string, packageId: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("packages").delete().eq("id", packageId));
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

/** Marca falta/desmarcada numa aula da agenda fixa. */
export async function markLesson(studentId: string, date: string, time: string, kind: "falta" | "desmarcada") {
  const { supabase } = await requireUser();
  check(await supabase.from("lesson_events").insert({ student_id: studentId, date, time, kind }));
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

export async function addReposicao(studentId: string, f: FormData) {
  const { supabase } = await requireUser();
  check(
    await supabase.from("lesson_events").insert({
      student_id: studentId,
      date: str(f, "date"),
      time: halfHourTime(str(f, "time")),
      kind: "reposicao",
      note: str(f, "note"),
    }),
  );
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

export async function deleteEvent(studentId: string, eventId: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("lesson_events").delete().eq("id", eventId));
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/", "layout");
}

export async function updateTeacher(f: FormData) {
  const { supabase, userId } = await requireUser();
  check(
    await supabase
      .from("teachers")
      .update({ name: str(f, "name") ?? "" })
      .eq("id", userId),
  );
  revalidatePath("/", "layout");
}

function planFields(f: FormData) {
  return { name: str(f, "name") ?? "Plano", lessons: int(f, "lessons") ?? 1, price: int(f, "price") ?? 0, weekly_lessons: validateWeeklyFrequency(String(f.get("weekly_lessons") ?? "")) };
}

export async function createPlan(f: FormData) {
  const { supabase, userId } = await requireUser();
  check(await supabase.from("plans").insert({ ...planFields(f), teacher_id: userId }));
  revalidatePath("/settings");
}

export async function updatePlan(id: string, f: FormData) {
  const { supabase } = await requireUser();
  check(await supabase.from("plans").update(planFields(f)).eq("id", id));
  revalidatePath("/settings");
}

export async function deletePlan(id: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("plans").delete().eq("id", id));
  revalidatePath("/settings");
}
