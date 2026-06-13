"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/lib/store";
import { TOUR_STEPS } from "./tour-steps";

/**
 * Drives the demo tour timing with A/B phase alternation.
 *
 *   Phase A — show card with the body copy for phaseA.duration ms.
 *             At end: if phaseB exists → enterDemoPhaseB(), else
 *             advance to next step.
 *
 *   Phase B — fade out card (handled by DemoOverlay), run onEnter,
 *             apply .tour-highlight class to the spotlight target,
 *             wait phaseB.duration. At end: remove highlight class,
 *             advance to next step. If this was the last step,
 *             stopDemoTour() instead.
 *
 * Two refs track timeouts so cleanup is robust:
 *   - phaseTimeoutRef: the active "advance at end of this phase" timer
 *   - highlightCleanupRef: the function that removes the .tour-highlight
 *                          class added at phase B entry
 *
 * Manual stop (button or Esc) clears both immediately. The store's
 * stopDemoTour does NOT reset other slices, so the dashboard stays
 * where the orchestrator brought it.
 */
export function useTourOrchestrator(): void {
  const active = useDashboardStore((s) => s.demoTour.active);
  const currentStep = useDashboardStore((s) => s.demoTour.currentStep);
  const phase = useDashboardStore((s) => s.demoTour.phase);
  const advanceDemoStep = useDashboardStore((s) => s.advanceDemoStep);
  const enterDemoPhaseB = useDashboardStore((s) => s.enterDemoPhaseB);
  const stopDemoTour = useDashboardStore((s) => s.stopDemoTour);

  const phaseTimeoutRef = useRef<number | null>(null);
  const highlightCleanupRef = useRef<(() => void) | null>(null);

  // Centralized cleanup — used on stop, unmount, phase change.
  const clearAll = () => {
    if (phaseTimeoutRef.current !== null) {
      window.clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
    if (highlightCleanupRef.current !== null) {
      try {
        highlightCleanupRef.current();
      } catch {
        // best-effort
      }
      highlightCleanupRef.current = null;
    }
  };

  useEffect(() => {
    if (!active) {
      clearAll();
      return;
    }
    const step = TOUR_STEPS[currentStep];
    if (!step) {
      stopDemoTour();
      return;
    }

    if (phase === "A") {
      // Reading phase. Wait phaseA.duration, then either enter phase B
      // (if it exists) or advance to next step.
      phaseTimeoutRef.current = window.setTimeout(() => {
        phaseTimeoutRef.current = null;
        if (step.phaseB) {
          enterDemoPhaseB();
        } else if (currentStep + 1 >= TOUR_STEPS.length) {
          stopDemoTour();
        } else {
          advanceDemoStep();
        }
      }, step.phaseA.duration);
      return clearAll;
    }

    // Phase B — fire onEnter + apply highlight class to the spotlight
    // target, then wait phaseB.duration before advancing.
    if (!step.phaseB) {
      // Defensive: shouldn't reach here without phase B (advance would
      // have skipped from A directly). Move on.
      if (currentStep + 1 >= TOUR_STEPS.length) {
        stopDemoTour();
      } else {
        advanceDemoStep();
      }
      return;
    }

    try {
      step.phaseB.onEnter?.();
    } catch (err) {
      console.error("[tour] phaseB.onEnter failed", currentStep, err);
    }

    // Apply the .tour-highlight class to the spotlight target so it
    // gets the brand outline + glow + 2 s pulse from globals.css.
    if (step.phaseB.spotlightSelector) {
      const el = document.querySelector<HTMLElement>(
        step.phaseB.spotlightSelector,
      );
      if (el) {
        el.classList.add("tour-highlight");
        // Bump z-index so the ring is visible above the spotlight wash.
        const prevPosition = el.style.position;
        const prevZ = el.style.zIndex;
        if (!el.style.position || el.style.position === "static") {
          el.style.position = "relative";
        }
        el.style.zIndex = "99";
        highlightCleanupRef.current = () => {
          el.classList.remove("tour-highlight");
          el.style.position = prevPosition;
          el.style.zIndex = prevZ;
        };
      }
    }

    phaseTimeoutRef.current = window.setTimeout(() => {
      phaseTimeoutRef.current = null;
      if (highlightCleanupRef.current) {
        highlightCleanupRef.current();
        highlightCleanupRef.current = null;
      }
      if (currentStep + 1 >= TOUR_STEPS.length) {
        stopDemoTour();
      } else {
        advanceDemoStep();
      }
    }, step.phaseB.duration);

    return clearAll;
  }, [
    active,
    currentStep,
    phase,
    advanceDemoStep,
    enterDemoPhaseB,
    stopDemoTour,
  ]);
}
