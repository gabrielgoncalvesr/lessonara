import {getTranslator} from "@/lib/i18n/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { StudentLogin } from "@/components/student-login";
import {cookies} from "next/headers";
import { CHALLENGE_COOKIE, getStudentSession } from "@/lib/student-access";
async function Login() {
    if (await getStudentSession())
        redirect("/student");
    return <StudentLogin initialPhase={(await cookies()).has(CHALLENGE_COOKIE)?"code":"email"} />;
}
export default async function StudentLoginPage() {
    const { t } = await getTranslator();
    return <Suspense fallback={<p className="p-8" role="status">{t("Preparando seu acesso\u2026")}</p>}><Login /></Suspense>;
}
