import type { Plan, Student } from "@/lib/data";
import { formatBRL } from "@/lib/dates";

export function StudentFields({ student, plans }: { student?: Student; plans: Plan[] }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="student-name">Nome</label>
          <input className="input" id="student-name" name="name" required defaultValue={student?.name} />
        </div>
        <div>
          <label className="label" htmlFor="student-email">Email (para lembretes)</label>
          <input className="input" id="student-email" name="email" type="email" defaultValue={student?.email ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="student-phone">Telefone / WhatsApp</label>
          <input className="input" id="student-phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" defaultValue={student?.phone ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="student-plan_id">Plano</label>
          <select className="input" id="student-plan_id" name="plan_id" defaultValue={student?.plan_id ?? plans[0]?.id ?? ""}>
            <option value="">Sem plano</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.lessons} aulas · {formatBRL(p.price)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="student-price_override">Valor diferente (opcional)</label>
          <input className="input" id="student-price_override" name="price_override" type="number" placeholder="usa o valor do plano" defaultValue={student?.price_override ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="student-notes">Observações</label>
        <textarea className="input" id="student-notes" name="notes" rows={2} defaultValue={student?.notes ?? ""} />
      </div>
    </>
  );
}
