import type { ReactNode } from "react";
import { HistoryTabs } from "./history-tabs";
import { LessonList } from "./lesson-list";
import { formatDate } from "@/lib/dates";
import { sortPackages, type Lesson, type Package } from "@/lib/ledger";

function Groups({ lessons, packages, actions, grouping }: { lessons: Lesson[]; packages: Package[]; actions?: (lesson: Lesson) => ReactNode; grouping: "month" | "package" }) {
  const groups = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const key = grouping === "month" ? lesson.date.slice(0, 7) : lesson.packageId ?? "uncovered";
    groups.set(key, [...(groups.get(key) ?? []), lesson]);
  }
  const ordered = sortPackages(packages);
  const entries = grouping === "month" ? [...groups].sort(([a], [b]) => b.localeCompare(a)) : [...groups].sort(([a], [b]) => (b === "uncovered" ? -1 : a === "uncovered" ? 1 : ordered.findIndex((pack) => pack.id === b) - ordered.findIndex((pack) => pack.id === a)));
  return <div>{entries.length ? entries.map(([key, entries], index) => {
    const pack = ordered.find((pack) => pack.id === key);
    const title = grouping === "month" ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T12:00:00Z`)) : pack ? `Pacote de ${pack.lessons} aulas · ${formatDate(pack.paid_on)}` : "Aulas sem pacote / desmarcadas";
    return <details key={`${grouping}-${key}`} open={index === 0} className="history-group"><summary><span>{title}</span><span className="count-badge">{entries.length}</span></summary>{pack && <p className="mb-3 text-[10px] text-muted">Referência do pacote: {pack.id.slice(0, 8)}</p>}<LessonList lessons={entries.slice().sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))} actions={actions} /></details>;
  }) : <p className="py-4 text-sm text-muted">Nenhuma aula anterior.</p>}{grouping === "package" && <p className="mt-4 text-xs leading-relaxed text-muted">Reposições usam o próximo crédito disponível. Aulas desmarcadas não consomem créditos; a distribuição é recalculada quando o histórico muda.</p>}</div>;
}

export function LessonHistory({ lessons, packages, actions }: { lessons: Lesson[]; packages: Package[]; actions?: (lesson: Lesson) => ReactNode }) {
  return <HistoryTabs monthContent={<Groups lessons={lessons} packages={packages} actions={actions} grouping="month" />} packageContent={<Groups lessons={lessons} packages={packages} actions={actions} grouping="package" />} />;
}
