import { Suspense } from "react";
import PanelLoading from "../loading";
import { LessonCalendar } from "@/components/lesson-calendar";
import { loadTeacherOverview } from "@/lib/teacher-overview";

export default function AgendaPage() {
  return <Suspense fallback={<PanelLoading />}><PageContent /></Suspense>;
}

async function PageContent() {
  const { calendarLessons, today, range } = await loadTeacherOverview(true);
  return <main><div className="page-heading"><div><p className="eyebrow">UM ENCONTRO DE CADA VEZ</p><h1>Sua agenda</h1><p className="page-description">O mês inteiro à vista. Selecione um dia para acompanhar todas as aulas.</p></div></div><LessonCalendar lessons={calendarLessons} today={today} {...range} /></main>;
}
