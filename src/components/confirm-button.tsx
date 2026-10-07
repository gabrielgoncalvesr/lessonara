"use client";

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
  return (
    <button className={className} onClick={(e) => !confirm(message) && e.preventDefault()}>
      {children}
    </button>
  );
}
