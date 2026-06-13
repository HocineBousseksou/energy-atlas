"use client";

import { motion } from "framer-motion";
import { Database, Radio } from "lucide-react";
import { useState } from "react";
import { useCookie } from "@/lib/demo/cookie-client";

/**
 * Header pill that flips the deployment between demo (fixtures) and
 * live (real Gemini) for the calling browser only.
 *
 * Render gating: the button only mounts when document.cookie carries
 * `admin_unlocked=1`. That cookie is dropped by /api/admin/unlock when
 * the visitor supplies the matching ADMIN_SECRET. So the audience
 * never sees this button, only an unlocked admin browser does.
 *
 * Click flow: POST /api/admin/mode?to=live|demo → server validates
 * the unlock cookie and sets force_mode → page reload so the new
 * cookie is picked up by the 3 LLM routes on the next interaction.
 *
 * Visual: the dot color encodes mode at a glance. Orange (brand) =
 * LIVE (real Gemini calls, beware quota). Muted = DEMO (fixtures).
 */
export function ModeToggleButton() {
  const adminCookie = useCookie("admin_unlocked");
  const forcedMode = useCookie("force_mode");
  const [pending, setPending] = useState(false);

  if (adminCookie !== "1") return null;

  const mode: "live" | "demo" =
    forcedMode === "live"
      ? "live"
      : forcedMode === "demo"
        ? "demo"
        : process.env.NEXT_PUBLIC_DEMO_MODE === "true"
          ? "demo"
          : "live";

  const flip = async () => {
    const next: "live" | "demo" = mode === "live" ? "demo" : "live";
    setPending(true);
    try {
      const res = await fetch(`/api/admin/mode?to=${next}`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`mode flip failed: ${res.status}`);
      // Reload so SSR + every in-flight subscription re-reads the
      // cookie. Simpler than threading the new mode through the store.
      window.location.reload();
    } catch (err) {
      console.error("[mode-toggle]", err);
      setPending(false);
    }
  };

  const isLive = mode === "live";

  return (
    <motion.button
      type="button"
      onClick={flip}
      disabled={pending}
      aria-label={`Basculer en mode ${isLive ? "démo (fixtures)" : "live (Gemini réel)"}`}
      title={
        isLive
          ? "LIVE — appels Gemini réels. Cliquer pour passer en démo."
          : "DÉMO — fixtures locales. Cliquer pour passer en live."
      }
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: pending ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-mono uppercase tracking-[0.12em] transition-colors shrink-0 ${
        isLive
          ? "border-brand text-brand bg-brand/10"
          : "border-border text-muted-foreground hover:text-foreground hover:border-brand/40"
      }`}
    >
      {isLive ? (
        <Radio className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
      ) : (
        <Database className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
      )}
      <span>{isLive ? "Live" : "Démo"}</span>
    </motion.button>
  );
}
