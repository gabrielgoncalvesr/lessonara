import {ActionForm,SubmitButton} from "@/components/action-form";
import { getTranslator } from "@/lib/i18n/server";
import { localeTag } from "@/lib/i18n/core";
import { Suspense } from "react";
import Link from "next/link";
import PanelLoading from "../loading";
import { requireUser } from "@/lib/supabase/server";
import { resendWelcome, retryPendingEmails } from "./actions";
const labels: Record<string, string> = { pending: "Aguardando envio", sending: "Enviando", sent: "Enviado ao provedor", failed: "Falha no envio", cancelled: "Cancelado" };
async function Emails() {
    const { t, locale } = await getTranslator();
    const { supabase, userId } = await requireUser();
    const [jobs, students] = await Promise.all([
        supabase.from("email_outbox").select("id,teacher_id,student_id,recipient,template,status,attempts,last_error,created_at,sent_at").eq("teacher_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("students").select("id,name,email,active").eq("teacher_id", userId).order("name")
    ]);
    if (jobs.error || students.error)
        throw new Error("Não foi possível carregar os emails.");
    return <main><div className="page-heading"><div><p className="eyebrow">{t("COMUNICA\u00C7\u00C3O COM OS ALUNOS")}</p><h1>{t("Emails")}</h1><p>{t("Convites, boas-vindas e lembretes, com o estado de cada envio.")}</p></div><ActionForm action={retryPendingEmails}><SubmitButton className="btn-ghost">{t("Tentar envios pendentes")}</SubmitButton></ActionForm></div><section className="card"><h2 className="font-semibold">{t("Acesso dos alunos")}</h2><p className="mt-2 text-sm text-muted">{t("O convite abre a \u00E1rea do aluno. Os c\u00F3digos de acesso s\u00E3o solicitados pelo pr\u00F3prio aluno.")}</p><div className="mt-5 divide-y divide-line">{students.data?.map(student => <div key={student.id} className="py-4 flex flex-wrap gap-3 items-center justify-between"><div><Link className="font-medium" href={`/students/${student.id}`}>{student.name}</Link><p className="text-xs text-muted mt-1">{student.email || "Cadastre o email para liberar o acesso."}</p></div>{student.email && student.active ? <ActionForm action={resendWelcome}><input type="hidden" name="studentId" value={student.id}/><SubmitButton className="btn-xs">{t("Enviar boas-vindas")}</SubmitButton></ActionForm> : <Link className="btn-xs" href={`/students/${student.id}`}>{t("Revisar cadastro")}</Link>}</div>)}</div></section><section className="card mt-6"><h2 className="font-semibold">{t("\u00DAltimos envios")}</h2><p className="mt-2 text-xs text-muted">{t("Enviado ao provedor significa que o envio foi aceito; n\u00E3o confirma a chegada \u00E0 caixa de entrada.")}</p><ul className="mt-5 divide-y divide-line">{jobs.data?.map(job => <li key={job.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-sm">{job.template === "welcome" ? t("Boas-vindas") : t("Renova\u00E7\u00E3o do pacote")}{t(" \u00B7 ")}{job.recipient}</p><span className={`text-xs ${job.status === "failed" ? "text-bad" : "text-muted"}`}>{t(labels[job.status])}</span></div><p className="mt-2 text-xs text-muted">{job.attempts}{t(" tentativa(s) \u00B7 ")}{new Date(job.created_at).toLocaleString(localeTag(locale), { timeZone: t("America/Sao_Paulo") })}</p>{job.last_error && <p className="mt-2 text-xs text-bad">{job.last_error}</p>}</li>)}</ul>{!jobs.data?.length && <p className="mt-5 text-sm text-muted">{t("Os emails enviados aos seus alunos aparecem aqui.")}</p>}</section></main>;
}
export default function EmailsPage() { return <Suspense fallback={<PanelLoading />}><Emails /></Suspense>; }
