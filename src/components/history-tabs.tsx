"use client";
import { useState, type ReactNode } from "react";
export function HistoryTabs({ monthContent, packageContent }: { monthContent: ReactNode; packageContent: ReactNode }) {
  const [grouping, setGrouping] = useState<"month" | "package">("month");
  return <div><div className="history-controls"><span className="text-xs text-muted">Agrupar aulas por</span><div className="filter-tabs"><button type="button" aria-pressed={grouping === "month"} className={grouping === "month" ? "filter-active" : ""} onClick={() => setGrouping("month")}>Mês</button><button type="button" aria-pressed={grouping === "package"} className={grouping === "package" ? "filter-active" : ""} onClick={() => setGrouping("package")}>Pacote</button></div></div><div key={grouping}>{grouping === "month" ? monthContent : packageContent}</div></div>;
}
