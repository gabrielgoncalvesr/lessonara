"use client";
import {BusyContent} from "@/components/busy-content";
import { useI18n } from "@/components/browser-preferences-provider";
import { useState, useTransition } from "react";
import { addDays, formatDate } from "@/lib/dates";
import type { HolidaySettings, HolidayRow } from "@/lib/holiday-data";
import { addHoliday, removeHoliday, saveHolidayRule } from "@/app/(panel)/settings/holiday-actions";
export function HolidaySettingsForm({ settings, holidays, today, locked, ready }: {
    settings: HolidaySettings | null;
    holidays: HolidayRow[];
    today: string;
    locked: boolean;
    ready: boolean;
}) {
    const { t, locale } = useI18n();
    const [enabled, setEnabled] = useState(settings?.enabled ?? false);
    const [policy, setPolicy] = useState(settings?.policy ?? "consume");
    const [message, setMessage] = useState("");
    const [pending, startTransition] = useTransition();
    const [removing, setRemoving] = useState<string | null>(null);
    return <section className="card space-y-5"><div><h2 className="h2">{t("Feriados da empresa")}</h2><p className="text-xs leading-relaxed text-muted">{t("Uma regra para todos os seus alunos. Voc\u00EA cadastra as datas, incluindo feriados locais.")}</p></div>
 {!ready ? <p role="status" className="text-sm text-muted">{t("A configura\u00E7\u00E3o de feriados ainda est\u00E1 em prepara\u00E7\u00E3o.")}</p> : <>
 <form onSubmit={event => {
                event.preventDefault();
                setMessage("");
                startTransition(async () => {
                    try {
                        const result = await saveHolidayRule(enabled, policy);
                        setMessage(result.ok ? "Regra de feriados salva." : result.message);
                    }
                    catch {
                        setMessage("Não foi possível salvar a regra.");
                    }
                });
            }} className="space-y-4">
 <fieldset disabled={locked || pending} className="space-y-4 disabled:opacity-70"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/>{t("Considerar feriados no pacote")}</label>
 <div className="space-y-3"><label className="flex items-start gap-3 rounded-xl border border-line p-4"><input type="radio" name="holiday-policy" value="consume" checked={policy === "consume"} onChange={() => setPolicy("consume")} disabled={!enabled} className="mt-1"/><span><b className="text-sm font-medium">{t("Feriado consome uma aula")}</b><span className="mt-1 block text-xs text-muted">{t("A aula n\u00E3o acontece, mas desconta um cr\u00E9dito do pacote.")}</span></span></label>
 <label className="flex items-start gap-3 rounded-xl border border-line p-4"><input type="radio" name="holiday-policy" value="preserve" checked={policy === "preserve"} onChange={() => setPolicy("preserve")} disabled={!enabled} className="mt-1"/><span><b className="text-sm font-medium">{t("Feriado mant\u00E9m o cr\u00E9dito")}</b><span className="mt-1 block text-xs text-muted">{t("Sem desconto. O pacote passa a cobrir o pr\u00F3ximo encontro; n\u00E3o cria cr\u00E9ditos extras.")}</span></span></label></div>
 <button className="btn" type="submit">{pending ? t("Salvando\u2026") : t("Salvar regra de feriados")}</button></fieldset>
 <p className="text-xs leading-relaxed text-muted">{locked ? t("Regra travada: a primeira aula em feriado j\u00E1 foi afetada. Isso protege os saldos e o hist\u00F3rico.") : t("A regra pode mudar at\u00E9 a primeira aula afetada. Depois disso, ativa\u00E7\u00E3o e forma de contagem ficam travadas.")} {settings?.effective_from && t("V\u00E1lida a partir de {value0}.", { value0: formatDate(settings.effective_from, locale) })}</p></form>
 <div className="border-t border-line pt-5"><h3 className="mb-3 text-sm font-semibold">{t("Datas cadastradas")}</h3><p className="mb-4 text-xs leading-relaxed text-muted">{t("Cadastre a partir de amanh\u00E3 para preservar aulas j\u00E1 registradas. Feriados de hoje ou anteriores n\u00E3o podem ser alterados. Reposi\u00E7\u00F5es lan\u00E7adas manualmente continuam consumindo cr\u00E9dito.")}</p>
 <form onSubmit={event => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                setMessage("");
                startTransition(async () => {
                    try {
                        const result = await addHoliday(String(data.get("date")), String(data.get("name")));
                        setMessage(result.ok ? "Feriado cadastrado." : result.message);
                        if (result.ok)
                            form.reset();
                    }
                    catch {
                        setMessage("Não foi possível cadastrar o feriado.");
                    }
                });
            }} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
 <div><label className="label" htmlFor="holiday-date">{t("Data")}</label><input className="input" id="holiday-date" name="date" type="date" min={addDays(today, 1)} required disabled={pending}/></div><div><label className="label" htmlFor="holiday-name">{t("Nome do feriado")}</label><input className="input" id="holiday-name" name="name" maxLength={120} required placeholder={t("Ex.: Feriado municipal")} disabled={pending}/></div><button className="btn self-end" disabled={pending}><BusyContent pending={pending}>{t("Adicionar feriado")}</BusyContent></button></form>
 {!settings?.enabled && <p className="mt-3 text-xs text-muted">{t("As datas ficam guardadas, mas s\u00F3 afetam os pacotes quando a regra est\u00E1 ativada e salva.")}</p>}
 <ul className="mt-5 divide-y divide-line">{holidays.map(holiday => <li key={holiday.id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><span className="text-muted">{formatDate(holiday.date, locale)}</span><span className="flex-1">{holiday.name}</span>{holiday.date > today ? <><button className="btn-xs text-bad" disabled={pending} onClick={() => {
                        if (removing !== holiday.id) {
                            setRemoving(holiday.id);
                            return;
                        }
                        startTransition(async () => {
                            try {
                                const result = await removeHoliday(holiday.id);
                                setMessage(result.ok ? "Feriado removido." : result.message);
                                setRemoving(null);
                            }
                            catch {
                                setMessage("Não foi possível remover o feriado.");
                            }
                        });
                    }}><BusyContent pending={pending}>{removing === holiday.id ? t("Confirmar remo\u00E7\u00E3o") : t("Remover")}</BusyContent></button>{removing === holiday.id && <button className="btn-xs" disabled={pending} onClick={() => setRemoving(null)}><BusyContent pending={pending}>{t("Cancelar")}</BusyContent></button>}</> : <span className="text-xs text-muted">{t("Hist\u00F3rico preservado")}</span>}</li>)}</ul>{!holidays.length && <p className="mt-4 text-xs text-muted">{t("Nenhum feriado cadastrado ainda.")}</p>}</div></>}{message && <p role="status" className="text-xs text-accent">{t(message)}</p>}</section>;
}
