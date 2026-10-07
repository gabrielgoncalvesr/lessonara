"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Visão geral", icon: "grid" },
  { href: "/pagamentos", label: "Pagamentos", icon: "book" },
  { href: "/financeiro", label: "Financeiro", icon: "chart" },
  { href: "/alunos", label: "Alunos", icon: "users" },
  { href: "/config", label: "Configurações", icon: "settings" },
];

export function PanelNav() {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} />;
}

export function PanelNavFallback() {
  return <NavLinks />;
}

function NavLinks({ pathname }: { pathname?: string }) {
  return <nav className="panel-nav" aria-label="Navegação principal">{links.map(({ href, label, icon }) => {
    const active = pathname !== undefined && (href === "/alunos" ? pathname === "/alunos" || pathname.startsWith("/alunos/") : pathname === href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`nav-link ${active ? "nav-active" : ""}`}><Icon name={icon} /><span>{label}</span>{active && <span className="nav-dot" />}</Link>;
  })}</nav>;
}
