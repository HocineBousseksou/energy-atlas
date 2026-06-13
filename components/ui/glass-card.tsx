import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Glassmorphism wrapper.
 *
 * Use sparingly — only for the KPI hero row and the floating filter
 * bar. Don't apply globally.
 *
 * `accent` prop adds the single-role accent glow. Reserved for the
 * hero KPI card and the GitHub star badge.
 */
type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  accent?: boolean;
};

export function GlassCard({
  accent,
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[rgba(20,20,26,0.7)] backdrop-blur-xl backdrop-saturate-150",
        "shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_8px_24px_rgba(0,0,0,0.4)]",
        accent &&
          "shadow-[0_0_40px_rgba(232,93,4,0.18),0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_24px_rgba(0,0,0,0.4)]",
        className,
      )}
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
      {...props}
    />
  );
}
