"use server";

import { requireUser } from "@/lib/supabase/server";
import { loadLedgers, type Student, type Teacher } from "@/lib/data";
import { getOrigin } from "@/lib/origin";
import { sendEmail } from "@/lib/email";
import { paymentMessage, escapeEmailHtml } from "@/lib/payment-rules";

export type ReminderResult = { ok: boolean; message: string } | null;

export async function sendPaymentReminder(studentId: string): Promise<ReminderResult> {
  const { supabase, userId } = await requireUser();
  const [{ data: student, error }, { data: teacher, error: teacherError }] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).eq("teacher_id", userId).maybeSingle<Student>(),
    supabase.from("teachers").select("name, email").eq("id", userId).single<Pick<Teacher, "name" | "email">>(),
  ]);
  if (error || teacherError || !student || !teacher) return { ok: false, message: "Não foi possível consultar os dados do aluno." };
  if (!student.email) return { ok: false, message: "Cadastre um email no perfil do aluno." };
  if (!student.active) return { ok: false, message: "O aluno está inativo." };
  const { ledger } = (await loadLedgers(supabase, [studentId])).get(studentId)!;
  if (ledger.remaining > 2) return { ok: false, message: "O aluno ainda tem mais de 2 aulas no pacote. Atualize a página." };
  const link = `${await getOrigin()}/a/${student.slug}`;
  try {
    await sendEmail({ to: student.email, replyTo: teacher.email, subject: "Vamos renovar seu pacote de aulas?", html: `<p>${escapeEmailHtml(paymentMessage(student.name, ledger.remaining, link))}</p><p><a href="${escapeEmailHtml(link)}">Ver minhas aulas</a></p><p>${escapeEmailHtml(teacher.name || "Sua professora")}</p>` });
    return { ok: true, message: "Email enviado." };
  } catch {
    return { ok: false, message: "Não foi possível enviar. Confira o remetente e a configuração do Resend." };
  }
}
