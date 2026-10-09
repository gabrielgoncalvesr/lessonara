"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient, requireUser } from "@/lib/supabase/server";
import { processEmails } from "@/lib/mail/outbox";

export async function resendWelcome(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = String(form.get("studentId") ?? "");
  const student = await supabase.from("students").select("id,email,active").eq("id", id).eq("teacher_id", userId).maybeSingle();
  if (student.error || !student.data?.active || !student.data.email) throw new Error("Confira o email do aluno antes de enviar o convite.");
  const db = createAdminClient();
  const rate = await db.rpc("allow_student_auth", { p_keys: [`welcome/${id}`, `welcome/teacher/${userId}`], p_limits: [1, 20], p_seconds: [60, 3600] });
  if (rate.error || !rate.data) throw new Error("Aguarde antes de enviar outro convite.");
  const jobId = randomUUID();
  const { error } = await db.from("email_outbox").insert({ id: jobId, event_key: `welcome/${id}/${jobId}`, teacher_id: userId, student_id: id, recipient: student.data.email, template: "welcome", payload: {} });
  if (error) throw new Error("Não foi possível registrar o convite.");
  await processEmails(jobId);
  revalidatePath("/emails");
}
export async function retryPendingEmails() {
  const { userId } = await requireUser();
  const db = createAdminClient();
  const { data, error } = await db.from("email_outbox").select("id").eq("teacher_id", userId).eq("status", "pending").lte("available_at", new Date().toISOString()).limit(10);
  if (error) throw new Error("Não foi possível consultar os envios pendentes.");
  for (const job of data ?? []) await processEmails(job.id);
  revalidatePath("/emails");
}
