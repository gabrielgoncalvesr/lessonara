"use client";

import { useState, useTransition, type FormEvent } from "react";
import { TimeField } from "./time-field";
import { WEEKDAYS } from "@/lib/dates";
import { canAddWeeklySchedule } from "@/lib/schedule-rules";
import type { Schedule } from "@/lib/ledger";
import { addSchedule } from "@/app/(painel)/actions";

export function ScheduleForm({ studentId, schedules, limit, today }: { studentId: string; schedules: Schedule[]; limit: number; today: string }) {
  const [day, setDay] = useState(1);
  const [startsOn, setStartsOn] = useState(today);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const locked = !canAddWeeklySchedule(schedules, limit, today, 1);
  const allowed = Boolean(startsOn) && canAddWeeklySchedule(schedules, limit, startsOn, day);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || pending) return;
    const data = new FormData(event.currentTarget);
    setMessage("");
    startTransition(async () => {
      try { await addSchedule(studentId, data); setMessage("Horário adicionado."); }
      catch { setMessage("Não foi possível adicionar. Confira o limite do pacote e atualize a página."); }
    });
  }
  return <div className="schedule-config"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">Configurar novo horário</h3><span className="text-xs text-muted">{limit} {limit === 1 ? "horário semanal permitido" : "horários semanais permitidos"}</span></div><form onSubmit={submit}><fieldset disabled={locked || pending} className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div><label className="label" htmlFor="schedule-day">Dia</label><select id="schedule-day" name="weekday" className="input" value={day} onChange={(event) => setDay(Number(event.target.value))}>{WEEKDAYS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></div><div><label className="label" htmlFor="schedule-time">Hora</label><TimeField id="schedule-time" /></div><div><label className="label" htmlFor="schedule-start">A partir de</label><input id="schedule-start" className="input" name="starts_on" type="date" required value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></div><div className="flex items-end"><button className="btn w-full" type="submit" disabled={!allowed || pending}>{pending ? "Adicionando…" : "Adicionar horário"}</button></div></fieldset></form><p className="mt-3 text-xs leading-relaxed text-muted">{!limit ? "Selecione um plano ou registre um pacote para configurar os horários." : !allowed ? "O pacote já tem todos os horários permitidos. Encerre um horário existente antes de adicionar outro." : "Pacote de 4 aulas: 1 horário por semana. Pacote de 8 aulas: até 2 horários. Para mudar de dia, encerre o antigo e adicione o novo."}</p>{message && <p role="status" className="mt-3 text-xs text-accent">{message}</p>}</div>;
}
