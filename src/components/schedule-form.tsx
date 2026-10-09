"use client";
import {BusyContent} from "@/components/busy-content";
import { useI18n } from "@/components/browser-preferences-provider";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { TimeField } from "./time-field";
import { WEEKDAYS } from "@/lib/dates";
import { canAddWeeklySchedule } from "@/lib/schedule-rules";
import type { Schedule } from "@/lib/ledger";
import { addSchedule } from "@/app/(panel)/actions";
export function ScheduleForm({ studentId, schedules, limit, today }: {
    studentId: string;
    schedules: Schedule[];
    limit: number;
    today: string;
}) {
    const { t } = useI18n();
    const [day, setDay] = useState(1);
    const [startsOn, setStartsOn] = useState(today);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState("");
    const running=useRef(false);
    const allowed = Boolean(startsOn) && canAddWeeklySchedule(schedules, limit, startsOn, day);
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!allowed || pending || running.current)
            return;
        running.current=true;
        const data = new FormData(event.currentTarget);
        setMessage("");
        startTransition(async () => {
            try {
                await addSchedule(studentId, data);
                setMessage("Horário adicionado.");
            }
            catch {
                setMessage("Não foi possível adicionar. Confira a frequência semanal e atualize a página.");
            } finally { running.current=false; }
        });
    }
    return <div className="schedule-config"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">{t("Configurar novo hor\u00E1rio")}</h3><span className="text-xs text-muted">{limit} {limit === 1 ? t("hor\u00E1rio semanal permitido") : t("hor\u00E1rios semanais permitidos")}</span></div><form onSubmit={submit}><fieldset disabled={!limit || pending} className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div><label className="label" htmlFor="schedule-day">{t("Dia")}</label><select id="schedule-day" name="weekday" className="input" value={day} onChange={(event) => setDay(Number(event.target.value))}>{WEEKDAYS.map((name, index) => <option key={name} value={index}>{t(name)}</option>)}</select></div><div><label className="label" htmlFor="schedule-time">{t("Hora")}</label><TimeField id="schedule-time"/></div><div><label className="label" htmlFor="schedule-start">{t("A partir de")}</label><input id="schedule-start" className="input" name="starts_on" type="date" required value={startsOn} onChange={(event) => setStartsOn(event.target.value)}/></div><div className="flex items-end"><button className="btn w-full" type="submit" disabled={!allowed || pending}><BusyContent pending={pending}>{pending ? t("Adicionando\u2026") : t("Adicionar hor\u00E1rio")}</BusyContent></button></div></fieldset></form><p className="mt-3 text-xs leading-relaxed text-muted">{!limit ? t("Defina as aulas por semana nos dados do aluno para configurar os hor\u00E1rios.") : !allowed ? t("A frequ\u00EAncia semanal j\u00E1 tem todos os hor\u00E1rios permitidos. Encerre um hor\u00E1rio existente antes de adicionar outro.") : t("A quantidade de hor\u00E1rios segue as aulas por semana do aluno. Para mudar de dia, encerre o antigo e adicione o novo.")}</p>{message && <p role="status" className="mt-3 text-xs text-accent">{t(message)}</p>}</div>;
}
