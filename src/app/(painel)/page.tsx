import { Suspense } from "react";
import { DashboardLoading } from "@/components/dashboard-loading";
import { Dashboard } from "@/components/dashboard";
import { loadTeacherOverview } from "@/lib/teacher-overview";

export default function Home() {
  return <Suspense fallback={<DashboardLoading />}><Overview /></Suspense>;
}

async function Overview() {
  return <Dashboard {...await loadTeacherOverview()} />;
}
