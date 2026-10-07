import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { StudentPortal } from "@/components/student-portal";
import { LogoMark } from "@/components/logo";
import { nowInTZ } from "@/lib/dates";
import { loadLedgers, type Student } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minhas aulas · Lessonara", robots: { index: false, follow: false } };

function PortalLoading() {
  return <div className="portal-content py-12" role="status"><LogoMark className="mb-8 h-9 w-9 text-accent" /><p className="eyebrow">SEU ESPAÇO DE APRENDIZAGEM</p><h1 className="text-2xl font-semibold">Preparando suas aulas…</h1><div aria-hidden="true" className="card mt-8 space-y-6 motion-safe:animate-pulse"><div className="h-5 w-1/2 rounded bg-line" /><div className="h-4 w-2/3 rounded bg-line" /><div className="h-4 w-1/3 rounded bg-line" /></div></div>;
}

export default function StudentPublicPage({ params }: PageProps<"/a/[slug]">) {
  return <Suspense fallback={<PortalLoading />}><StudentContent params={params} /></Suspense>;
}

async function StudentContent({ params }: Pick<PageProps<"/a/[slug]">, "params">) {
  await connection();
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: student, error } = await supabase.from("students").select("*, teachers(name)").eq("slug", slug).maybeSingle<Student & { teachers: { name: string } | null }>();
  if (error) throw error;
  if (!student) notFound();
  const { ledger, packages, today } = (await loadLedgers(supabase, [student.id])).get(student.id)!;
  return <StudentPortal name={student.name} teacherName={student.teachers?.name ?? ""} ledger={ledger} packages={packages} today={today} time={nowInTZ().time} />;
}
