"use client";

import { CheckCheck, Eye, FileText, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageTicks({
  mine,
  readAt,
}: {
  mine: boolean;
  readAt?: string | Date | null;
}) {
  if (!mine) return null;
  const read = Boolean(readAt);
  return (
    <span
      className="ml-1 inline-flex align-middle"
      title={read ? "Leído" : "Entregado"}
      aria-label={read ? "Leído" : "Entregado"}
    >
      {read ? (
        <CheckCheck className="h-3.5 w-3.5 text-sky-300" strokeWidth={2.5} />
      ) : (
        <CheckCheck className="h-3.5 w-3.5 opacity-55" strokeWidth={2.5} />
      )}
    </span>
  );
}

export function ViewOnceBadge({
  locked,
  consumed,
  mine,
}: {
  locked?: boolean;
  consumed?: boolean;
  mine?: boolean;
}) {
  if (consumed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs opacity-80">
        <Eye className="h-3.5 w-3.5" />
        {mine ? "Abierta" : "Abierto"}
      </span>
    );
  }
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <Lock className="h-3.5 w-3.5" />
        Foto de una vista · toca para abrir
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs opacity-80">
      <Eye className="h-3.5 w-3.5" />
      Una vista
    </span>
  );
}

export function FileChip({
  name,
  href,
  mine,
}: {
  name: string;
  href?: string | null;
  mine?: boolean;
}) {
  const inner = (
    <>
      <FileText className={cn("h-5 w-5", mine ? "text-ink/70" : "text-champagne")} />
      <span className="min-w-0 truncate text-sm">{name}</span>
    </>
  );
  if (!href) {
    return <div className="flex max-w-full items-center gap-2">{inner}</div>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download
      className="flex max-w-full items-center gap-2 underline-offset-2 hover:underline"
    >
      {inner}
    </a>
  );
}
