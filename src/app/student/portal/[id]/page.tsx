import {ActionForm,SubmitButton} from "@/components/action-form";
import { getTranslator } from "@/lib/i18n/server";
import { loadActivities } from "@/lib/activities";
import { loadStudentShares } from "@/lib/documents";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { authorizedStudent } from "@/lib/student-access";
import { studentSignOut } from "@/app/student/login/actions";
import { notFound, redirect } from "next/navigation";
import { StudentPortal } from "@/components/student-portal";
import { LogoMark } from "@/components/logo";
import { nowInTZ } from "@/lib/dates";
import { loadLedgers, type Student } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Minhas aulas · Lessonara", robots: { index: false, follow: false } };
async function PortalLoading() {
    const { t } = await getTranslator();
    return <div className="portal-content py-12" role="status"><LogoMark className="mb-8 h-9 w-9 text-accent"/><p className="eyebrow">{t("SEU ESPA\u00C7O DE APRENDIZAGEM")}</p><h1 className="text-2xl font-semibold">{t("Preparando suas aulas\u2026")}</h1><div aria-hidden="true" className="card mt-8 space-y-6 motion-safe:animate-pulse"><div className="h-5 w-1/2 rounded bg-line"/><div className="h-4 w-2/3 rounded bg-line"/><div className="h-4 w-1/3 rounded bg-line"/></div></div>;
}
export default function StudentPublicPage({ params }: PageProps<"/student/portal/[id]">) {
    return <Suspense fallback={<PortalLoading />}><StudentContent params={params}/></Suspense>;
}
async function StudentContent({ params }: Pick<PageProps<"/student/portal/[id]">, "params">) {
    const { t } = await getTranslator();
    await connection();
    const { id } = await params;
    const access = await authorizedStudent(id);
    if (!access)
        redirect("/student/login");
    const supabase = createAdminClient();
    const { data: student, error } = await supabase.from("students").select("*, teachers(name)").eq("id", access.id).eq("teacher_id", access.teacher_id).maybeSingle<Student & {
        teachers: {
            name: string;
        } | null;
    }>();
    if (error)
        throw error;
    if (!student)
        notFound();
    const { ledger, packages, today } = (await loadLedgers(supabase, [student.id])).get(student.id)!;
    const [shared, assigned] = await Promise.all([loadStudentShares(supabase, student.id, student.teacher_id, today, true), loadActivities(supabase, student.teacher_id, student.id)]);
    const materials = shared.shares.map(({ id, title, subject, fileName, byteSize, expiresOn }) => ({ id, title, subject, fileName, byteSize, expiresOn }));
    const activities = assigned.activities.map(({ studentId, studentName, documentId, ...activity }) => { void studentId; void studentName; void documentId; return activity; });
    return <><div className="portal-content pt-6 flex justify-end"><ActionForm action={studentSignOut}><SubmitButton className="btn-xs">{t("Sair da minha conta")}</SubmitButton></ActionForm></div><StudentPortal activities={activities} slug={student.id} materials={materials} name={student.name} teacherName={student.teachers?.name ?? ""} ledger={ledger} packages={packages} today={today} time={nowInTZ().time}/></>;
}
