import type { Plan, Student } from "@/lib/data";
import { formatBRL } from "@/lib/dates";

export function StudentFields({ student, plans }: { student?: Student; plans: Plan[] }) {
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
          <select className="input" name="plan_id" defaultValue={student?.plan_id ?? plans[0]?.id ?? ""}>
            <option value="">Sem plano</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.lessons} aulas · {formatBRL(p.price)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Valor diferente (opcional)</label>
          <input className="input" name="price_override" type="number" placeholder="usa o valor do plano" defaultValue={student?.price_override ?? ""} />
        </div>
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea className="input" name="notes" rows={2} defaultValue={student?.notes ?? ""} />
      </div>
    </>
  );
}
