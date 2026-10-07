"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { DOCUMENT_ACCEPT, DOCUMENT_BUCKET, validateDocumentFile } from "@/lib/document-rules";
import { beginDocumentUpload, finishDocumentUpload, removeLibraryDocument } from "@/app/(painel)/documentos/actions";

export function DocumentUpload({ available }: { available: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !available) return;
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File)) return;
    try { validateDocumentFile(file.name, file.size); }
    catch (error) { setSuccess(false); setMessage((error as Error).message); return; }
    setMessage("");
    startTransition(async () => {
      let documentId: string | null = null;
      try {
        const prepared = await beginDocumentUpload({ title: String(data.get("title")), subject: String(data.get("subject") ?? ""), fileName: file.name, byteSize: file.size });
        if (!prepared.ok) throw new Error(prepared.message);
        documentId = prepared.data.id;
        const client = createBrowserSupabase();
        const uploaded = await client.storage.from(DOCUMENT_BUCKET).uploadToSignedUrl(prepared.data.path, prepared.data.token, file, { contentType: prepared.data.mimeType });
        if (uploaded.error) throw new Error("O envio do arquivo falhou. Confira sua conexão e tente novamente.");
        const finished = await finishDocumentUpload(documentId);
        if (!finished.ok) throw new Error(finished.message);
        form.current?.reset(); setTitle(""); setSuccess(true); setMessage("Arquivo salvo na biblioteca. Agora você pode compartilhá-lo no perfil de cada aluno.");
      } catch (error) {
        if (documentId) { try { await removeLibraryDocument(documentId, true); } catch {} }
        setSuccess(false); setMessage((error as Error).message || "Não foi possível enviar o arquivo.");
      }
    });
  }
  return <section className="card document-upload"><h2 className="h2">Adicionar à biblioteca</h2><p className="mb-5 text-xs leading-relaxed text-muted">Envie uma vez e reutilize o mesmo arquivo com vários alunos. PDFs, documentos, apresentações, planilhas e imagens, até 20 MB.</p><form ref={form} onSubmit={upload}><fieldset disabled={!available || pending} className="document-upload-fields"><div><label className="label" htmlFor="document-file">Arquivo</label><input id="document-file" name="file" type="file" accept={DOCUMENT_ACCEPT} required className="input" onChange={(event) => { const file = event.target.files?.[0]; if (file && !title) setTitle(file.name.replace(/\.[^.]+$/, "")); }} /></div><div><label className="label" htmlFor="document-title">Título do material</label><input id="document-title" name="title" className="input" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Voz passiva · exercícios" /></div><div><label className="label" htmlFor="document-subject">Assunto (opcional)</label><input id="document-subject" name="subject" className="input" maxLength={80} placeholder="Ex.: Gramática · B1" /></div><button className="btn" type="submit">{pending ? "Enviando arquivo…" : "Salvar documento"}</button></fieldset></form>{pending && <progress className="document-upload-progress" aria-label="Enviando documento" />}{message && <p role="status" className={`mt-4 text-xs leading-relaxed ${success ? "text-ok" : "text-bad"}`}>{message}</p>}</section>;
}
