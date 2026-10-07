import type { Student } from "@/lib/data";

export function StudentFields({ student }: { student?: Student }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nome</label>
          <input className="input" name="name" required defaultValue={student?.name} />
        </div>
        <div>
          <label className="label">Email (pra lembretes)</label>
          <input className="input" name="email" type="email" defaultValue={student?.email ?? ""} />
        </div>
        <div>
          <label className="label">Plano</label>
          <select className="input" name="plan" defaultValue={student?.plan ?? "1x"}>
            <option value="1x">1x por semana (4 aulas)</option>
            <option value="2x">2x por semana (8 aulas)</option>
          </select>
        </div>
        <div>
          <label className="label">Valor diferente (opcional)</label>
          <input className="input" name="price_override" type="number" placeholder="usa o padrão do plano" defaultValue={student?.price_override ?? ""} />
        </div>
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea className="input" name="notes" rows={2} defaultValue={student?.notes ?? ""} />
      </div>
    </>
  );
}
