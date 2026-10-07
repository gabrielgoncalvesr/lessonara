import { addDays, weekday } from "./dates";

export type Schedule = {
  weekday: number; // 0 = domingo
  time: string; // "HH:MM"
  starts_on: string;
  ends_on: string | null;
};

export type EventKind = "falta" | "desmarcada" | "reposicao";

export type LessonEvent = {
  id: string;
  date: string;
  kind: EventKind;
  time: string | null;
  note: string | null;
};

export type Package = {
  id: string;
  paid_on: string;
  lessons: number;
  amount: number;
};

export type LessonStatus = "agendada" | "dada" | "falta" | "desmarcada" | "reposicao";

export type Lesson = {
  date: string;
  time: string;
  status: LessonStatus;
  /** Consome uma aula do pacote. */
  counts: boolean;
  past: boolean;
  /** Índice do pacote (ordem de pagamento) que cobre a aula; null = sem pacote. */
  packageIndex: number | null;
  event: LessonEvent | null;
};

export type Ledger = {
  lessons: Lesson[];
  credits: number;
  used: number;
  /** Aulas pagas ainda não usadas. Negativo = aulas dadas sem pagamento. */
  remaining: number;
  /** Data da última aula coberta pelos pacotes pagos. */
  coveredUntil: string | null;
};

const MAX_WEEKS = 104;

export function computeLedger(input: {
  schedules: Schedule[];
  events: LessonEvent[];
  packages: Package[];
  today: string;
  time: string;
}): Ledger {
  const { schedules, events, today, time } = input;
  const packages = [...input.packages].sort((a, b) => a.paid_on.localeCompare(b.paid_on));
  const credits = packages.reduce((sum, p) => sum + p.lessons, 0);
  const limit = addDays(today, MAX_WEEKS * 7);

  const byDate = new Map<string, LessonEvent[]>();
  for (const e of events) {
    if (e.kind === "reposicao") continue;
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  }

  const isPast = (date: string, t: string) => date < today || (date === today && t <= time);

  const lessons: Lesson[] = [];
  for (const s of schedules) {
    const end = s.ends_on && s.ends_on < limit ? s.ends_on : limit;
    let date = addDays(s.starts_on, (s.weekday - weekday(s.starts_on) + 7) % 7);
    for (; date <= end; date = addDays(date, 7)) {
      const event = (byDate.get(date) ?? []).find((e) => !e.time || e.time === s.time) ?? null;
      const past = isPast(date, s.time);
      const status: LessonStatus = event ? event.kind : past ? "dada" : "agendada";
      lessons.push({ date, time: s.time, status, counts: status !== "desmarcada", past, packageIndex: null, event });
    }
  }
  for (const e of events) {
    if (e.kind !== "reposicao") continue;
    const t = e.time ?? "00:00";
    lessons.push({ date: e.date, time: t, status: "reposicao", counts: true, past: isPast(e.date, t), packageIndex: null, event: e });
  }

  lessons.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  let pkg = 0;
  let usedInPkg = 0;
  let used = 0;
  let coveredUntil: string | null = null;
  for (const l of lessons) {
    if (!l.counts) continue;
    if (l.past) used++;
    if (pkg < packages.length) {
      l.packageIndex = pkg;
      coveredUntil = l.date;
      if (++usedInPkg === packages[pkg].lessons) {
        pkg++;
        usedInPkg = 0;
      }
    }
  }

  return { lessons, credits, used, remaining: credits - used, coveredUntil };
}

/** Aulas para exibir: todas as passadas e as futuras até 8 semanas ou até a primeira sem pacote. */
export function visibleLessons(ledger: Ledger, today: string): Lesson[] {
  const horizon = addDays(today, 8 * 7);
  let shownUncovered = false;
  return ledger.lessons.filter((l) => {
    if (l.past) return true;
    if (l.date <= horizon) return true;
    if (l.counts && l.packageIndex === null && !shownUncovered) {
      shownUncovered = true;
      return true;
    }
    return l.packageIndex !== null;
  });
}
