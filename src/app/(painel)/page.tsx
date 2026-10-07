import Link from "next/link";
import { getOrigin } from "@/lib/origin";
import { balanceTone } from "@/components/balance";
import { CopyButton } from "@/components/copy-button";
import { loadLedgers, type Student } from "@/lib/data";
import { formatDateLong } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("students").select("*").order("name");
  if (error) throw error;
  const students = data as Student[];
  const ledgers = await loadLedgers(supabase, students.map((s) => s.id));
  const origin = await getOrigin();

  const rows = students
    .map((s) => {
      const { ledger } = ledgers.get(s.id)!;
      const next = ledger.lessons.find((l) => !l.past && l.counts);
      return { s, ledger, next };
    })
    .sort((a, b) => Number(b.s.active) - Number(a.s.active) || a.ledger.remaining - b.ledger.remaining);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alunos</h1>
        <Link href="/alunos/novo" className="btn">+ Novo aluno</Link>
      </div>

      {rows.length === 0 && <p className="card text-sm text-muted">Nenhum aluno cadastrado ainda.</p>}

      <ul className="space-y-2">
        {rows.map(({ s, ledger, next }) => (
          <li key={s.id} className={`card flex flex-wrap items-center gap-3 ${s.active ? "" : "opacity-50"}`}>
            <Link href={`/alunos/${s.id}`} className="min-w-0 flex-1">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted">
                {s.plan} na semana
                {next && ` · próxima ${formatDateLong(next.date)} ${next.time}`}
                {!s.active && " · inativo"}
              </div>
            </Link>
            <div className="text-right">
              <div className={`text-xl font-semibold tabular-nums ${balanceTone(ledger.remaining)}`}>{ledger.remaining}</div>
              <div className="text-xs text-muted">restantes</div>
            </div>
            <CopyButton text={`${origin}/a/${s.slug}`} />
          </li>
        ))}
      </ul>
    </main>
  );
}
