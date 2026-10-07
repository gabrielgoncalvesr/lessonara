import { Suspense } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { PanelNav, PanelNavFallback } from "@/components/panel-nav";
import { Icon } from "@/components/icon";
import { signOut } from "../login/actions";

export default function PainelLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-shell">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <aside className="sidebar">
        <Link href="/" className="brand"><LogoMark className="h-9 w-9 text-accent" /><span>lessonara<span className="brand-dot">.</span></span></Link>
        <p className="sidebar-label">SEU ESPAÇO DE ENSINO</p>
        <Suspense fallback={<PanelNavFallback />}><PanelNav /></Suspense>
        <div className="sidebar-bottom"><div className="teacher-avatar"><Icon name="book" /></div><div className="flex-1"><p className="text-sm font-semibold">Área da professora</p><p className="mt-0.5 text-xs text-muted">Seu dia, mais leve</p></div><form action={signOut}><button className="signout" aria-label="Sair da conta" title="Sair da conta"><Icon name="logout" className="h-4 w-4" /></button></form></div>
      </aside>
      <div className="workspace">
        <header className="workspace-header"><span><span className="text-muted">Meu espaço</span><span className="mx-3 text-line">/</span><span className="font-medium">Gestão de aulas</span></span><span className="header-tag"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Feito para ensinar</span></header>
        <div id="conteudo" className="workspace-content">{children}</div>
        <footer className="workspace-footer">Lessonara<span>Um pouco de organização. Muito mais espaço para ensinar.</span></footer>
      </div>
    </div>
  );
}
