"use client";

import { useState, useTransition } from "react";
import { Icon } from "./icon";
import { DocumentUpload } from "./document-upload";
import { formatDate, nowInTZ } from "@/lib/dates";
import { formatFileSize, LIBRARY_BYTES } from "@/lib/document-rules";
import type { LibraryDocument } from "@/lib/documents";
import { removeLibraryDocument, updateLibraryDocument } from "@/app/(painel)/documentos/actions";

function DocumentItem({ document }: { document: LibraryDocument }) {
  const [editing, setEditing] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function remove() {

    startTransition(async () => {
      try { const result = await removeLibraryDocument(document.id); if (!result.ok) setMessage(result.message); }
      catch { setMessage("Não foi possível remover o arquivo. Atualize a biblioteca."); }
    });
  }
  return <li className="document-item"><span className="document-type"><Icon name="book" className="h-5 w-5" /><span>{document.file_name.split(".").at(-1)?.toUpperCase()}</span></span><div className="document-item-content">{editing ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => { try { const result = await updateLibraryDocument(document.id, { title: String(data.get("title")), subject: String(data.get("subject") ?? "") }); if (result.ok) { setEditing(false); setMessage(""); } else setMessage(result.message); } catch { setMessage("Não foi possível atualizar o documento."); } }); }} className="space-y-2"><label className="label" htmlFor={`title-${document.id}`}>Título</label><input id={`title-${document.id}`} className="input" name="title" required maxLength={120} defaultValue={document.title} /><label className="label" htmlFor={`subject-${document.id}`}>Assunto</label><input id={`subject-${document.id}`} className="input" name="subject" maxLength={80} defaultValue={document.subject} /><div className="flex gap-2"><button type="submit" className="btn-xs" disabled={pending}>Salvar</button><button type="button" className="btn-xs" onClick={() => setEditing(false)}>Cancelar</button></div></form> : <><h3>{document.title}</h3>{document.subject && <p className="mt-1 text-xs text-accent">{document.subject}</p>}<p className="document-filename">{document.file_name}</p><p className="mt-2 text-[11px] text-muted">{formatFileSize(document.byte_size)} · {formatDate(nowInTZ(new Date(document.created_at)).today)} · {document.shareCount} {document.shareCount === 1 ? "compartilhamento ativo" : "compartilhamentos ativos"}</p>{document.status !== "ready" && <span className="balance-pill balance-warning mt-2">{document.status === "deleting" ? "Exclusão incompleta" : "Envio incompleto"}</span>}</>}{confirmRemoval && <p role="alert" className="mt-3 text-xs text-bad">Excluir este arquivo permanentemente? Todos os alunos perderão o acesso.</p>}{message && <p role="status" className="mt-2 text-xs text-bad">{message}</p>}</div><div className="document-item-actions">{document.status === "ready" && <><a className="btn-xs" href={`/documentos/${document.id}/arquivo`} target="_blank" rel="noreferrer">Abrir arquivo</a><button className="btn-xs" type="button" onClick={() => setEditing(!editing)} disabled={pending}>Editar</button></>}<button className="btn-xs text-bad" type="button" disabled={pending} onClick={() => confirmRemoval ? remove() : setConfirmRemoval(true)}>{pending ? "Removendo…" : confirmRemoval ? "Confirmar exclusão" : "Excluir"}</button>{confirmRemoval && <button type="button" className="btn-xs" disabled={pending} onClick={() => setConfirmRemoval(false)}>Cancelar exclusão</button>}</div></li>;
}

export function DocumentLibrary({ documents, ready }: { documents: LibraryDocument[]; ready: boolean }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const subjects = [...new Set(documents.map((document) => document.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const matches = documents.filter((document) => (!subject || document.subject === subject) && `${document.title} ${document.subject} ${document.file_name}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const bytes = documents.reduce((total, document) => total + document.byte_size, 0);
  const documentCount = documents.filter((document) => document.status === "ready").length;
  const shareCount = documents.reduce((total, document) => total + document.shareCount, 0);
  const occupied = Math.min(100, bytes / LIBRARY_BYTES * 100);
  return <main><div className="page-heading"><div><p className="eyebrow">UMA BIBLIOTECA, MUITAS JORNADAS</p><h1>Documentos</h1><p className="page-description">Organize seus materiais e compartilhe pelo perfil de cada aluno.</p></div></div><section className="card document-storage"><div><h2>Espaço da biblioteca</h2><p>{documentCount} {documentCount === 1 ? "documento" : "documentos"} · {shareCount} {shareCount === 1 ? "compartilhamento ativo" : "compartilhamentos ativos"}</p></div><div className="document-storage-meter"><span>{formatFileSize(bytes)} <span className="text-muted">de 1 GB</span></span><div className="package-progress" role="progressbar" aria-label="Espaço utilizado na biblioteca" aria-valuenow={Math.round(occupied)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${occupied}%` }} /></div></div></section>{!ready && <p role="status" className="card my-6 text-sm text-muted">A biblioteca ainda não está disponível. Conclua a configuração do armazenamento para ativar os envios.</p>}<DocumentUpload available={ready} /><section className="card document-list"><div className="section-heading"><h2>Seus materiais<span className="count-badge">{documents.length}</span></h2><Icon name="book" className="h-5 w-5 text-accent" /></div><div className="document-library-tools"><label className="search-field"><Icon name="search" className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar documento" placeholder="Título, assunto ou arquivo…" /></label><select className="input" aria-label="Filtrar documentos por assunto" value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">Todos os assuntos</option>{subjects.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>{matches.length ? <ul>{matches.map((document) => <DocumentItem key={document.id} document={document} />)}</ul> : <div className="empty-state"><Icon name="book" className="mx-auto mb-4 h-8 w-8 text-accent" /><h3>{documents.length ? "Nenhum material encontrado" : "Seu primeiro material começa aqui"}</h3><p>{documents.length ? "Experimente outro nome ou assunto." : "Envie um arquivo acima. Depois, escolha os alunos que poderão acessá-lo."}</p></div>}</section><p className="calendar-range">Um compartilhamento reutiliza o arquivo da biblioteca. Cada aluno pode ter um prazo diferente. Envios incompletos reservam espaço até serem concluídos ou removidos.</p></main>;
}
