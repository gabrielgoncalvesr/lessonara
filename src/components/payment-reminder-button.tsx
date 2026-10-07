"use client";

import { useActionState } from "react";
import { sendPaymentReminder } from "@/app/(painel)/pagamentos/actions";

export function PaymentReminderButton({ studentId, hasEmail }: { studentId: string; hasEmail: boolean }) {
  const [state, action, pending] = useActionState(sendPaymentReminder.bind(null, studentId), null);
  return <form action={action} className="payment-email"><button type="submit" className="btn-xs" disabled={!hasEmail || pending || state?.ok} title={!hasEmail ? "Cadastre um email no perfil do aluno" : undefined}>{pending ? "Enviando…" : state?.ok ? "Enviado" : "Enviar email"}</button>{state && <p role="status" className={`mt-1 text-[10px] ${state.ok ? "text-ok" : "text-bad"}`}>{state.message}</p>}</form>;
}
