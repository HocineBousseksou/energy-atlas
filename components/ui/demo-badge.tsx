"use client";

import { useCookie } from "@/lib/demo/cookie-client";
import { useDashboardStore } from "@/lib/store";

/**
 * Discreet "DEMO" indicator pinned to the bottom-right corner.
 *
 * Visibility is the AND of three signals:
 *
 *   1. NEXT_PUBLIC_DEMO_MODE === "true" — the build-time default
 *      (set on Vercel). Server-side companion is DEMO_MODE.
 *
 *   2. No force_mode=live cookie — when an unlocked admin flips to
 *      live via the header toggle, the badge must hide too so the
 *      label doesn't contradict the actual API behaviour. The cookie
 *      is non-HttpOnly precisely so this read works.
 *
 *   3. Demo tour not active — the tour overlay already announces the
 *      demo nature, and the badge would compete with the bottom-right
 *      card position used in step 7's split-screen.
 */
export function DemoBadge() {
  const tourActive = useDashboardStore((s) => s.demoTour.active);
  const forcedMode = useCookie("force_mode");

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  if (forcedMode === "live") return null;
  return (
    <div
      aria-label="Mode démo actif — réponses LLM pré-enregistrées"
      aria-hidden={tourActive}
      className={`fixed bottom-4 right-4 z-50 font-mono text-[10px] tracking-[0.18em] uppercase text-text-subtle transition-opacity duration-200 pointer-events-none select-none ${
        tourActive ? "opacity-0" : "opacity-40 hover:opacity-80"
      }`}
    >
      DEMO
    </div>
  );
}
