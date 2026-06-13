"use client";

/**
 * Client-side cookie reader shared by ModeToggleButton + DemoBadge.
 *
 * Uses useSyncExternalStore so React 19's strict "no setState in
 * effect" rule is satisfied: the SSR snapshot is undefined (no
 * cookies on the server render for these visitor-scoped flags),
 * the client snapshot reads document.cookie directly. There's no
 * subscribe wiring — cookies don't fire events — so the noop
 * unsubscribe is fine. If a flip later changes a cookie, the
 * surrounding component triggers a full page reload anyway, so
 * the lack of reactive cookie observation is by design.
 */

import { useSyncExternalStore } from "react";

function parseCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const out: Record<string, string> = {};
  for (const raw of document.cookie.split(";")) {
    const [k, ...rest] = raw.trim().split("=");
    if (k) out[k] = rest.join("=");
  }
  return out;
}

const subscribe = (): (() => void) => () => {};

function getCookieClient(name: string): string | undefined {
  return parseCookies()[name];
}

export function useCookie(name: string): string | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getCookieClient(name),
    () => undefined,
  );
}
