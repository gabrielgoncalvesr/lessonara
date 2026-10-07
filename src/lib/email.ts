import { Resend } from "resend";

export async function sendEmail(input: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada.");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Lessonara <onboarding@resend.dev>",
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  });
  if (error) throw new Error(`Resend ${error.name}: ${error.message}`);
  if (!data?.id) throw new Error("Resend não confirmou o envio do email.");
  return data;
}
