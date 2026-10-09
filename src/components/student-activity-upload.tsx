"use client";
import {BusyContent} from "@/components/busy-content";
import { useI18n } from "@/components/browser-preferences-provider";
import { useState, useTransition, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { DOCUMENT_ACCEPT, validateDocumentFile } from "@/lib/document-rules";
import { ACTIVITY_BUCKET } from "@/lib/activities";
import { beginActivitySubmission, cancelActivitySubmission, finishActivitySubmission } from "@/app/student/actions";
export function StudentActivityUpload({ slug, activityId, incomplete }: {
    slug: string;
    activityId: string;
    incomplete: boolean;
}) {
    const { t } = useI18n();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");
    function send(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const file = data.get("file");
        if (!(file instanceof File))
            return;
        try {
            validateDocumentFile(file.name, file.size);
        }
        catch (error) {
            setMessage((error as Error).message);
            return;
        }
        setMessage("");
        startTransition(async () => {
            let prepared = false;
            try {
                const result = await beginActivitySubmission(slug, activityId, { fileName: file.name, byteSize: file.size });
                if (!result.ok)
                    throw new Error(result.message);
                prepared = true;
                const client = createBrowserSupabase();
                const uploaded = await client.storage.from(ACTIVITY_BUCKET).uploadToSignedUrl(result.data.path, result.data.token, file, { contentType: result.data.mimeType });
                if (uploaded.error)
                    throw new Error("O envio falhou. Confira sua conexão e tente novamente.");
                const finished = await finishActivitySubmission(slug, activityId, result.data.id, String(data.get("note") ?? ""));
                if (!finished.ok)
                    throw new Error(finished.message);
                setMessage("Atividade entregue. Sua professora já pode conferir o arquivo.");
            }
            catch (error) {
                if (prepared) {
                    try {
                        await cancelActivitySubmission(slug, activityId);
                    }
                    catch { }
                }
                setMessage((error as Error).message);
            }
        });
    }
    return <div className="activity-upload"><h4>{t("Devolver minha atividade")}</h4>{incomplete ? <><p className="text-xs text-muted">{t("H\u00E1 um envio incompleto. Descarte-o antes de tentar novamente.")}</p><button className="btn-xs" disabled={pending} onClick={() => startTransition(async () => {
                try {
                    const result = await cancelActivitySubmission(slug, activityId);
                    setMessage(result.ok ? "Envio incompleto descartado. Você pode tentar novamente." : result.message);
                }
                catch {
                    setMessage("Não foi possível descartar o envio.");
                }
            })}><BusyContent pending={pending}>{t("Descartar envio incompleto")}</BusyContent></button></> : <form onSubmit={send} className="space-y-3"><div><label className="label" htmlFor={`submission-file-${activityId}`}>{t("Exerc\u00EDcio feito \u00B7 at\u00E9 20 MB")}</label><input id={`submission-file-${activityId}`} name="file" className="input" type="file" accept={DOCUMENT_ACCEPT} required disabled={pending}/></div><div><label className="label" htmlFor={`submission-note-${activityId}`}>{t("Observa\u00E7\u00F5es da entrega (opcional)")}</label><textarea id={`submission-note-${activityId}`} name="note" className="input" maxLength={4000} rows={2} disabled={pending}/></div><button className="btn" disabled={pending}><BusyContent pending={pending}>{pending ? t("Enviando atividade\u2026") : t("Entregar atividade")}</BusyContent></button>{pending && <progress className="document-upload-progress" aria-label={t("Enviando atividade")}/>}<p className="text-[11px] text-muted">{t("Confira o arquivo antes de entregar. Uma entrega por atividade.")}</p></form>}{message && <p role="status" className="mt-3 text-xs text-accent">{t(message)}</p>}</div>;
}
