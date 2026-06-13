import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  ADMIN_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
  isAdminToggleEnabled,
} from "@/lib/demo/mode-cookie";

export const runtime = "nodejs";

/**
 * GET /api/admin/unlock?secret=<value>
 *
 * Validates the supplied secret against env.ADMIN_SECRET. On match,
 * drops the admin_unlocked cookie and redirects to `/`. The cookie is
 * NOT HttpOnly because the header button must read it client-side to
 * decide whether to render itself. That's a deliberate tradeoff: the
 * cookie's value (`1`) carries no secret material, so a JS read leaks
 * nothing. The secret itself never travels except in this one URL.
 *
 * On mismatch or when the toggle isn't enabled, returns 404 (not 401)
 * so the endpoint's existence isn't disclosed.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isAdminToggleEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get("secret");

  if (!provided || provided !== env.ADMIN_SECRET) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const target = new URL("/", url.origin);
  const res = NextResponse.redirect(target, { status: 303 });
  res.cookies.set(ADMIN_COOKIE, "1", {
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
