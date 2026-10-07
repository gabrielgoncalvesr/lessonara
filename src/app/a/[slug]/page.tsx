import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Balance } from "@/components/balance";
import { LessonList } from "@/components/lesson-list";
import { loadLedgers, type Student } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { visibleLessons } from "@/lib/ledger";
import { createAdminClient } from "@/lib/supabase/server";

// Páginas dependem de sessão/banco a cada request.
export const instant = false;

export const metadata: Metadata = { title: "Minhas aulas · Lessonara", robots: { index: false, follow: false } };

export default async function StudentPublicPage({ params }: PageProps<"/a/[slug]">) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: student } = await supabase
    .from("students")
    .select("*, teachers(name)")
    .eq("slug", slug)
    .maybeSingle<Student & { teachers: { name: string } }>();
  if (!student) notFound();

  const { ledger, packages, today } = (await loadLedgers(supabase, [student.id])).get(student.id)!;
  const lessons = visibleLessons(ledger, today);
  const upcoming = lessons.filter((l) => !l.past);
  const history = lessons.filter((l) => l.past).reverse();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header>
        <p className="text-sm text-muted">{student.teachers.name ? `Aulas com ${student.teachers.name}` : "Minhas aulas"}</p>
        <h1 className="text-2xl font-semibold">{student.name}</h1>
      </header>

      <Balance ledger={ledger} />

      {ledger.remaining <= 1 && (
        <p className={`card text-sm ${ledger.remaining < 0 ? "text-bad" : "text-warn"}`}>
          {ledger.remaining < 0
            ? `Você tem ${-ledger.remaining} aula(s) dada(s) sem pacote pago. Hora de renovar!`
            : ledger.remaining === 0
              ? "Seu pacote acabou. Hora de renovar!"
              : "Falta 1 aula para acabar seu pacote. Hora de renovar!"}
        </p>
      )}

      <section className="card">
        <h2 className="h2">Próximas aulas</h2>
        <LessonList lessons={upcoming} />
      </section>

      <section className="card">
        <h2 className="h2">Aulas anteriores</h2>
        <LessonList lessons={history} />
      </section>

      {packages.length > 0 && (
        <section className="card">
          <h2 className="h2">Pagamentos</h2>
          <ul className="divide-y divide-line text-sm">
            {[...packages]
              .sort((a, b) => b.paid_on.localeCompare(a.paid_on))
              .map((p) => (
                <li key={p.id} className="flex gap-3 py-2">
                  <span className="tabular-nums">{formatDate(p.paid_on)}</span>
                  <span>{p.lessons} aulas</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <footer className="text-xs text-muted">
        <p><b>Falta</b>: aviso em cima da hora ou não compareceu. Conta como aula.</p>
        <p><b>Desmarcada</b>: avisada com antecedência. Não conta.</p>
      </footer>
    </main>
  );
}
