"use client";
import {Icon} from "./icon";
import {useI18n} from "@/components/browser-preferences-provider";
import type { ReactNode } from "react";
import { formatDateLong } from "@/lib/dates";
import type { Lesson, LessonStatus } from "@/lib/ledger";
const STATUS: Record<LessonStatus, {
    label: string;
    className: string;
}> = {
    feriado: { label: "Feriado", className: "text-muted" },
    dada: { label: "Dada", className: "text-ok" },
    agendada: { label: "Agendada", className: "text-info" },
    falta: { label: "Falta", className: "text-bad" },
    desmarcada: { label: "Desmarcada", className: "text-muted line-through" },
    reposicao: { label: "Reposição", className: "text-extra" },
};
export function LessonList({ lessons, actions, }: {
    lessons: Lesson[];
    actions?: Record<string, ReactNode>;
}) {
    const { t, locale } = useI18n();
    if (lessons.length === 0)
        return <p className="text-sm text-muted">{t("Nenhuma aula.")}</p>;
    return (<ul className="divide-y divide-line">
      {lessons.map((l) => {
            const s = STATUS[l.status];
            const uncovered = l.counts && l.packageIndex === null;
            return (<li key={`${l.date}-${l.time}-${l.status}`} className="lesson-row flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className={`w-24 tabular-nums ${l.past ? "" : "font-medium"}`}>{formatDateLong(l.date, locale)}</span>
            <span className="w-12 tabular-nums text-muted">{l.time}</span>
            <span className={`lesson-status ${s.className}`}>{l.status === "feriado" ? l.counts ? t("Feriado \u00B7 conta") : t("Feriado \u00B7 cr\u00E9dito mantido") : t(s.label)}</span>
            {l.status === "falta" && <span className="text-xs text-muted">{t("Aviso em cima da hora ou n\u00E3o compareceu")}</span>}
            {uncovered && <span className="rounded bg-bad/10 px-1.5 py-0.5 text-xs text-bad">{t("sem pacote")}</span>}
            {l.holidayName && <span className="text-xs text-muted">{t("\u00B7 ")}{l.holidayName}</span>}
            {l.event?.note && <span className="text-xs text-muted">{t("\u00B7 ")}{l.event.note}</span>}
            {l.meetUrl&&<a className="btn-xs" href={l.meetUrl} target="_blank" rel="noreferrer"><Icon name="video" className="h-4 w-4"/>{t("Meet")}</a>}{actions && <span className="ml-auto flex gap-1">{actions[`${l.date}-${l.time}-${l.status}`]}</span>}
          </li>);
        })}
    </ul>);
}
