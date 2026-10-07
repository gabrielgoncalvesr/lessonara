import { addDays, weekday } from "./dates";
import type { LessonStatus } from "./ledger";

export type CalendarLesson = {
  id: string;
  date: string;
  time: string;
  status: LessonStatus;
  name: string;
  href?: string;
  note?: string | null;
};

export const LESSON_STATUS: Record<LessonStatus, string> = {
  agendada: "Agendada", dada: "Realizada", falta: "Falta", desmarcada: "Desmarcada", reposicao: "Reposição",
};

export function shiftMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

/** Semanas completas, de segunda a domingo, sem depender do fuso do navegador. */
export function monthCells(month: string): string[] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const offset = (weekday(first) + 6) % 7;
  const count = Math.max(35, Math.ceil((offset + Number(last.slice(8))) / 7) * 7);
  const start = addDays(first, -offset);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function calendarRange(today: string) {
  return { startDate: `${shiftMonth(today.slice(0, 7), -12)}-01`, endDate: addDays(`${shiftMonth(today.slice(0, 7), 13)}-01`, -1) };
}
