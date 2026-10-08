"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { formatDate, WEEKDAYS } from "@/lib/dates";
import { LESSON_STATUS, lessonTiming, monthCells, shiftMonth, type CalendarLesson } from "@/lib/calendar";

export function LessonCalendar({ lessons, today, time, startDate, endDate }: { lessons: CalendarLesson[]; today: string; time: string; startDate: string; endDate: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const byDate = useMemo(() => {
    const days = new Map<string, CalendarLesson[]>();
    for (const lesson of lessons) days.set(lesson.date, [...(days.get(lesson.date) ?? []), lesson]);
    for (const entries of days.values()) entries.sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
    return days;
  }, [lessons]);
  const selectedLessons = byDate.get(selected) ?? [];
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
  const navigate = (offset: number) => {
    const next = shiftMonth(month, offset);
    setMonth(next);
    setSelected(today.startsWith(next) ? today : `${next}-01`);
  };
  return (
    <div className="lesson-calendar">
      <section className="calendar-card card" aria-label="Calendário mensal de aulas">
        <div className="calendar-toolbar"><div><p className="eyebrow">UM MÊS DE ENCONTROS</p><h2>{monthLabel}</h2></div><div className="calendar-controls"><button className="btn-ghost" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Hoje</button><button className="calendar-nav" aria-label="Mês anterior" disabled={month <= startDate.slice(0, 7)} onClick={() => navigate(-1)}><Icon name="arrow" className="h-4 w-4 rotate-180" /></button><button className="calendar-nav" aria-label="Próximo mês" disabled={month >= endDate.slice(0, 7)} onClick={() => navigate(1)}><Icon name="arrow" className="h-4 w-4" /></button></div></div>
        <div className="calendar-weekdays" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 0].map((day) => <span key={day}>{WEEKDAYS[day].slice(0, 3)}</span>)}</div>
        <div className="calendar-grid">{monthCells(month).map((date) => {
          const entries = byDate.get(date) ?? [];
          const outside = !date.startsWith(month);
          const disabled = date < startDate || date > endDate;
          return <button type="button" key={date} disabled={disabled} aria-pressed={selected === date} aria-label={`${formatDate(date)}, ${entries.length} ${entries.length === 1 ? "aula" : "aulas"}${date === today ? ", hoje" : ""}`} onClick={() => { setSelected(date); if (outside) setMonth(date.slice(0, 7)); }} className={`calendar-cell ${outside ? "calendar-outside" : ""} ${selected === date ? "calendar-selected" : ""}`}><span className={`calendar-day ${date === today ? "calendar-today" : ""}`}>{Number(date.slice(8))}</span><span className="calendar-events">{entries.slice(0, 2).map((entry) => <span key={entry.id} className={`calendar-event event-${entry.status}`}><span className="font-semibold">{entry.time}</span><span className="calendar-event-name">{entry.name}</span></span>)}{entries.length > 2 && <span className="calendar-more">+{entries.length - 2} aulas</span>}</span></button>;
        })}</div>
        <div className="calendar-legend">{(["agendada", "dada", "reposicao", "falta", "desmarcada", "feriado"] as const).map((status) => <span key={status}><span className={`legend-dot event-${status}`} />{LESSON_STATUS[status]}</span>)}</div>
      </section>
      <section className="card day-summary" aria-label="Resumo das aulas do dia"><div className="section-heading"><div><p className="eyebrow">O DIA EM DETALHES</p><h2>{selected === today ? "Hoje" : formatDate(selected)}<span className="count-badge">{selectedLessons.length}</span></h2></div><Icon name="calendar" className="h-5 w-5 text-accent" /></div><div aria-live="polite">{selectedLessons.length ? <ul>{selectedLessons.map((lesson) => { const timing = lessonTiming(lesson, today, time); return <li key={lesson.id} className={`day-lesson ${timing === "completed" || timing === "cancelled" ? "lesson-finished" : ""} ${timing === "ongoing" ? "lesson-ongoing" : ""}`}><span className="day-lesson-time">{lesson.time}</span><div className="min-w-0 flex-1">{lesson.href ? <Link className="font-semibold hover:underline" href={lesson.href}>{lesson.name}</Link> : <p className="font-semibold">{lesson.name}</p>}{lesson.note && <p className="mt-1 text-xs text-muted">{lesson.note}</p>}</div><span className={`calendar-event ${timing === "ongoing" ? "event-ongoing" : timing === "completed" ? "event-completed" : `event-${lesson.status}`}`}>{timing === "ongoing" ? "Ocorrendo agora" : timing === "completed" ? "Já aconteceu" : LESSON_STATUS[lesson.status]}</span>{lesson.href && <Link href={lesson.href} className="row-arrow" aria-label={`Ver aulas de ${lesson.name}`}><Icon name="arrow" className="h-4 w-4" /></Link>}</li>; })}</ul> : <p className="py-8 text-sm text-muted">Nenhuma aula neste dia. Selecione outro dia no calendário.</p>}</div></section>
      <p className="calendar-range">Horários considerados no carregamento: {time} (São Paulo). Aulas de 60 minutos. Agenda disponível de {formatDate(startDate)} até {formatDate(endDate)}. Aulas desmarcadas não descontam do pacote.</p>
    </div>
  );
}
