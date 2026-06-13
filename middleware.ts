import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers for every response.
 *
 * - X-Frame-Options: DENY                  → no embedding in iframes (clickjacking).
 * - X-Content-Type-Options: nosniff        → no MIME-type sniffing.
 * - Referrer-Policy                        → strip referrer to origin on cross-origin.
 * - Permissions-Policy                     → disable powerful APIs we don't use.
 * - Strict-Transport-Security (prod only)  → force HTTPS for 2 years on this and subdomains.
 * - Content-Security-Policy                → minimal but real default. Allows the things this
 *                                            app actually needs (Plotly inline scripts, Google
 *                                            Search Grounding redirects, Gemini API origin,
 *                                            CartoCDN tiles only when used in dev/no-pivot,
 *                                            Google Fonts CSS). 'unsafe-eval' is required by
 *                                            Plotly's runtime; 'unsafe-inline' is required by
 *                                            Next/Tailwind dev hashing — both are limited to
 *                                            script/style and not extended to other directives.
 */

const isProd = process.env.NODE_ENV === "production";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Plotly needs eval for inline math; Next.js inline scripts need unsafe-inline in dev.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind v4 inline styles + next/font Google Fonts CSS.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // next/font Google Fonts.
  "font-src 'self' data: https://fonts.gstatic.com",
  // Plotly chart exports use blob/data URIs; favicons. cdn.plot.ly added
  // defensively in case Plotly fetches PNG/SVG asset bundles (it normally
  // doesn't, but keeping img-src and connect-src in lockstep avoids
  // surprises if a future trace type changes that).
  "img-src 'self' data: blob: https://cdn.plot.ly",
  // Server-side calls go to Gemini and Upstash from the API routes.
  //
  // cdn.plot.ly is whitelisted because Plotly's `choropleth` trace fetches
  // world_110m.json topojson at runtime to compute projection bounds —
  // even when layout.geo.visible is false. Removing this entry
  // regresses the map to an empty render with the console error
  // "unexpected error while fetching topojson file at
  // https://cdn.plot.ly/un/world_110m.json". The CDN serves only static
  // topojson assets; no XSS risk.
  "connect-src 'self' https://generativelanguage.googleapis.com https://*.upstash.io https://cdn.plot.ly",
  // Block any iframe embedding (X-Frame-Options DENY equivalent for CSP-aware clients).
  "frame-ancestors 'none'",
  // No <object>/<embed>.
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const CSP = CSP_DIRECTIVES.join("; ");

export function middleware(req: NextRequest) {
  // Request is unused at the moment but the signature is kept so we
  // can branch on req.nextUrl in future (e.g., per-route CSP relax).
  void req;
  const res = NextResponse.next();

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  res.headers.set("Content-Security-Policy", CSP);

  if (isProd) {
    // 2 years, include subdomains, eligible for HSTS preload list.
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return res;
}

export const config = {
  // Match all paths except Next.js internals and static assets we don't
  // need to header-decorate.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
