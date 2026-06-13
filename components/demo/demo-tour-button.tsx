"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CircleDot, Wand2 } from "lucide-react";
import { resetToHome, scrollToTop } from "@/lib/demo/tour-actions";
import { useDashboardStore } from "@/lib/store";

const DEMO_MODE_ON =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/**
 * Tour trigger pill in the header.
 *
 * - Wand2 icon (signals "magic tour", not "play").
 * - Brand outline; label flips between 'Démo guidée' (inactive) and
 *   'Stop' (active). Subtle scale pulse 1.0 → 1.04 → 1.0 every 2 s
 *   when inactive, single dot indicator when active.
 * - Disabled when NEXT_PUBLIC_DEMO_MODE !== 'true', with a native
 *   <title> tooltip explaining why.
 * - z-[110] in the header so it stays clickable above the
 *   z-[100] tour overlay.
 */
export function DemoTourButton() {
  const active = useDashboardStore((s) => s.demoTour.active);
  const start = useDashboardStore((s) => s.startDemoTour);
  const stop = useDashboardStore((s) => s.stopDemoTour);
  const reduced = useReducedMotion();

  const disabled = !DEMO_MODE_ON;
  const onClick = () => {
    if (disabled) return;
    if (active) {
      stop();
    } else {
      // Reset to canonical home state before starting so step 0 always
      // begins with the same dashboard regardless of where the user was
      // poking around before pressing the button.
      resetToHome();
      scrollToTop();
      start();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={
        disabled
          ? "Disponible en mode démo. Activer NEXT_PUBLIC_DEMO_MODE=true."
          : active
            ? "Arrêter la visite guidée"
            : "Démo guidée — visite scénarisée de 3 min"
      }
      animate={
        disabled || active || reduced
          ? { scale: 1 }
          : { scale: [1, 1.035, 1] }
      }
      transition={{
        duration: 2.4,
        ease: "easeInOut",
        repeat: disabled || active || reduced ? 0 : Infinity,
        repeatType: "loop",
      }}
      className={`relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-mono uppercase tracking-[0.12em] transition-colors shrink-0 ${
        disabled
          ? "border-border text-text-subtle cursor-not-allowed opacity-50"
          : active
            ? "border-brand text-brand bg-brand/10"
            : "border-brand/40 text-brand hover:bg-brand/10"
      }`}
      style={
        !disabled && !active
          ? { boxShadow: "0 0 24px rgba(232, 93, 4, 0.18)" }
          : undefined
      }
    >
      {active ? (
        <CircleDot className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      ) : (
        <Wand2 className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
      )}
      <span>{active ? "Stop" : "Démo guidée"}</span>
    </motion.button>
  );
}
