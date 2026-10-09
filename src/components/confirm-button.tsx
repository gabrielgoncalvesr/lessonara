"use client";

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
    <button className={className} disabled={pending} aria-busy={pending} onClick={(e) => !confirm(t(message)) && e.preventDefault()}>
      <BusyContent pending={pending} label={t("Processando…")}>{children}</BusyContent>
    </button>
  );
}
