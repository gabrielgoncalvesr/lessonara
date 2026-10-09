import {ActionForm,SubmitButton} from "@/components/action-form";
import { getTranslator } from "@/lib/i18n/server";
import { BrowserPreferences } from "@/components/browser-preferences";
import { HolidaySettingsForm } from "@/components/holiday-settings";
import { loadHolidayRules } from "@/lib/holiday-data";
import { nowInTZ } from "@/lib/dates";
import { Suspense } from "react";
import PanelLoading from "../loading";
import { createPlan, deletePlan, updatePlan, updateTeacher } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";
import type { Plan, Teacher } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
async function PlanFields({ plan }: {
    plan?: Plan;
}) {
    const { t } = await getTranslator();
    return (<>
      <input className="input col-span-2 sm:col-span-1" name="name" aria-label={t("Nome do plano")} required placeholder={t("Nome (ex.: 1x por semana)")} defaultValue={plan?.name}/>
      <input className="input" name="lessons" aria-label={t("Aulas no pacote")} type="number" min={1} required placeholder={t("Aulas no pacote")} defaultValue={plan?.lessons}/>
      <input className="input" name="weekly_lessons" aria-label={t("Aulas por semana")} type="number" min={1} max={7} step={1} required placeholder={t("Aulas por semana")} defaultValue={plan?.weekly_lessons ?? 1}/>
      <input className="input" name="price" aria-label={t("Pre\u00E7o do plano em reais")} type="number" min={0} required placeholder={t("Pre\u00E7o (R$)")} defaultValue={plan?.price}/>
    </>);
}
export default function ConfigPage() {
    return <Suspense fallback={<PanelLoading />}><PageContent /></Suspense>;
}
async function PageContent() {
    const { t } = await getTranslator();
    const { supabase, userId } = await requireUser();
    const [{ data: teacher }, { data: plans }] = await Promise.all([
        supabase.from("teachers").select("*").eq("id", userId).single<Teacher>(),
        supabase.from("plans").select("*").order("lessons"),
    ]);
    const rules = await loadHolidayRules(supabase, [userId]);
    const settings = rules.settings[0] ?? null;
    const now = new Date();
    const locked = Boolean(settings?.lock_at && new Date(settings.lock_at) <= now);
    return (<main className="form-page space-y-6">
      <div><p className="eyebrow">{t("DO SEU JEITO")}</p><h1 className="text-3xl font-semibold tracking-tight">{t("Configura\u00E7\u00F5es")}</h1><p className="page-description">{t("Seu perfil e os planos que fazem sentido para suas aulas.")}</p></div>

      <ActionForm action={updateTeacher} className="card space-y-3">
        <div>
          <label className="label" htmlFor="teacher-name">{t("Seu nome (aparece para os alunos)")}</label>
          <input className="input" id="teacher-name" name="name" defaultValue={teacher?.name}/>
        </div>
        <SubmitButton className="btn">{t("Salvar")}</SubmitButton>
      </ActionForm>

      <BrowserPreferences />

      <HolidaySettingsForm key={`${settings?.enabled}-${settings?.policy}-${locked}`} settings={settings} holidays={rules.holidays} today={nowInTZ(now).today} locked={locked} ready={rules.ready}/>

      <section className="card space-y-3">
        <h2 className="h2">{t("Planos")}</h2>
        <p className="text-xs text-muted">{t("Defina separadamente as aulas do pacote e as aulas por semana. Mudar o pre\u00E7o n\u00E3o altera pagamentos j\u00E1 registrados.")}</p>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted max-sm:hidden">
          <span>{t("Nome")}</span><span>{t("Aulas no pacote")}</span><span>{t("Aulas por semana")}</span><span>{t("Pre\u00E7o (R$)")}</span>
        </div>
        {((plans ?? []) as Plan[]).map((p) => (<div key={p.id} className="flex gap-2">
            <ActionForm action={updatePlan.bind(null, p.id)} className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <PlanFields plan={p}/>
              <SubmitButton className="btn-ghost">{t("Salvar")}</SubmitButton>
            </ActionForm>
            <ActionForm action={deletePlan.bind(null, p.id)} className="flex items-start">
              <ConfirmButton message={t("Excluir o plano? Alunos nele ficam sem plano.")} className="btn-ghost">{t("\u2715")}</ConfirmButton>
            </ActionForm>
          </div>))}
        <ActionForm action={createPlan} className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <PlanFields />
          <SubmitButton className="btn">{t("+ Adicionar")}</SubmitButton>
        </ActionForm>
      </section>
    </main>);
}
