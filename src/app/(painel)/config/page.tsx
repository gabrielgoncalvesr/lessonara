import { HolidaySettingsForm } from "@/components/holiday-settings";
import { loadHolidayRules } from "@/lib/holiday-data";
import { nowInTZ } from "@/lib/dates";
import { Suspense } from "react";
import PanelLoading from "../loading";
import { createPlan, deletePlan, updatePlan, updateTeacher } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";
import type { Plan, Teacher } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

function PlanFields({ plan }: { plan?: Plan }) {
  return (
    <>
      <input className="input col-span-2 sm:col-span-1" name="name" aria-label="Nome do plano" required placeholder="Nome (ex.: 1x por semana)" defaultValue={plan?.name} />
      <input className="input" name="lessons" aria-label="Aulas no pacote" type="number" min={1} required placeholder="Aulas no pacote" defaultValue={plan?.lessons} />
      <input className="input" name="price" aria-label="Preço do plano em reais" type="number" min={0} required placeholder="Preço (R$)" defaultValue={plan?.price} />
    </>
  );
}

export default function ConfigPage() {
  return <Suspense fallback={<PanelLoading />}><PageContent /></Suspense>;
}

async function PageContent() {
  const { supabase, userId } = await requireUser();
  const [{ data: teacher }, { data: plans }] = await Promise.all([
    supabase.from("teachers").select("*").eq("id", userId).single<Teacher>(),
    supabase.from("plans").select("*").order("lessons"),
  ]);
  const rules = await loadHolidayRules(supabase, [userId]);
  const settings = rules.settings[0] ?? null;
  const now = new Date();
  const locked = Boolean(settings?.lock_at && new Date(settings.lock_at) <= now);
  return (
    <main className="form-page space-y-6">
      <div><p className="eyebrow">DO SEU JEITO</p><h1 className="text-3xl font-semibold tracking-tight">Configurações</h1><p className="page-description">Seu perfil e os planos que fazem sentido para suas aulas.</p></div>

      <form action={updateTeacher} className="card space-y-3">
        <div>
          <label className="label" htmlFor="teacher-name">Seu nome (aparece para os alunos)</label>
          <input className="input" id="teacher-name" name="name" defaultValue={teacher?.name} />
        </div>
        <button className="btn">Salvar</button>
      </form>

      <HolidaySettingsForm key={`${settings?.enabled}-${settings?.policy}-${locked}`} settings={settings} holidays={rules.holidays} today={nowInTZ(now).today} locked={locked} ready={rules.ready} />

      <section className="card space-y-3">
        <h2 className="h2">Planos</h2>
        <p className="text-xs text-muted">Pacote de N aulas por um preço. Mudar o preço não altera pagamentos já registrados.</p>
        <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted max-sm:hidden">
          <span>Nome</span><span>Aulas no pacote</span><span>Preço (R$)</span>
        </div>
        {((plans ?? []) as Plan[]).map((p) => (
          <div key={p.id} className="flex gap-2">
            <form action={updatePlan.bind(null, p.id)} className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <PlanFields plan={p} />
              <button className="btn-ghost">Salvar</button>
            </form>
            <form action={deletePlan.bind(null, p.id)} className="flex items-start">
              <ConfirmButton message="Excluir o plano? Alunos nele ficam sem plano." className="btn-ghost">✕</ConfirmButton>
            </form>
          </div>
        ))}
        <form action={createPlan} className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <PlanFields />
          <button className="btn">+ Adicionar</button>
        </form>
      </section>
    </main>
  );
}
