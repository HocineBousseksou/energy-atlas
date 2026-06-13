"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Typewriter — reveals `text` character-by-character to give an
 * "LLM thinking" effect AFTER the live fetch has resolved (so all
 * four explain-anomaly guardrails — including citation-or-nothing —
 * have already been enforced server-side).
 *
 * Architectural decision: server streaming via
 * streamObject would risk streaming hypotheses BEFORE grounding
 * presence is verified. Doing the visual streaming entirely on the
 * client preserves rigor while delivering the same demo perception.
 *
 * Respects prefers-reduced-motion: when reduced motion is requested
 * by the OS, the full text appears instantly with no cursor.
 */
export function Typewriter({
  text,
  cps = 80,
  onDone,
  className,
}: {
  text: string;
  cps?: number;
  onDone?: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  // Initial state seeded from the initializer — never reset
  // synchronously inside an effect (caller is expected to remount
  // the Typewriter via a `key` prop if `text` should change).
  const [revealed, setRevealed] = useState<string>(() => (reduced ? text : ""));
  const [done, setDone] = useState<boolean>(() => Boolean(reduced));

  useEffect(() => {
    if (reduced) {
      onDone?.();
      return;
    }
    let i = 0;
    const intervalMs = Math.max(8, Math.round(1000 / cps));
    const id = window.setInterval(() => {
      i++;
      if (i >= text.length) {
        setRevealed(text);
        setDone(true);
        onDone?.();
        window.clearInterval(id);
        return;
      }
      setRevealed(text.slice(0, i));
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
    // onDone intentionally NOT in deps — the parent passes a fresh
    // closure each render; we want the typewriter to restart only
    // when text/cps change. text is in deps so a Typewriter
    // re-mounted with a different text restarts cleanly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, cps, reduced]);

  return (
    <span className={className}>
      {revealed}
      {!done ? (
        <span
          aria-hidden
          className="inline-block w-[0.45em] h-[0.9em] -mb-[0.05em] ml-0.5 align-middle bg-brand animate-pulse"
        />
      ) : null}
    </span>
  );
}
