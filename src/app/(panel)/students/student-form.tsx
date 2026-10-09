"use client";
import {useI18n} from "@/components/browser-preferences-provider";
import { useState } from "react";
import type { Plan, Student } from "@/lib/data";
import { formatBRL } from "@/lib/dates";
import { PhoneField } from "@/components/phone-field";
export function StudentFields({ student, plans }: {
    student?: Student;
    plans: Plan[];
}) {
    const { t, locale } = useI18n();
    const initialPlan = plans.find(plan => plan.id === student?.plan_id) ?? (!student ? plans[0] : undefined);
    const [planId, setPlanId] = useState(student?.plan_id ?? initialPlan?.id ?? "");
    const [frequency, setFrequency] = useState(String(student?.weekly_lessons ?? initialPlan?.weekly_lessons ?? 1));
    return <><div className="grid gap-5 sm:grid-cols-2"><div><label className="label" htmlFor="student-name">{t("Nome")}</label><input className="input" id="student-name" name="name" required defaultValue={student?.name}/></div><div><label className="label" htmlFor="student-email">{t("Email do aluno (obrigat\u00F3rio)")}</label><input suppressHydrationWarning className="input" id="student-email" name="email" type="email" required maxLength={254} defaultValue={student?.email ?? ""}/></div><div><label className="label" htmlFor="student-phone">{t("Telefone / WhatsApp")}</label><PhoneField id="student-phone" name="phone" defaultValue={student?.phone} defaultCountry={student?.phone_country}/></div><div><label className="label" htmlFor="student-plan_id">{t("Plano")}</label><select className="input" id="student-plan_id" name="plan_id" value={planId} onChange={event => { setPlanId(event.target.value); const plan = plans.find(item => item.id === event.target.value); setFrequency(String(plan?.weekly_lessons ?? 1)); }}><option value="">{t("Sem plano")}</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}{t(" \u00B7 ")}{plan.lessons}{t(" aulas \u00B7 ")}{formatBRL(plan.price, locale)}</option>)}</select></div><div><label className="label" htmlFor="student-frequency">{t("Aulas por semana")}</label><input className="input" id="student-frequency" name="weekly_lessons" type="number" min={1} max={7} step={1} required value={frequency} onChange={event => setFrequency(event.target.value)}/><p className="mt-2 text-xs text-muted">{t("Quantidade de hor\u00E1rios fixos por semana. Pode ser diferente do padr\u00E3o do plano.")}</p></div><div><label className="label" htmlFor="student-price_override">{t("Valor diferente (opcional)")}</label><input className="input" id="student-price_override" name="price_override" type="number" placeholder={t("usa o valor do plano")} defaultValue={student?.price_override ?? ""}/></div></div><div><label className="label" htmlFor="student-notes">{t("Observa\u00E7\u00F5es")}</label><textarea className="input" id="student-notes" name="notes" rows={2} defaultValue={student?.notes ?? ""}/></div></>;
}
