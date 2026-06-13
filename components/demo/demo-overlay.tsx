"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { DemoSpotlight } from "@/components/demo/demo-spotlight";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import {
  TOTAL_DURATION_MS,
  TOUR_STEPS,
} from "@/lib/demo/tour-steps";
import { useDashboardStore } from "@/lib/store";

/**
 * Overlay surface for the demo tour with A/B phase alternation.
 *
 * Phase A: card centered + backdrop-blur — user reads.
 * Phase B: backdrop fades out, card fades out, DemoSpotlight mounts
 *          on the target. Step 7 is the exception — splitScreen=true
 *          means the card stays visible top-right at max-w-md while
 *          the explanation panel mounts/fills below the spotlight.
 *
 * Esc closes the tour at any time, independent of the phase.
 */
export function DemoOverlay() {
  const active = useDashboardStore((s) => s.demoTour.active);
  const currentStep = useDashboardStore((s) => s.demoTour.currentStep);
  const phase = useDashboardStore((s) => s.demoTour.phase);
  const startedAt = useDashboardStore((s) => s.demoTour.startedAt);
  const stopDemoTour = useDashboardStore((s) => s.stopDemoTour);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];
  const isPhaseB = phase === "B";
  const splitScreen = Boolean(isPhaseB && step?.phaseB?.splitScreen);

  // Esc closes the tour.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        stopDemoTour();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, stopDemoTour]);

  // Anchor focus to the dialog on activation.
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => cardRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, [active]);

  if (!active || !step) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-[100] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Backdrop blur — only in phase A (and never in splitScreen). */}
        <AnimatePresence>
          {!isPhaseB ? (
            <motion.div
              key="backdrop"
              aria-hidden
              className="absolute inset-0 backdrop-blur-md bg-background/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
          ) : null}
        </AnimatePresence>

        {/* Spotlight — phase B + selector + not splitScreen. */}
        {isPhaseB && step.phaseB?.spotlightSelector && !splitScreen ? (
          <DemoSpotlight
            key={`spotlight-${currentStep}`}
            targetSelector={step.phaseB.spotlightSelector}
          />
        ) : null}

        {/* Card. In splitScreen phase B, slides to top-right. */}
        <AnimatePresence>
          {!isPhaseB || splitScreen ? (
            <motion.div
              key={splitScreen ? "card-split" : "card-center"}
              ref={cardRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="false"
              aria-label="Visite guidée — Energy Atlas"
              initial={
                splitScreen
                  ? { x: "0%", y: "0%", scale: 0.85, opacity: 0 }
                  : { y: 20, opacity: 0 }
              }
              animate={
                splitScreen
                  ? { x: 0, y: 0, scale: 1, opacity: 1 }
                  : { y: 0, opacity: 1 }
              }
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={
                splitScreen
                  ? "absolute top-6 right-4 md:right-6 max-w-md w-[92vw] pointer-events-auto outline-none"
                  : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl w-[92vw] pointer-events-auto outline-none"
              }
            >
              <GlassCard
                className={
                  splitScreen
                    ? "px-6 py-6 space-y-4"
                    : "px-8 py-10 md:px-12 md:py-14 space-y-6"
                }
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <Eyebrow>{`${currentStep + 1} / ${TOUR_STEPS.length}`}</Eyebrow>
                  <button
                    type="button"
                    onClick={stopDemoTour}
                    className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-subtle hover:text-foreground transition-colors"
                    aria-label="Arrêter la visite guidée"
                  >
                    Esc · Stop
                  </button>
                </div>

                <div
                  aria-live="polite"
                  aria-atomic="true"
                  className={
                    splitScreen
                      ? "font-display italic font-semibold text-base md:text-lg leading-relaxed tracking-tight text-white"
                      : "font-display italic font-semibold text-2xl md:text-3xl leading-relaxed tracking-tight text-white"
                  }
                  style={{
                    fontVariationSettings: "'opsz' 96",
                    textShadow: "0 1px 12px rgba(0,0,0,0.6)",
                  }}
                >
                  {step.phaseA.body}
                </div>

                <DemoProgressBar startedAt={startedAt} />
              </GlassCard>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* In splitScreen phase B, also paint the dim wash so the
            anomaly panel zone feels like the spotlighted region. */}
        {splitScreen ? (
          <div
            aria-hidden
            className="absolute inset-0 bg-background/30 pointer-events-none"
          />
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

function DemoProgressBar({ startedAt }: { startedAt: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!startedAt || !ref.current) return;
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / TOTAL_DURATION_MS) * 100);
      if (ref.current) ref.current.style.width = `${pct}%`;
      if (pct < 100) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [startedAt]);

  return (
    <div className="h-[2px] w-full bg-border/50 overflow-hidden">
      <div
        ref={ref}
        className="h-full bg-brand transition-[width] duration-100"
        style={{ width: "0%" }}
      />
    </div>
  );
}
