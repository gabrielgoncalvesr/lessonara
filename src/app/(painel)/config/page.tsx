import { updateTeacher } from "../actions";
import type { Teacher } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

export default async function ConfigPage() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("teachers").select("*").eq("id", userId).single();
  const t = data as Teacher;
  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <form action={updateTeacher} className="card space-y-3">
        <div>
          <label className="label">Seu nome (aparece pros alunos)</label>
          <input className="input" name="name" defaultValue={t.name} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Preço 1x/semana (4 aulas)</label>
            <input className="input" name="price_1x" type="number" defaultValue={t.price_1x} />
          </div>
          <div>
            <label className="label">Preço 2x/semana (8 aulas)</label>
            <input className="input" name="price_2x" type="number" defaultValue={t.price_2x} />
          </div>
        </div>
        <button className="btn">Salvar</button>
      </form>
    </main>
  );
}
