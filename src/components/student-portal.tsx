"use client";

import { useState, type KeyboardEvent } from "react";
import { StudentMaterials } from "./student-materials";
import type { Material } from "@/lib/documents";
import { LessonHistory } from "./lesson-history";
import { LogoMark } from "./logo";
import { Icon } from "./icon";
import { Balance } from "./balance";
import { LessonList } from "./lesson-list";
import { LessonCalendar } from "./lesson-calendar";
import { calendarRange } from "@/lib/calendar";
import { formatDate, formatDateLong } from "@/lib/dates";
import type { Ledger, Package } from "@/lib/ledger";

const tabs = [{ id: "resumo", label: "Meu resumo", icon: "grid" as const }, { id: "calendario", label: "Calendário", icon: "calendar" as const }, { id: "materiais", label: "Materiais", icon: "book" as const }, { id: "historico", label: "Histórico e pacotes", icon: "book" as const }];

export function StudentPortal({ name, teacherName, ledger, packages, today, time, slug, materials }: { name: string; teacherName: string; ledger: Ledger; packages: Package[]; today: string; time: string; slug: string; materials: Material[] }) {
  const [tab, setTab] = useState("resumo");
  const upcoming = ledger.lessons.filter((lesson) => !lesson.past && lesson.counts);
  const next = upcoming[0];
  const history = ledger.lessons.filter((lesson) => lesson.past).slice().reverse();
  const range = calendarRange(today);
  const progress = ledger.credits > 0 ? Math.min(100, Math.round(ledger.used / ledger.credits * 100)) : 0;
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[nextIndex].id);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]");
    buttons?.[nextIndex].focus();
  }
  return (
    <div className="student-portal"><header className="portal-header"><div className="brand"><LogoMark className="h-8 w-8 text-accent" /><span>lessonara<span className="brand-dot">.</span></span></div><span className="portal-header-label">SEU ESPAÇO DE APRENDIZAGEM</span></header><main className="portal-content"><div className="portal-welcome"><div><p className="eyebrow">{teacherName ? `AULAS COM ${teacherName}` : "SUAS AULAS, EM UM SÓ LUGAR"}</p><h1>Olá, {name.trim().split(/\s+/)[0]}<span className="text-accent">.</span></h1><p className="page-description">Seu próximo encontro e sua jornada de aprendizagem.</p></div><span className="portal-name"><Icon name="users" className="h-4 w-4" />{name}</span></div><div className="portal-tabs" role="tablist" aria-label="Área do aluno">{tabs.map((item, index) => <button type="button" key={item.id} id={`tab-${item.id}`} role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} onKeyDown={(event) => tabKey(event, index)} onClick={() => setTab(item.id)}><Icon name={item.icon} className="h-4 w-4" />{item.label}</button>)}</div>
      {tab === "resumo" && <div id="panel-resumo" role="tabpanel" aria-labelledby="tab-resumo" className="space-y-6"><div className="portal-summary-grid"><section className="portal-next card"><p className="eyebrow">SEU PRÓXIMO ENCONTRO</p>{next ? <><h2>{formatDateLong(next.date)}</h2><p className="portal-next-time"><Icon name="clock" className="h-5 w-5" />{next.time}</p><p className="mt-4 text-sm text-muted">{teacherName ? `Uma nova aula com ${teacherName}.` : "Mais um passo na sua aprendizagem."}</p><button className="btn-ghost mt-6" onClick={() => setTab("calendario")}>Ver meu calendário<Icon name="arrow" className="ml-2 h-4 w-4" /></button></> : <><h2>Um novo encontro vem aí.</h2><p className="mt-4 text-sm leading-relaxed text-muted">Quando sua professora cadastrar um horário, sua próxima aula aparecerá aqui.</p></>}</section><section className="card portal-package"><p className="eyebrow">SUA JORNADA ATÉ AQUI</p><h2>{ledger.remaining > 0 ? "Tudo pronto para continuar." : "Vamos preparar as próximas aulas?"}</h2><p className="mt-3 text-sm leading-relaxed text-muted">{ledger.used} {ledger.used === 1 ? "aula utilizada" : "aulas utilizadas"} · {ledger.credits} aulas em pacotes pagos</p>{ledger.credits > 0 && <><div className="package-progress" role="progressbar" aria-label="Aulas utilizadas dos pacotes pagos" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-muted">{progress}% dos créditos utilizados{ledger.used > ledger.credits ? " · há aulas utilizadas além do saldo pago" : ""}</p></>}<div className="mt-6"><Balance ledger={ledger} /></div></section></div>{ledger.remaining <= 1 && <div className="portal-renew" role="status"><Icon name="book" className="h-5 w-5 shrink-0" /><div><p className="font-semibold">{ledger.remaining > 0 ? "Seu pacote está chegando ao fim." : "É hora de renovar seu pacote."}</p><p className="mt-1 text-xs leading-relaxed">{ledger.remaining < 0 ? `Há ${-ledger.remaining} aula(s) realizada(s) sem cobertura de um pacote.` : "Combine a renovação com sua professora para continuar suas aulas."}</p></div></div>}<section className="card"><div className="section-heading mb-4"><h2>Próximas aulas</h2><button className="portal-text-button" onClick={() => setTab("calendario")}>Ver calendário<Icon name="arrow" className="h-4 w-4" /></button></div><LessonList lessons={upcoming.slice(0, 5)} /></section></div>}
      {tab === "calendario" && <div id="panel-calendario" role="tabpanel" aria-labelledby="tab-calendario"><LessonCalendar today={today} time={time} {...range} lessons={ledger.lessons.filter((lesson) => lesson.date >= range.startDate && lesson.date <= range.endDate).map((lesson, index) => ({ id: String(index), date: lesson.date, time: lesson.time, status: lesson.status, name: teacherName ? `Aula com ${teacherName}` : "Sua aula", note: lesson.event?.note }))} /></div>}
      {tab === "materiais" && <div id="panel-materiais" role="tabpanel" aria-labelledby="tab-materiais"><StudentMaterials materials={materials} slug={slug} /></div>}
      {tab === "historico" && <div id="panel-historico" role="tabpanel" aria-labelledby="tab-historico" className="portal-history-grid"><section className="card"><h2 className="h2">Aulas anteriores</h2><LessonHistory lessons={history} packages={packages} /></section><section className="card"><h2 className="h2">Meus pacotes</h2>{packages.length ? <ul className="portal-packages">{packages.slice().sort((a, b) => b.paid_on.localeCompare(a.paid_on)).map((pack) => <li key={pack.id}><span className="stat-icon"><Icon name="book" className="h-4 w-4" /></span><div><p className="font-semibold">{pack.lessons} aulas</p><p className="mt-1 text-xs text-muted">Pagamento registrado em {formatDate(pack.paid_on)}</p></div><Icon name="check" className="ml-auto h-4 w-4 text-ok" /></li>)}</ul> : <p className="text-sm text-muted">Nenhum pacote registrado ainda.</p>}</section></div>}
      <footer className="portal-footer"><p><b>Falta:</b> aviso em cima da hora ou não compareceu; conta como aula. <b>Desmarcada:</b> avisada com antecedência; não conta.</p><span>Seu aprendizado, um encontro de cada vez.</span></footer></main></div>
  );
}
