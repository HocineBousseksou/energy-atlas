"use client";

import { motion } from "framer-motion";
import { Star, Zap } from "lucide-react";
import { DemoTourButton } from "@/components/demo/demo-tour-button";
import { ModeToggleButton } from "@/components/demo/mode-toggle-button";
import { Eyebrow } from "@/components/ui/eyebrow";

const REPO_URL =
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/energy-atlas/energy-atlas";

/**
 * Site header.
 *
 * The wordmark mixes two fonts within one display line:
 *   "Energy" — Geist Sans 600
 *   "Atlas"  — Fraunces italic, opsz 144, wght 500 (the variable-axis
 *              differentiator, chosen over Instrument Serif).
 *
 * Type scale:
 *   wordmark: clamp(64px, 9vw, 128px), line-height 0.95, letter-spacing -0.03em.
 *
 * Animation: fade-in at t=0 (300ms) per the orchestrated reveal sequence.
 */
export function SiteHeader() {
  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="px-4 md:px-6 pt-8 md:pt-12 max-w-[1400px] mx-auto"
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="space-y-3 min-w-0">
          <Eyebrow>FR · 2022–2024</Eyebrow>

          <h1
            className="font-sans font-semibold tracking-[-0.03em] text-foreground leading-[0.95]"
            style={{ fontSize: "clamp(64px, 9vw, 128px)" }}
          >
            <Zap
              className="inline-block align-baseline mr-3 md:mr-4 text-brand"
              strokeWidth={1.7}
              style={{
                width: "0.55em",
                height: "0.55em",
                transform: "translateY(-0.04em)",
              }}
              aria-hidden
            />
            <span>Energy</span>
            <span
              className="font-display italic font-medium pl-2 md:pl-3"
              style={{
                fontVariationSettings: "'opsz' 144, 'wght' 500",
              }}
            >
              Atlas
            </span>
          </h1>

          <p className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
            Analyse open-source de la consommation énergétique des
            départements français. Statistique multi-méthodes,
            explications IA sourcées.
          </p>
        </div>

        <div className="flex items-center gap-2 z-[110]">
          <ModeToggleButton />
          <DemoTourButton />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3.5 py-1.5 text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground hover:border-brand transition-colors shrink-0"
            style={{
              boxShadow: "0 0 30px rgba(232, 93, 4, 0.10)",
            }}
          >
            <Star className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            <span>Star on GitHub</span>
          </a>
        </div>
      </div>
    </motion.header>
  );
}
