"use client";

import { useActionState } from "react";
import { LogoMark } from "@/components/logo";
import { signIn } from "./actions";

const FEATURES = [
  { title: "Agenda fixa", text: "Cadastre o horário uma vez. As aulas aparecem sozinhas." },
  { title: "Saldo sempre certo", text: "Faltas, remarcações e reposições entram na conta." },
  { title: "Link pro aluno", text: "Cada aluno acompanha as próprias aulas, sem login." },
  { title: "Lembrete automático", text: "Email quando o pacote está acabando." },
];

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-accent p-12 text-accent-fg lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <LogoMark className="h-9 w-9 text-accent-fg" />
          <span className="text-xl font-semibold tracking-tight">Lessonara</span>
        </div>

        <div className="my-auto max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Suas aulas, sem perder a conta.
          </h1>
          <ul className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-fg/70" />
                <div>
                  <div className="font-medium">{f.title}</div>
                  <div className="text-sm opacity-75">{f.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full border-[48px] border-accent-fg/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 right-24 h-40 w-40 rounded-full border-[24px] border-accent-fg/10" />
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-9 w-9 text-accent" />
            <span className="text-xl font-semibold tracking-tight">Lessonara</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
          <p className="mt-1 text-sm text-muted">Acesse o painel das suas aulas.</p>

          <form action={action} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input className="input py-2.5" id="email" name="email" type="email" required autoComplete="email" autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <input className="input py-2.5" id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            <button className="btn w-full py-2.5" disabled={pending}>
              {pending ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted">
            É aluno? Use o link que sua professora enviou.
          </p>
        </div>
      </section>
    </main>
  );
}
