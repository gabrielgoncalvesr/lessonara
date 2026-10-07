import { createPlan, deletePlan, updatePlan, updateTeacher } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";
import type { Plan, Teacher } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

function PlanFields({ plan }: { plan?: Plan }) {
  return (
    <>
      <input className="input col-span-2 sm:col-span-1" name="name" required placeholder="Nome (ex.: 1x por semana)" defaultValue={plan?.name} />
      <input className="input" name="lessons" type="number" min={1} required placeholder="Aulas no pacote" defaultValue={plan?.lessons} />
      <input className="input" name="price" type="number" min={0} required placeholder="Preço (R$)" defaultValue={plan?.price} />
    </>
  );
}

export default async function ConfigPage() {
  const { supabase, userId } = await requireUser();
  const [{ data: teacher }, { data: plans }] = await Promise.all([
    supabase.from("teachers").select("*").eq("id", userId).single<Teacher>(),
    supabase.from("plans").select("*").order("lessons"),
  ]);
  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <form action={updateTeacher} className="card space-y-3">
        <div>
          <label className="label">Seu nome (aparece pros alunos)</label>
          <input className="input" name="name" defaultValue={teacher?.name} />
        </div>
        <button className="btn">Salvar</button>
      </form>

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
