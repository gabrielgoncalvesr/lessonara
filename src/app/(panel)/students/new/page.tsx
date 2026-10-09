import {ActionForm,SubmitButton} from "@/components/action-form";
import { getTranslator } from "@/lib/i18n/server";
import { Suspense } from "react";
import PanelLoading from "../../loading";
import Link from "next/link";
import { createStudent } from "../../actions";
import { StudentFields } from "../student-form";
import type { Plan } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
export default function NewStudentPage() {
    return <Suspense fallback={<PanelLoading />}><PageContent /></Suspense>;
}
async function PageContent() {
    const { t } = await getTranslator();
    const supabase = await createClient();
    const { data: plans } = await supabase.from("plans").select("*").order("lessons");
    return (<main className="form-page space-y-6">
      <div><Link href="/students" className="mb-5 inline-block text-sm text-muted hover:text-fg">{t("\u2190 Alunos")}</Link><p className="eyebrow">{t("UMA NOVA JORNADA")}</p><h1 className="text-3xl font-semibold tracking-tight">{t("Novo aluno")}</h1><p className="page-description">{t("O primeiro passo para aulas bem organizadas.")}</p></div>
      <ActionForm action={createStudent} className="card space-y-6">
        <StudentFields plans={(plans ?? []) as Plan[]}/>
        <div className="flex items-center gap-3"><SubmitButton className="btn">{t("Cadastrar aluno")}</SubmitButton><Link href="/students" className="btn-ghost">{t("Cancelar")}</Link></div>
      </ActionForm>
      <p className="text-sm text-muted">{t("Depois de criar, cadastre o hor\u00E1rio fixo e o primeiro pacote.")}</p>
    </main>);
}
