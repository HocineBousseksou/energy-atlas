import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Bracket-signature eyebrow.
 *   [ FR · 2022–2024 ]
 *   [ ANOMALIES STATISTIQUES ]
 *
 * Brackets in --brand, text in --muted-foreground, JetBrains Mono
 * uppercase tracking-widest. Used ONLY on eyebrows — header, section
 * titles, KPI labels, footer license note. Not on body, not on chips.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-baseline",
        className,
      )}
      style={{ gap: "0.5em" }}
    >
      <span className="text-brand" aria-hidden>
        [
      </span>
      <span>{children}</span>
      <span className="text-brand" aria-hidden>
        ]
      </span>
    </span>
  );
}
