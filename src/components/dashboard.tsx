"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { CopyButton } from "./copy-button";
import { formatDateLong } from "@/lib/dates";

type Row = { id: string; name: string; active: boolean; plan: string; remaining: number; credits: number; used: number; link: string; next: { date: string; time: string } | null };
type Upcoming = { studentId: string; name: string; date: string; time: string; status: string };
type Filter = "all" | "active" | "renew" | "inactive";
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).filter((_, i, all) => i === 0 || i === all.length - 1).join("").toUpperCase();
const filters: { id: Filter; label: string }[] = [{ id: "all", label: "Todos" }, { id: "active", label: "Ativos" }, { id: "renew", label: "A renovar" }, { id: "inactive", label: "Inativos" }];

export function Dashboard({ rows, upcoming, teacherName, today, directoryOnly = false }: { rows: Row[]; upcoming: Upcoming[]; teacherName: string; today: string; directoryOnly?: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const active = rows.filter((r) => r.active);
  const renew = active.filter((r) => r.remaining <= 1);
  const matches = rows.filter((r) => r.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) && (filter === "all" || (filter === "active" && r.active) || (filter === "renew" && r.active && r.remaining <= 1) || (filter === "inactive" && !r.active)));
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  const selectRenew = () => { setFilter("renew"); document.getElementById("alunos")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <main className="dashboard">
      <div className="page-heading"><div><p className="eyebrow">{directoryOnly ? "CADA ALUNO, UMA JORNADA" : "SUA ROTINA, ORGANIZADA"}</p><h1>{directoryOnly ? "Alunos" : <>Olá{teacherName ? `, ${teacherName.split(" ")[0]}` : ", professora"}<span className="text-accent">.</span></>}</h1><p className="page-description">{directoryOnly ? "Todos os seus alunos, planos e saldos em um só lugar." : "Um olhar sobre suas aulas e seus alunos."}</p></div><Link href="/alunos/novo" className="btn"><Icon name="plus" className="h-4 w-4" />Novo aluno</Link></div>
      {!directoryOnly && <div className="overview-grid">
        <div className="stat-card"><div className="stat-top"><span>Alunos ativos</span><span className="stat-icon"><Icon name="users" /></span></div><div className="stat-value">{active.length.toString().padStart(2, "0")}</div><p>Aprendendo com você</p></div>
        <Link href="/agenda" className="stat-card"><div className="stat-top"><span>Próximas aulas</span><span className="stat-icon stat-lilac"><Icon name="calendar" /></span></div><div className="stat-value">{upcoming.length.toString().padStart(2, "0")}</div><p>Nos próximos 7 dias<Icon name="arrow" className="h-4 w-4" /></p></Link>
        <button className="stat-card stat-renew" onClick={selectRenew}><div className="stat-top"><span>Pacotes a renovar</span><span className="stat-icon stat-peach"><Icon name="book" /></span></div><div className="stat-value">{renew.length.toString().padStart(2, "0")}</div><p>{renew.length ? "Ver alunos com até 1 aula restante" : "Tudo em dia por aqui"}<Icon name="arrow" className="h-4 w-4" /></p></button>
      </div>}
      <div className={directoryOnly ? "directory-content" : "dashboard-columns"}>
        <section id="alunos" className="students-panel card">
          <div className="section-heading"><div><h2>Seus alunos<span className="count-badge">{rows.length}</span></h2><p>Acompanhe cada jornada de perto.</p></div><Icon name="users" className="h-5 w-5 text-muted" /></div>
          <div className="student-tools"><div className="filter-tabs" aria-label="Filtrar alunos">{filters.map((f) => <button key={f.id} aria-pressed={filter === f.id} className={filter === f.id ? "filter-active" : ""} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div><label className="search-field"><Icon name="search" className="h-4 w-4" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno…" aria-label="Buscar aluno pelo nome" /></label></div>
          <div className="student-table-heading"><span>ALUNO / PLANO</span><span>PRÓXIMA AULA</span><span>SALDO DE AULAS</span><span /></div>
          <ul className="student-list">{matches.map((r, index) => <li key={r.id} className={`student-row ${!r.active ? "student-inactive" : ""}`}><Link href={`/alunos/${r.id}`} className="student-identity"><span className={`student-avatar avatar-${index % 4}`}>{initials(r.name)}</span><span className="min-w-0"><span className="student-name">{r.name}</span><span className="student-plan">{r.plan}{!r.active && " · Inativo"}</span></span></Link><div className="student-next">{r.next ? <><span>{formatDateLong(r.next.date)}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted"><Icon name="clock" className="h-3 w-3" />{r.next.time}</span></> : <span className="text-xs text-muted">Sem aula agendada</span>}</div><div className="student-balance"><span className={`balance-pill ${r.remaining <= 1 ? "balance-warning" : ""}`}>{r.remaining} {r.remaining === 1 ? "aula" : "aulas"}</span><span className="mt-1 block text-[11px] text-muted">{r.remaining < 0 ? "Renovação pendente" : r.remaining <= 1 ? "Hora de renovar" : "Disponíveis no pacote"}</span></div><div className="student-actions"><CopyButton text={r.link} label="Link do aluno" /><Link href={`/alunos/${r.id}`} className="row-arrow" aria-label={`Ver ${r.name}`}><Icon name="arrow" className="h-4 w-4" /></Link></div></li>)}</ul>
          {matches.length === 0 && <div className="empty-state"><span className="empty-icon"><Icon name="users" className="h-7 w-7" /></span><h3>{rows.length ? "Nenhum aluno por aqui" : "Toda jornada começa com o primeiro aluno"}</h3><p>{rows.length ? "Experimente outro nome ou filtro." : "Cadastre um aluno para organizar aulas, pacotes e pagamentos."}</p>{rows.length === 0 && <Link href="/alunos/novo" className="btn mt-5"><Icon name="plus" className="h-4 w-4" />Cadastrar primeiro aluno</Link>}</div>}
          <div className="table-footer">{matches.length} de {rows.length} {rows.length === 1 ? "aluno" : "alunos"}<span><span className="status-dot" />Tudo no seu ritmo</span></div>
        </section>
        {!directoryOnly && <aside className="agenda-panel card" aria-label="Próximas aulas"><div className="section-heading"><div><p className="eyebrow">NA SUA AGENDA</p><h2>Os próximos encontros</h2></div><Icon name="calendar" className="h-5 w-5 text-accent" /></div><p className="agenda-date">{dateLabel}</p>{upcoming.length ? <ul className="agenda-list">{upcoming.slice(0, 5).map((l) => <li key={`${l.studentId}-${l.date}-${l.time}-${l.status}`}><div className="agenda-time">{l.time}<span>{l.date === today ? "Hoje" : formatDateLong(l.date)}</span></div><Link href={`/alunos/${l.studentId}`}><span className="font-semibold">{l.name}</span><span className="mt-1 block text-xs text-muted">{l.status === "reposicao" ? "Aula de reposição" : "Aula agendada"}</span></Link></li>)}</ul> : <div className="agenda-empty"><Icon name="calendar" className="mb-3 h-8 w-8 text-accent" /><p className="font-medium">Espaço para novos encontros</p><p className="mt-2 text-xs leading-relaxed text-muted">As aulas dos próximos 7 dias aparecem aqui assim que você cadastrar os horários dos alunos.</p></div>}{upcoming.length > 5 && <p className="mt-3 text-xs text-muted">Mais {upcoming.length - 5} aulas nos próximos 7 dias. Veja os horários no perfil de cada aluno.</p>}<div className="agenda-tip"><span className="text-accent"><Icon name="check" className="h-4 w-4" /></span><p>Cada aluno tem um link para acompanhar suas próprias aulas.</p></div></aside>}
      </div>
    </main>
  );
}
