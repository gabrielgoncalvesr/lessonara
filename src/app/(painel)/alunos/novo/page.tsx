import { Suspense } from "react";
import PanelLoading from "../../loading";
import Link from "next/link";
import { createStudent } from "../../actions";
import { StudentFields } from "../student-form";
import type { Plan } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default function NewStudentPage() {
  return <Suspense fallback={<PanelLoading />}><PageContent /></Suspense>;
}

async function PageContent() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("*").order("lessons");
  return (
    <main className="form-page space-y-6">
      <div><Link href="/alunos" className="mb-5 inline-block text-sm text-muted hover:text-fg">← Alunos</Link><p className="eyebrow">UMA NOVA JORNADA</p><h1 className="text-3xl font-semibold tracking-tight">Novo aluno</h1><p className="page-description">O primeiro passo para aulas bem organizadas.</p></div>
      <form action={createStudent} className="card space-y-6">
        <StudentFields plans={(plans ?? []) as Plan[]} />
        <div className="flex items-center gap-3"><button className="btn">Cadastrar aluno</button><Link href="/alunos" className="btn-ghost">Cancelar</Link></div>
      </form>
      <p className="text-sm text-muted">Depois de criar, cadastre o horário fixo e o primeiro pacote.</p>
    </main>
  );
}
