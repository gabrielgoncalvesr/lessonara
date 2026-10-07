import { Suspense } from "react";
import Link from "next/link";
import PanelLoading from "./loading";
import { LessonCalendar } from "@/components/lesson-calendar";
import { Icon } from "@/components/icon";
import { loadTeacherOverview } from "@/lib/teacher-overview";
export default function Home() {
  return <Suspense fallback={<PanelLoading />}><Overview /></Suspense>;
}
async function Overview() {
  const { calendarLessons, today, time, range, rows, paymentRows } = await loadTeacherOverview(true);
  return <main><div className="page-heading"><div><p className="eyebrow">SUA ROTINA, ORGANIZADA</p><h1>Visão geral</h1><p className="page-description">Seu mês de aulas e os encontros do dia, em um só lugar.</p></div><Link href="/alunos/novo" className="btn"><Icon name="plus" className="h-4 w-4" />Novo aluno</Link></div><div className="overview-grid"><div className="stat-card"><div className="stat-top">Alunos ativos</div><div className="stat-value">{rows.filter((row) => row.active).length}</div><p>Aprendendo com você</p></div><div className="stat-card"><div className="stat-top">Aulas de hoje</div><div className="stat-value">{calendarLessons.filter((lesson) => lesson.date === today && lesson.status !== "desmarcada").length}</div><p>Horários atualizados ao carregar a página</p></div><Link href="/pagamentos" className="stat-card stat-renew"><div className="stat-top">Renovações para acompanhar</div><div className="stat-value">{paymentRows.filter((row) => row.remaining <= 2).length}</div><p>Pacotes com até 2 aulas restantes<Icon name="arrow" className="h-4 w-4" /></p></Link></div><LessonCalendar lessons={calendarLessons} today={today} time={time} {...range} /></main>;
}
