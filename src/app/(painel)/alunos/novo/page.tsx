import { createStudent } from "../../actions";
import { StudentFields } from "../student-form";
import type { Plan } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("*").order("lessons");
  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Novo aluno</h1>
      <form action={createStudent} className="card space-y-3">
        <StudentFields plans={(plans ?? []) as Plan[]} />
        <button className="btn">Criar</button>
      </form>
      <p className="text-sm text-muted">Depois de criar, cadastre o horário fixo e o primeiro pacote.</p>
    </main>
  );
}
