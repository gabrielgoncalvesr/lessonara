"use client";

import {Icon} from "./icon";
import {useFormStatus} from "react-dom";
import {BusyContent} from "./busy-content";
import {useI18n} from "./browser-preferences-provider";
import type { ReactNode } from "react";

export function ConfirmButton({
  message,
  children,
  className = "btn-xs",
}: {
  message: string;
  children: ReactNode;
  className?: string;
}) {
  const {pending}=useFormStatus();
  const {t}=useI18n();
  return (
    <button className={`${className} btn-danger`} disabled={pending} aria-busy={pending} onClick={(e) => !confirm(t(message)) && e.preventDefault()}>
      <BusyContent pending={pending} label={t("Processando…")}><Icon name="trash" className="h-4 w-4"/>{children}</BusyContent>
    </button>
  );
}
