import {ActionForm,SubmitButton} from "@/components/action-form";
import { getTranslator } from "@/lib/i18n/server";
import { Suspense } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { PanelNav, PanelNavFallback } from "@/components/panel-nav";
import { Icon } from "@/components/icon";
import { signOut } from "../login/actions";
export default async function PainelLayout({ children }: LayoutProps<"/">) {
    const { t } = await getTranslator();
    return (<div className="app-shell">
      <a href="#content" className="skip-link">{t("Pular para o conte\u00FAdo")}</a>
      <aside className="sidebar">
        <Link href="/" className="brand"><LogoMark className="h-9 w-9 text-accent"/><span>{t("lessonara")}<span className="brand-dot">{t(".")}</span></span></Link>
        <p className="sidebar-label">{t("SEU ESPA\u00C7O DE ENSINO")}</p>
        <Suspense fallback={<PanelNavFallback />}><PanelNav /></Suspense>
        <div className="sidebar-bottom"><div className="teacher-avatar"><Icon name="book"/></div><div className="flex-1"><p className="text-sm font-semibold">{t("\u00C1rea da professora")}</p><p className="mt-0.5 text-xs text-muted">{t("Seu dia, mais leve")}</p></div><ActionForm action={signOut}><SubmitButton className="signout" aria-label={t("Sair da conta")} title={t("Sair da conta")}><Icon name="logout" className="h-4 w-4"/></SubmitButton></ActionForm></div>
      </aside>
      <div className="workspace">
        <header className="workspace-header"><span><span className="text-muted">{t("Meu espa\u00E7o")}</span><span className="mx-3 text-line">{t("/")}</span><span className="font-medium">{t("Gest\u00E3o de aulas")}</span></span></header>
        <div id="content" className="workspace-content">{children}</div>
        <footer className="workspace-footer">{t("Lessonara")}<span>{t("Um pouco de organiza\u00E7\u00E3o. Muito mais espa\u00E7o para ensinar.")}</span></footer>
      </div>
    </div>);
}
