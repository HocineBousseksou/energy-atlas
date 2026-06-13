/**
 * Rate limiting strategy for Energy Atlas.
 *
 * TWO layers of protection:
 *
 *   (1) Per-IP via @upstash/ratelimit (this file):
 *       chat:            20 req/min/IP
 *       report:          20 req/min/IP
 *       explain-anomaly:  5 req/min/IP  (grounding is the expensive call)
 *
 *   (2) Upstream daily quota — Google AI Studio free tier on
 *       gemini-2.5-flash is ~1500 req/day per project. We additionally
 *       cap ourselves via env MAX_DAILY_LLM_CALLS=500 (default) to leave
 *       headroom and to alert before the upstream cap fires.
 *
 * When Upstash env vars are absent (typical in dev), this module
 * gracefully no-ops with a single console.warn per process — the API
 * stays functional but offers no protection. Don't run prod without
 * Upstash configured.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, isUpstashConfigured } from "./env";

export interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[ratelimit] Upstash env vars not set — rate limiting disabled (dev no-op). " +
      "Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN before deploying.",
  );
}

function noopLimiter(perMinute: number) {
  return {
    // identifier is part of the contract with @upstash/ratelimit but
    // unused in the no-op path; satisfy the interface without using it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async limit(identifier: string): Promise<LimitResult> {
      warnOnce();
      return {
        success: true,
        limit: perMinute,
        remaining: perMinute,
        reset: Date.now() + 60_000,
      };
    },
  };
}

function createLimiter(perMinute: number) {
  if (!isUpstashConfigured()) return noopLimiter(perMinute);

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(perMinute, "1 m"),
    analytics: true,
    prefix: "energy-atlas",
  });
}

export const chatLimiter = createLimiter(20);
export const reportLimiter = createLimiter(20);
export const explainLimiter = createLimiter(5);

/**
 * Best-effort client identifier for rate-limit keys. In Vercel edge,
 * x-forwarded-for is set; locally we fall back to a static key so all
 * dev requests share one bucket (which is fine for local testing).
 */
export function clientId(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local-dev";
}
