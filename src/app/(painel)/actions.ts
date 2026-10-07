"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

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
  return {
    name: str(f, "name") ?? "Sem nome",
    email: str(f, "email"),
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
  redirect(`/alunos/${data!.id}`);
}

export async function updateStudent(id: string, f: FormData) {
  const { supabase } = await requireUser();
  check(await supabase.from("students").update({ ...studentFields(f), active: f.get("active") === "on" }).eq("id", id));
  revalidatePath(`/alunos/${id}`);
}

export async function deleteStudent(id: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("students").delete().eq("id", id));
  redirect("/");
}

export async function regenerateLink(id: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("students").update({ slug: randomBytes(9).toString("base64url") }).eq("id", id));
  revalidatePath(`/alunos/${id}`);
}

export async function addSchedule(studentId: string, f: FormData) {
  const { supabase } = await requireUser();
  check(
    await supabase.from("schedules").insert({
      student_id: studentId,
      weekday: int(f, "weekday"),
      time: str(f, "time"),
      starts_on: str(f, "starts_on"),
    }),
  );
  revalidatePath(`/alunos/${studentId}`);
}

export async function endSchedule(studentId: string, scheduleId: string, f: FormData) {
  const { supabase } = await requireUser();
  check(await supabase.from("schedules").update({ ends_on: str(f, "ends_on") }).eq("id", scheduleId));
  revalidatePath(`/alunos/${studentId}`);
}

export async function deleteSchedule(studentId: string, scheduleId: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("schedules").delete().eq("id", scheduleId));
  revalidatePath(`/alunos/${studentId}`);
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
  revalidatePath(`/alunos/${studentId}`);
}

export async function deletePackage(studentId: string, packageId: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("packages").delete().eq("id", packageId));
  revalidatePath(`/alunos/${studentId}`);
}

/** Marca falta/desmarcada numa aula da agenda fixa. */
export async function markLesson(studentId: string, date: string, time: string, kind: "falta" | "desmarcada") {
  const { supabase } = await requireUser();
  check(await supabase.from("lesson_events").insert({ student_id: studentId, date, time, kind }));
  revalidatePath(`/alunos/${studentId}`);
}

export async function addReposicao(studentId: string, f: FormData) {
  const { supabase } = await requireUser();
  check(
    await supabase.from("lesson_events").insert({
      student_id: studentId,
      date: str(f, "date"),
      time: str(f, "time"),
      kind: "reposicao",
      note: str(f, "note"),
    }),
  );
  revalidatePath(`/alunos/${studentId}`);
}

export async function deleteEvent(studentId: string, eventId: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("lesson_events").delete().eq("id", eventId));
  revalidatePath(`/alunos/${studentId}`);
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
  return { name: str(f, "name") ?? "Plano", lessons: int(f, "lessons") ?? 1, price: int(f, "price") ?? 0 };
}

export async function createPlan(f: FormData) {
  const { supabase, userId } = await requireUser();
  check(await supabase.from("plans").insert({ ...planFields(f), teacher_id: userId }));
  revalidatePath("/config");
}

export async function updatePlan(id: string, f: FormData) {
  const { supabase } = await requireUser();
  check(await supabase.from("plans").update(planFields(f)).eq("id", id));
  revalidatePath("/config");
}

export async function deletePlan(id: string) {
  const { supabase } = await requireUser();
  check(await supabase.from("plans").delete().eq("id", id));
  revalidatePath("/config");
}
