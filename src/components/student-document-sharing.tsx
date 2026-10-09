"use client";
import {Toast} from "./toast";
import {DocumentPicker} from "./document-picker";
import {BusyContent} from "@/components/busy-content";
import { useI18n } from "@/components/browser-preferences-provider";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { formatDate } from "@/lib/dates";
import { formatFileSize, shareAvailable } from "@/lib/document-rules";
import type { LibraryDocument, StudentShare } from "@/lib/documents";
import { changeDocumentShare, revokeDocumentShare, shareLibraryDocument } from "@/app/(panel)/documents/actions";
function SharedItem({ share, studentId, today }: {
    share: StudentShare;
    studentId: string;
    today: string;
}) {
    const { t, locale } = useI18n();
    const [expiry, setExpiry] = useState(share.expiresOn ?? "");
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");const [busyAction,setBusyAction]=useState("");
    const expired = !shareAvailable(share.expiresOn, today);
    return <li className="student-document-item"><div><h3>{share.title}</h3><p className="mt-1 text-xs text-muted">{share.subject && t("{value0} \u00B7 ", { value0: share.subject })}{formatFileSize(share.byteSize)}</p><span className={`balance-pill mt-3 ${expired ? "balance-warning" : ""}`}>{expired ? t("Prazo encerrado") : share.expiresOn ? t("Dispon\u00EDvel at\u00E9 {value0}", { value0: formatDate(share.expiresOn, locale) }) : t("Sem prazo de acesso")}</span></div><div className="student-document-controls"><form onSubmit={(event) => {
            event.preventDefault();
            setMessage("");setBusyAction("save");
            startTransition(async () => {
                try {
                    const result = await changeDocumentShare(studentId, share.id, expiry);
                    setMessage(result.ok ? "Prazo atualizado." : result.message);
                }
                catch {
                    setMessage("Não foi possível atualizar o prazo.");
                }
            });
        }}><label className="label" htmlFor={`expiry-${share.id}`}>{t("Validade para este aluno (opcional)")}</label><div className="flex gap-2"><input id={`expiry-${share.id}`} className="input" type="date" min={today} value={expiry} onChange={(event) => setExpiry(event.target.value)} disabled={pending}/><button type="submit" className="btn-xs" disabled={pending}><Icon name="save" className="h-4 w-4"/><BusyContent pending={pending&&busyAction==="save"}>{t("Salvar prazo")}</BusyContent></button></div><div className="mt-2 flex items-center gap-3"><button type="button" className="portal-text-button text-xs" disabled={pending} onClick={() => setExpiry("")}>{t("Sem prazo")}</button><span className="text-[10px] text-muted">{t("Escolha e salve o prazo de acesso.")}</span></div></form><button className="btn-xs btn-danger" disabled={pending} onClick={() => {
            if (!confirmRevoke) {
                setConfirmRevoke(true);
                return;
            }
            setBusyAction("revoke");setMessage("");startTransition(async () => {
                try {
                    const result = await revokeDocumentShare(studentId, share.id);
                    if (!result.ok)
                        setMessage(result.message);
                }
                catch {
                    setMessage("Não foi possível encerrar o acesso.");
                }
            });
        }}><Icon name="archive" className="h-4 w-4"/><BusyContent pending={pending&&busyAction==="revoke"}>{confirmRevoke ? t("Confirmar encerramento") : t("Encerrar acesso")}</BusyContent></button>{confirmRevoke && <><p role="alert" className="text-xs text-muted">{t("Este aluno perder\u00E1 o acesso. O arquivo e os demais alunos ser\u00E3o mantidos.")}</p><button type="button" className="btn-xs" disabled={pending} onClick={() => setConfirmRevoke(false)}>{t("Cancelar encerramento")}</button></>}{message && <Toast message={t(message)}/>}</div></li>;
}
export function StudentDocumentSharing({ studentId, documents, shares, today, ready }: {
    studentId: string;
    documents: LibraryDocument[];
    shares: StudentShare[];
    today: string;
    ready: boolean;
}) {
    const { t } = useI18n();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");
    return <section className="card student-documents"><div className="section-heading mb-5"><div><h2>{t("Materiais do aluno")}<span className="count-badge">{shares.filter((share) => shareAvailable(share.expiresOn, today)).length}</span></h2><p>{t("Compartilhe o arquivo da biblioteca com uma validade individual.")}</p></div><Link href="/documents" className="btn-xs">{t("Abrir biblioteca")}</Link></div>{ready && documents.length ? <form onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setMessage("");
                startTransition(async () => {
                    try {
                        const result = await shareLibraryDocument(studentId, String(data.get("document_id")), String(data.get("expires_on") ?? ""));
                        setMessage(result.ok ? "Material disponível na aba Materiais do link do aluno." : result.message);
                    }
                    catch {
                        setMessage("Não foi possível compartilhar o material.");
                    }
                });
            }} className="document-share-form"><div><label className="label" htmlFor="share-document">{t("Documento da biblioteca")}</label><DocumentPicker key={message} documents={documents.map(d=>({id:d.id,title:d.title,file_name:d.file_name}))} name="document_id" disabled={pending}/></div><div><label className="label" htmlFor="share-expiry">{t("Dispon\u00EDvel at\u00E9 (opcional)")}</label><input id="share-expiry" className="input" name="expires_on" type="date" min={today} disabled={pending}/></div><button className="btn" type="submit" disabled={pending}><BusyContent pending={pending}>{pending ? t("Compartilhando\u2026") : t("Compartilhar material")}</BusyContent></button><p className="document-share-note">{t("Sem data, o acesso fica sem prazo. Compartilhar um material j\u00E1 enviado atualiza a validade dele.")}</p></form> : <div className="document-sharing-empty"><Icon name="book" className="mb-3 h-6 w-6 text-accent"/><p className="text-sm text-muted">{ready ? t("Adicione um documento \u00E0 biblioteca para compartilhar com este aluno.") : t("A biblioteca est\u00E1 em prepara\u00E7\u00E3o. Os materiais poder\u00E3o ser compartilhados assim que ela estiver dispon\u00EDvel.")}</p></div>}{message && <Toast message={t(message)}/>}{shares.length ? <ul>{shares.map((share) => <SharedItem key={`${share.id}-${share.expiresOn}`} share={share} studentId={studentId} today={today}/>)}</ul> : ready && <p className="mt-5 text-xs text-muted">{t("Nenhum material compartilhado com este aluno ainda.")}</p>}</section>;
}
