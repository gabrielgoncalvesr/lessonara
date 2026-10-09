import {getTranslator} from "@/lib/i18n/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { authorizedStudent } from "@/lib/student-access";
async function Legacy({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { slug } = await params;
    const student = await authorizedStudent(slug, "slug");
    return redirect(student ? `/student/portal/${student.id}` : "/student/login");
}
export default async function LegacyStudentLink(props: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { t } = await getTranslator();
    return <Suspense fallback={<p className="p-8" role="status">{t("Preparando seu acesso\u2026")}</p>}><Legacy {...props}/></Suspense>;
}
