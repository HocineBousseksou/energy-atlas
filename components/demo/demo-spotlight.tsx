"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Spotlight overlay used during the demo tour's phase B.
 *
 * A fixed inset-0 layer that paints a darkened wash over the screen,
 * with a soft radial-gradient hole around the target element. The
 * hole's transition (opaque → transparent) goes from 70 % → 100 % of
 * the radius so the edge is feathered (not a hard ellipse) — that's
 * the difference between "designed" and "tutorial-overlay-from-2014".
 *
 * The hole's size is the target's bounding rect + 80 px breathing
 * room on each axis. We re-compute on resize and scroll (debounced)
 * so the spotlight tracks layout changes that occur during the step.
 *
 * Reduced-motion: render no gradient (no spotlight wash) — just
 * relies on the .tour-highlight ring/glow that the orchestrator
 * applies to the target.
 */
export function DemoSpotlight({
  targetSelector,
}: {
  targetSelector: string;
}) {
  const reduced = useReducedMotion();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const compute = () => {
      const el = document.querySelector(targetSelector);
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };
    const onChange = () => {
      // rAF debounce — coalesces multiple resize/scroll events into one
      // recompute on the next paint frame.
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange);
    };
  }, [targetSelector]);

  if (reduced) return null;
  if (!rect) {
    // Fallback: target not found — render the dark wash with no hole
    // so the user still gets the dimming cue.
    return (
      <motion.div
        aria-hidden
        className="fixed inset-0 z-[95] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: "rgba(0,0,0,0.55)" }}
      />
    );
  }

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const ellipseW = rect.width / 2 + 40;
  const ellipseH = rect.height / 2 + 40;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[95] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: `radial-gradient(ellipse ${ellipseW}px ${ellipseH}px at ${cx}px ${cy}px, transparent 0%, transparent 70%, rgba(0,0,0,0.55) 100%)`,
      }}
    />
  );
}
