import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { Eyebrow } from "./eyebrow";

interface ChartShellProps {
  /** Bracket-eyebrow text shown above the title (e.g. "TOP 15"). */
  eyebrow?: ReactNode;
  /** Section title — short, descriptive ("Top 15 départements"). */
  title: ReactNode;
  /** Optional one-line description below the title. */
  description?: ReactNode;
  /** Optional Lucide icon next to the title. */
  icon?: LucideIcon;
  /** Slot rendered on the right side of the header (toggles, buttons). */
  actions?: ReactNode;
  /** When true, render a Skeleton placeholder instead of children. */
  loading?: boolean;
  /** When non-null, render the EmptyState block. */
  empty?: { title: string; description?: ReactNode; icon?: LucideIcon } | null;
  /** When non-null, render the inline error block. */
  error?: { message: string; onRetry?: () => void } | null;
  /** Min-height for the body region (px). Stabilizes CLS. */
  minBodyHeight?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Single chart section wrapper used by every chart.
 *
 * Replaces the per-file ChartShell / Section definitions that were
 * scattered across the chart components. Provides loading / empty /
 * error states out of the box.
 */
export function ChartShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  loading,
  empty,
  error,
  minBodyHeight = 240,
  className,
  children,
}: ChartShellProps) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card/40 px-4 py-5 md:px-6 md:py-6 space-y-4",
        className,
      )}
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="font-display text-xl md:text-[22px] tracking-tight text-foreground inline-flex items-center gap-2">
            {Icon ? (
              <Icon
                className="h-4.5 w-4.5 text-brand"
                strokeWidth={1.5}
                aria-hidden
              />
            ) : null}
            <span>{title}</span>
          </h2>
          {description ? (
            <p className="text-xs text-muted-foreground max-w-prose">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>

      <div style={{ minHeight: minBodyHeight }}>
        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-[200px] w-full rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : empty ? (
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
          />
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-8 text-sm">
            <p className="text-danger">Erreur : {error.message}</p>
            {error.onRetry ? (
              <button
                type="button"
                onClick={error.onRetry}
                className="text-xs underline underline-offset-2 hover:text-foreground"
              >
                Réessayer
              </button>
            ) : null}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
