"use client";
import {Toast} from "./toast";
import {FileDownload} from "./file-download";
import {BusyContent} from "@/components/busy-content";
import { useI18n } from "@/components/browser-preferences-provider";
import { useState, useTransition } from "react";
import { Icon } from "./icon";
import { DocumentUpload } from "./document-upload";
import { formatDate, nowInTZ } from "@/lib/dates";
import { formatFileSize, LIBRARY_BYTES } from "@/lib/document-rules";
import type { LibraryDocument } from "@/lib/documents";
import { removeLibraryDocument, updateLibraryDocument } from "@/app/(panel)/documents/actions";
function DocumentItem({ document }: {
    document: LibraryDocument;
}) {
    const { t, locale } = useI18n();
    const [editing, setEditing] = useState(false);
    const [confirmRemoval, setConfirmRemoval] = useState(false);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");const [busyAction,setBusyAction]=useState("");
    function remove() {
        setBusyAction("remove");setMessage("");startTransition(async () => {
            try {
                const result = await removeLibraryDocument(document.id);
                if (!result.ok)
                    setMessage(result.message);
            }
            catch {
                setMessage("Não foi possível remover o arquivo. Atualize a biblioteca.");
            }
        });
    }
    return <li className="document-item" data-action-busy={pending}><span className="document-type"><Icon name="book" className="h-5 w-5"/><span>{document.file_name.split(".").at(-1)?.toUpperCase()}</span></span><div className="document-item-content">{editing ? <form onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);setBusyAction("save");setMessage("");
                startTransition(async () => {
                    try {
                        const result = await updateLibraryDocument(document.id, { title: String(data.get("title")), subject: String(data.get("subject") ?? "") });
                        if (result.ok) {
                            setEditing(false);
                            setMessage("");
                        }
                        else
                            setMessage(result.message);
                    }
                    catch {
                        setMessage("Não foi possível atualizar o documento.");
                    }
                });
            }} className="space-y-2"><label className="label" htmlFor={`title-${document.id}`}>{t("T\u00EDtulo")}</label><input id={`title-${document.id}`} className="input" name="title" required maxLength={120} defaultValue={document.title}/><label className="label" htmlFor={`subject-${document.id}`}>{t("Assunto")}</label><input id={`subject-${document.id}`} className="input" name="subject" maxLength={80} defaultValue={document.subject}/><div className="flex gap-2"><button type="submit" aria-busy={pending&&busyAction==="save"} className="btn-xs" disabled={pending}><Icon name="save" className="h-4 w-4"/><BusyContent pending={pending&&busyAction==="save"}>{t("Salvar")}</BusyContent></button><button type="button" className="btn-xs" disabled={pending} onClick={() => setEditing(false)}>{t("Cancelar")}</button></div></form> : <><h3>{document.title}</h3>{document.subject && <p className="mt-1 text-xs text-accent">{document.subject}</p>}<p className="document-filename">{document.file_name}</p><p className="mt-2 text-[11px] text-muted">{formatFileSize(document.byte_size)}{t(" \u00B7 ")}{formatDate(nowInTZ(new Date(document.created_at)).today, locale)}{t(" \u00B7 ")}{document.shareCount} {document.shareCount === 1 ? t("compartilhamento ativo") : t("compartilhamentos ativos")}</p>{document.status !== "ready" && <span className="balance-pill balance-warning mt-2">{document.status === "deleting" ? t("Exclus\u00E3o incompleta") : t("Envio incompleto")}</span>}</>}{confirmRemoval && <p role="alert" className="mt-3 text-xs text-bad">{t("Excluir este arquivo permanentemente? Todos os alunos perder\u00E3o o acesso.")}</p>}{message && <Toast message={t(message)}/>}</div><div className="document-item-actions">{document.status === "ready" && <><FileDownload href={`/documents/${document.id}/file`} label={t("Baixar arquivo")} name={document.file_name}/><button className="btn-xs" type="button" onClick={() => setEditing(!editing)} disabled={pending}><Icon name="settings" className="h-4 w-4"/>{t("Editar")}</button></>}<button className="btn-xs btn-danger" type="button" aria-busy={pending&&busyAction==="remove"} disabled={pending} onClick={() => confirmRemoval ? remove() : setConfirmRemoval(true)}><Icon name="trash" className="h-4 w-4"/><BusyContent pending={pending&&busyAction==="remove"}>{pending&&busyAction==="remove" ? t("Removendo\u2026") : confirmRemoval ? t("Confirmar exclus\u00E3o") : t("Excluir")}</BusyContent></button>{confirmRemoval && <button type="button" className="btn-xs" disabled={pending} onClick={() => setConfirmRemoval(false)}>{t("Cancelar exclus\u00E3o")}</button>}</div></li>;
}
export function DocumentLibrary({ documents, ready, submissionBytes = 0 }: {
    documents: LibraryDocument[];
    ready: boolean;
    submissionBytes?: number;
}) {
    const { t } = useI18n();
    const [query, setQuery] = useState("");
    const [subject, setSubject] = useState("");
    const subjects = [...new Set(documents.map((document) => document.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const matches = documents.filter((document) => (!subject || document.subject === subject) && `${document.title} ${document.subject} ${document.file_name}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
    const bytes = documents.reduce((total, document) => total + document.byte_size, submissionBytes);
    const documentCount = documents.filter((document) => document.status === "ready").length;
    const shareCount = documents.reduce((total, document) => total + document.shareCount, 0);
    const occupied = Math.min(100, bytes / LIBRARY_BYTES * 100);
    return <main><div className="page-heading"><div><p className="eyebrow">{t("UMA BIBLIOTECA, MUITAS JORNADAS")}</p><h1>{t("Documentos")}</h1><p className="page-description">{t("Organize seus materiais e compartilhe pelo perfil de cada aluno.")}</p></div></div><section className="card document-storage"><div><h2>{t("Espa\u00E7o de arquivos")}</h2><p>{documentCount} {documentCount === 1 ? t("documento") : t("documentos")}{t(" \u00B7 ")}{shareCount} {shareCount === 1 ? t("compartilhamento ativo") : t("compartilhamentos ativos")}</p></div><div className="document-storage-meter"><span>{formatFileSize(bytes)} <span className="text-muted">{t("de 1 GB")}</span></span><div className="package-progress" role="progressbar" aria-label={t("Espa\u00E7o utilizado na biblioteca")} aria-valuenow={Math.round(occupied)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${occupied}%` }}/></div></div></section>{!ready && <p role="status" className="card my-6 text-sm text-muted">{t("A biblioteca ainda n\u00E3o est\u00E1 dispon\u00EDvel. Conclua a configura\u00E7\u00E3o do armazenamento para ativar os envios.")}</p>}<DocumentUpload available={ready}/><section className="card document-list"><div className="section-heading"><h2>{t("Seus materiais")}<span className="count-badge">{documents.length}</span></h2><Icon name="book" className="h-5 w-5 text-accent"/></div><div className="document-library-tools"><label className="search-field"><Icon name="search" className="h-4 w-4"/><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("Buscar documento")} placeholder={t("T\u00EDtulo, assunto ou arquivo\u2026")}/></label><select className="input" aria-label={t("Filtrar documentos por assunto")} value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">{t("Todos os assuntos")}</option>{subjects.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>{matches.length ? <ul>{matches.map((document) => <DocumentItem key={document.id} document={document}/>)}</ul> : <div className="empty-state"><Icon name="book" className="mx-auto mb-4 h-8 w-8 text-accent"/><h3>{documents.length ? t("Nenhum material encontrado") : t("Seu primeiro material come\u00E7a aqui")}</h3><p>{documents.length ? t("Experimente outro nome ou assunto.") : t("Envie um arquivo acima. Depois, escolha os alunos que poder\u00E3o acess\u00E1-lo.")}</p></div>}</section><p className="calendar-range">{t("Materiais e entregas de atividades usam o mesmo espa\u00E7o. Um compartilhamento reutiliza o arquivo da biblioteca. Cada aluno pode ter um prazo diferente. Envios incompletos reservam espa\u00E7o at\u00E9 serem conclu\u00EDdos ou removidos.")}</p></main>;
}
