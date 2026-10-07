import { ScheduleForm } from "@/components/schedule-form";
import { weeklyScheduleLimit } from "@/lib/schedule-rules";
import { TimeField } from "@/components/time-field";
import { LessonHistory } from "@/components/lesson-history";
import { Suspense } from "react";
import PanelLoading from "../../loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Balance } from "@/components/balance";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { LessonList } from "@/components/lesson-list";
import { loadLedgers, studentPrice, type Plan, type Student } from "@/lib/data";
import { formatBRL, formatDate, WEEKDAYS } from "@/lib/dates";
import { sortPackages, visibleLessons } from "@/lib/ledger";
import { getOrigin } from "@/lib/origin";
import { requireUser } from "@/lib/supabase/server";
import {
  addPackage,
  addReposicao,
  deleteEvent,
  deletePackage,
  deleteStudent,
  endSchedule,
  markLesson,
  regenerateLink,
  updateStudent,
} from "../../actions";
import { StudentFields } from "../student-form";

export default function StudentPage({ params }: PageProps<"/alunos/[id]">) {
  return <Suspense fallback={<PanelLoading />}><StudentContent params={params} /></Suspense>;
}

async function StudentContent({ params }: Pick<PageProps<"/alunos/[id]">, "params">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: student }, { data: plansData }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle<Student>(),
    supabase.from("plans").select("*").order("lessons"),
  ]);
  if (!student) notFound();
  const plans = (plansData ?? []) as Plan[];
  const plan = plans.find((p) => p.id === student.plan_id);

  const { ledger, schedules, packages, today } = (await loadLedgers(supabase, [id])).get(id)!;
  const scheduleLimit = weeklyScheduleLimit(sortPackages(packages).at(-1)?.lessons ?? plan?.lessons);
  const lessons = visibleLessons(ledger, today);
  const upcoming = lessons.filter((l) => !l.past);
  const history = lessons.filter((l) => l.past).reverse();
  const link = `${(await getOrigin())}/a/${student.slug}`;

  const lessonActions = (l: (typeof lessons)[number]) =>
    l.event ? (
      <form action={deleteEvent.bind(null, id, l.event.id)}>
        <button className="btn-xs">desfazer</button>
      </form>
    ) : (
      <>
        <form action={markLesson.bind(null, id, l.date, l.time, "falta")}>
          <button className="btn-xs" title="Avisou em cima da hora ou não veio: conta como aula">falta</button>
        </form>
        <form action={markLesson.bind(null, id, l.date, l.time, "desmarcada")}>
          <button className="btn-xs" title="Avisou com antecedência ou professora cancelou: não conta">desmarcar</button>
        </form>
      </>
    );

  return (
    <main className="space-y-6">
      <div className="detail-heading flex flex-wrap items-center gap-3">
        <Link href="/alunos" className="text-sm text-muted hover:text-fg">← Alunos</Link>
        <h1 className="w-full text-xl font-semibold">{student.name}</h1>
        <code className="truncate rounded bg-surface px-2 py-1 text-xs text-muted">{link}</code>
        <CopyButton text={link} />
        <Link href={`/a/${student.slug}`} target="_blank" className="btn-xs">abrir</Link>
      </div>

      <Balance ledger={ledger} />

      <div className="detail-grid">
      <section className="card">
        <h2 className="h2">Próximas aulas</h2>
        <LessonList lessons={upcoming} actions={lessonActions} />
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-accent">+ Lançar reposição</summary>
          <form action={addReposicao.bind(null, id)} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input className="input" name="date" type="date" required defaultValue={today} />
            <TimeField id="reposicao-time" />
            <input className="input" name="note" placeholder="observação" />
            <button className="btn">Adicionar</button>
          </form>
        </details>
      </section>

      <section className="card">
        <h2 className="h2">Histórico</h2>
        <LessonHistory lessons={history} packages={packages} actions={lessonActions} />
      </section>

      <section id="pagamentos" className="card space-y-3 scroll-mt-6">
        <h2 className="h2">Pacotes pagos</h2>
        {packages.length === 0 && <p className="text-sm text-muted">Nenhum pagamento registrado.</p>}
        <ul className="divide-y divide-line text-sm">
          {[...packages]
            .sort((a, b) => b.paid_on.localeCompare(a.paid_on))
            .map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="tabular-nums">{formatDate(p.paid_on)}</span>
                <span>{p.lessons} aulas</span>
                <span className="text-muted">{formatBRL(p.amount)}</span>
                <form action={deletePackage.bind(null, id, p.id)} className="ml-auto">
                  <ConfirmButton message="Remover esse pagamento?">remover</ConfirmButton>
                </form>
              </li>
            ))}
        </ul>
        <form action={addPackage.bind(null, id)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="label">Pago em</label>
            <input className="input" name="paid_on" type="date" required defaultValue={today} />
          </div>
          <div>
            <label className="label">Aulas</label>
            <input className="input" name="lessons" type="number" min={1} required defaultValue={plan?.lessons} />
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input className="input" name="amount" type="number" required defaultValue={studentPrice(student, plan)} />
          </div>
          <div className="flex items-end">
            <button className="btn w-full">Registrar pagamento</button>
          </div>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Horário fixo</h2>
        <ul className="divide-y divide-line text-sm">
          {schedules.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-medium">{WEEKDAYS[s.weekday]} {s.time}</span>
              <span className="text-muted">
                desde {formatDate(s.starts_on)}
                {s.ends_on && ` até ${formatDate(s.ends_on)}`}
              </span>
              <span className="ml-auto flex gap-1">
                {!s.ends_on && (
                  <form action={endSchedule.bind(null, id, s.id)} className="flex gap-1">
                    <input className="input py-1 text-xs" name="ends_on" type="date" required defaultValue={today} />
                    <button className="btn-xs" title="Última aula nesse horário">encerrar</button>
                  </form>
                )}

              </span>
            </li>
          ))}
        </ul>
        <ScheduleForm studentId={id} schedules={schedules} limit={scheduleLimit} today={today} />
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Dados do aluno</h2>
        <form action={updateStudent.bind(null, id)} className="space-y-3">
          <StudentFields student={student} plans={plans} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={student.active} /> Ativo (recebe lembretes)
          </label>
          <button className="btn">Salvar</button>
        </form>
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <form action={regenerateLink.bind(null, id)}>
            <ConfirmButton message="O link antigo vai parar de funcionar. Continuar?">gerar novo link</ConfirmButton>
          </form>
          <form action={deleteStudent.bind(null, id)}>
            <ConfirmButton message="Excluir o aluno e todo o histórico? Não tem volta." className="btn-xs text-bad">excluir aluno</ConfirmButton>
          </form>
        </div>
      </section>
      </div>
    </main>
  );
}
