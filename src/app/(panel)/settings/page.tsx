import {GoogleIntegration} from "@/components/google-integration";
import {googleConfigured} from "@/lib/google/calendar";
import {PlanFields} from "@/components/plan-fields";
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
    const google=await supabase.from("google_calendar_connections").select("teacher_id,last_error").eq("teacher_id",userId).maybeSingle();
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

      <BrowserPreferences /><GoogleIntegration configured={googleConfigured()} connected={Boolean(google.data)} error={google.data?.last_error}/>

      <HolidaySettingsForm key={`${settings?.enabled}-${settings?.policy}-${locked}`} settings={settings} holidays={rules.holidays} today={nowInTZ(now).today} locked={locked} ready={rules.ready}/>

      <section className="card space-y-3">
        <h2 className="h2">{t("Planos")}</h2>
        <p className="text-xs text-muted">{t("Defina separadamente as aulas do pacote e as aulas por semana. Mudar o pre\u00E7o n\u00E3o altera pagamentos j\u00E1 registrados.")}</p>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted max-sm:hidden">

        </div>
        {((plans ?? []) as Plan[]).map((p) => (<div key={p.id} className="flex gap-2 plan-row">
            <ActionForm action={updatePlan.bind(null, p.id)} className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
              <PlanFields plan={p}/>
              <SubmitButton className="btn-ghost">{t("Salvar")}</SubmitButton>
            </ActionForm>
            <ActionForm action={deletePlan.bind(null, p.id)} className="flex items-start">
              <ConfirmButton message={t("Excluir o plano? Alunos nele ficam sem plano.")} className="btn-ghost">{t("Excluir")}</ConfirmButton>
            </ActionForm>
          </div>))}
        <ActionForm action={createPlan} className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
          <PlanFields />
          <SubmitButton className="btn">{t("+ Adicionar")}</SubmitButton>
        </ActionForm>
      </section>
    </main>);
}
