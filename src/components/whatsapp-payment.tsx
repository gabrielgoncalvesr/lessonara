"use client";
import {useI18n} from "@/components/browser-preferences-provider";
import { useId, useRef, useState } from "react";
import { PhoneField } from "./phone-field";
import { initialPhone as preparePhone } from "@/lib/phone";
import { CopyButton } from "./copy-button";
import { DEFAULT_WHATSAPP_MESSAGE, PAYMENT_PIX_KEY, paymentWhatsAppUrl } from "@/lib/whatsapp";
export function WhatsAppPayment({ studentName, initialPhone, initialCountry }: {
    studentName: string;
    initialPhone?: string | null;
    initialCountry?: string | null;
}) {
    const { t } = useI18n();
    const trigger = useRef<HTMLButtonElement>(null);
    const close = () => { setOpen(false); trigger.current?.focus(); };
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState(initialPhone ?? "");
    const [country, setCountry] = useState(preparePhone(initialPhone, initialCountry).country);
    const phoneId = useId();
    const url = paymentWhatsAppUrl(phone, country);
    return <><button ref={trigger} type="button" className="btn-xs" onClick={() => setOpen(true)}>{t("Abrir WhatsApp")}</button>{open && <div className="whatsapp-overlay" onClick={(event) => { if (event.target === event.currentTarget)
        close(); }}><div role="dialog" aria-modal="true" aria-label={t("Mensagem para {value0}", { value0: studentName })} className="whatsapp-dialog card" onKeyDown={(event) => { if (event.key === "Escape")
        close(); if (event.key === "Tab") {
        const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([type=hidden]), select");
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    } }}><div className="section-heading"><div><p className="eyebrow">{t("AVISO DE PAGAMENTO")}</p><h2>{studentName}</h2></div><button type="button" className="btn-xs" aria-label={t("Fechar mensagem")} onClick={close}>{t("Fechar")}</button></div><label className="label mt-6" htmlFor={phoneId}>{t("Telefone do aluno (opcional)")}</label><PhoneField autoFocus id={phoneId} defaultValue={phone} defaultCountry={country} onChange={(value, nextCountry) => { setPhone(value); setCountry(preparePhone(value, nextCountry).country); }}/><p className="mt-2 text-xs leading-relaxed text-muted">{t("Selecione o pa\u00EDs e informe o n\u00FAmero. Deixe vazio para escolher o contato no WhatsApp. Para salvar o telefone, altere o cadastro do aluno.")}</p>{!url && <p role="alert" className="mt-2 text-xs text-bad">{t("Confira o telefone e o c\u00F3digo do pa\u00EDs.")}</p>}<div className="whatsapp-message">{DEFAULT_WHATSAPP_MESSAGE}</div><div className="pix-copy"><div><span className="label">{t("Chave Pix \u00B7 CPF")}</span><code>{PAYMENT_PIX_KEY}</code></div><CopyButton text={PAYMENT_PIX_KEY} label={t("Copiar Pix")}/></div><div className="mt-5 flex flex-wrap justify-end gap-3"><CopyButton text={DEFAULT_WHATSAPP_MESSAGE} label={t("Copiar mensagem")}/><button type="button" className="btn" disabled={!url} onClick={() => { if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        close();
    } }}>{t("Abrir conversa")}</button></div></div></div>}</>;
}
