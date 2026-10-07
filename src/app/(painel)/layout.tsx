import Link from "next/link";
import { signOut } from "../login/actions";

// Páginas dependem de sessão/banco a cada request.
export const instant = false;

export default function PainelLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex items-center gap-4 py-4">
        <Link href="/" className="text-lg font-semibold">Lessonara</Link>
        <nav className="ml-auto flex items-center gap-3 text-sm text-muted">
          <Link href="/config" className="hover:text-fg">Configurações</Link>
          <form action={signOut}>
            <button className="hover:text-fg">Sair</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
