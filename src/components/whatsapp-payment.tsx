"use client";

import { useId, useRef, useState } from "react";
import { CopyButton } from "./copy-button";
import { DEFAULT_WHATSAPP_MESSAGE, PAYMENT_PIX_KEY, paymentWhatsAppUrl } from "@/lib/whatsapp";

export function WhatsAppPayment({ studentName, initialPhone }: { studentName: string; initialPhone?: string | null }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const phoneId = useId();
  const url = paymentWhatsAppUrl(phone);
  return <><button ref={trigger} type="button" className="btn-xs" onClick={() => setOpen(true)}>Abrir WhatsApp</button>{open && <div className="whatsapp-overlay" onClick={(event) => { if (event.target === event.currentTarget) close(); }}><div role="dialog" aria-modal="true" aria-label={`Mensagem para ${studentName}`} className="whatsapp-dialog card" onKeyDown={(event) => { if (event.key === "Escape") close(); if (event.key === "Tab") { const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input"); const first = controls[0]; const last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } }}><div className="section-heading"><div><p className="eyebrow">AVISO DE PAGAMENTO</p><h2>{studentName}</h2></div><button type="button" className="btn-xs" aria-label="Fechar mensagem" onClick={close}>Fechar</button></div><label className="label mt-6" htmlFor={phoneId}>Telefone do aluno (opcional)</label><input autoFocus id={phoneId} type="tel" className="input" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" /><p className="mt-2 text-xs leading-relaxed text-muted">Informe o DDD. Para outro país, use +DDI. Deixe vazio para escolher o contato no WhatsApp.</p>{!url && <p role="alert" className="mt-2 text-xs text-bad">Confira o telefone e o código do país.</p>}<div className="whatsapp-message">{DEFAULT_WHATSAPP_MESSAGE}</div><div className="pix-copy"><div><span className="label">Chave Pix · CPF</span><code>{PAYMENT_PIX_KEY}</code></div><CopyButton text={PAYMENT_PIX_KEY} label="Copiar Pix" /></div><div className="mt-5 flex flex-wrap justify-end gap-3"><CopyButton text={DEFAULT_WHATSAPP_MESSAGE} label="Copiar mensagem" /><button type="button" className="btn" disabled={!url} onClick={() => { if (url) { window.open(url, "_blank", "noopener,noreferrer"); close(); } }}>Abrir conversa</button></div></div></div>}</>;
}
