import { Suspense } from "react";
import PanelLoading from "../loading";
import { Dashboard } from "@/components/dashboard";
import { loadTeacherOverview } from "@/lib/teacher-overview";

export default function StudentsPage() {
  return <Suspense fallback={<PanelLoading />}><PageContent /></Suspense>;
}

async function PageContent() {
  return <Dashboard directoryOnly {...await loadTeacherOverview()} />;
}
