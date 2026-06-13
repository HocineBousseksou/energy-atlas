import { NextResponse } from "next/server";
import {
  COOKIE_MAX_AGE_SECONDS,
  type ForceMode,
  MODE_COOKIE,
  isAdminToggleEnabled,
  isAdminUnlocked,
} from "@/lib/demo/mode-cookie";

export const runtime = "nodejs";

/**
 * POST /api/admin/mode?to=live|demo
 *
 * Flips the force_mode cookie for the calling browser. The next request
 * to /api/explain-anomaly, /api/chat or /api/report will see the new
 * effective mode (cookie wins over env).
 *
 * Gated by:
 *   1. ADMIN_SECRET env var is set (isAdminToggleEnabled).
 *   2. admin_unlocked cookie present (visitor went through
 *      /api/admin/unlock with a matching secret).
 *
 * Both checks fail with 404 to avoid disclosing endpoint existence.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isAdminToggleEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }
  if (!(await isAdminUnlocked())) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get("to");

  if (to !== "live" && to !== "demo") {
    return NextResponse.json(
      { error: "INVALID_TO", expected: ["live", "demo"] },
      { status: 400 },
    );
  }

  const res = NextResponse.json({ mode: to as ForceMode });
  res.cookies.set(MODE_COOKIE, to, {
    httpOnly: false,
    // secure:true on prod (HTTPS) only — dev runs on http://localhost
    // and would silently drop the cookie otherwise.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
