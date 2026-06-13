import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { isDemoMode } from "./index";

/**
 * Runtime demo/live override cookie. Lets the admin flip mode without
 * re-deploying, while still defaulting to the env var for everyone else.
 *
 * Two cookies, two purposes:
 *
 *   admin_unlocked=1  — non-HttpOnly so the header button can decide
 *                       whether to render itself (client read). Set by
 *                       /api/admin/unlock when the secret matches.
 *
 *   force_mode=live   — server-readable override consulted by the LLM
 *           |demo       routes before falling back to env.DEMO_MODE.
 *                       Set by /api/admin/mode after admin_unlocked
 *                       check passes.
 *
 * Cookies are scoped to the visitor's browser only; flipping the toggle
 * does NOT change global state, so other visitors keep the default
 * (env) mode. That's the security boundary: the audience always sees
 * demo, only the admin browser sees live (or whatever was toggled).
 */

export const ADMIN_COOKIE = "admin_unlocked";
export const MODE_COOKIE = "force_mode";

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type ForceMode = "live" | "demo";

/**
 * Effective demo-mode flag for a given request. Cookie wins over env
 * when set; otherwise falls back to env.DEMO_MODE (the deploy-time
 * default). Server-only — must be called from a Route Handler or
 * Server Component where `cookies()` is available.
 */
export async function isEffectiveDemoMode(): Promise<boolean> {
  const cookieStore = await cookies();
  const forced = cookieStore.get(MODE_COOKIE)?.value;
  if (forced === "demo") return true;
  if (forced === "live") return false;
  return isDemoMode();
}

/**
 * True iff the visitor has unlocked the admin toggle. Server-only.
 * The client mirror is `document.cookie` read inside ModeToggleButton.
 */
export async function isAdminUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "1";
}

/**
 * True iff the deployment has configured ADMIN_SECRET. The toggle
 * endpoints refuse to do anything when this is false.
 */
export function isAdminToggleEnabled(): boolean {
  return Boolean(env.ADMIN_SECRET && env.ADMIN_SECRET.length >= 16);
}
