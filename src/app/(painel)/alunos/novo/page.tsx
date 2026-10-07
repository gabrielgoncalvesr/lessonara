import { createStudent } from "../../actions";
import { StudentFields } from "../student-form";

export default function NewStudentPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Novo aluno</h1>
      <form action={createStudent} className="card space-y-3">
        <StudentFields />
        <button className="btn">Criar</button>
      </form>
      <p className="text-sm text-muted">Depois de criar, cadastre o horário fixo e o primeiro pacote.</p>
    </main>
  );
}
