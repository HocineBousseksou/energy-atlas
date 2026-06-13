/**
 * Energy Atlas — design tokens (single source of truth).
 *
 * All hex values below are derived in OKLCH from the locked accent
 * #e85d04 (oklch(0.65 0.189 43°), "editorial orange" — OWID/FT family),
 * with controlled lightness and chroma so categorical hues read as
 * a coherent family rather than a random rainbow.
 *
 * Why a TS module and not just CSS variables: Plotly trace configs
 * receive raw color strings, not `var()` references — so every chart
 * imports from this file. The matching CSS variables are declared
 * in app/globals.css so DOM elements can use them via Tailwind.
 *
 * Anti-patterns explicitly avoided:
 *   • No purple in the sector palette (was #a855f7 + #3b82f6 adjacent).
 *   • No region-color reuse of the cluster palette.
 *   • No raw hex literals in components — they all import from here.
 */

// ─── Surface ─────────────────────────────────────────────────────────
export const BG = {
  deep: "#0a0a0f", // page background
  panel: "#14141a", // card / panel
  elevated: "#1c1c24", // hover / elevated panel
} as const;

export const BORDER = {
  base: "rgba(255,255,255,0.06)",
  hover: "rgba(255,255,255,0.12)",
} as const;

export const TEXT = {
  primary: "#f5f5f7",
  muted: "#8a8a93",
  subtle: "#5a5a63",
} as const;

// ─── Accent (locked: editorial orange) ───────────────────────────────
export const ACCENT = "#e85d04";
export const ACCENT_DIM = "#c53b00"; // culori-derived at L=0.55, accent hue/chroma
export const ACCENT_GLOW = "rgba(232, 93, 4, 0.15)"; // single-role glow on hero KPI + GitHub badge

// ─── Status (semantic, not derived from accent) ──────────────────────
export const STATUS = {
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
} as const;

// ─── Sector palette ──────────────────────────────────────────────────
// 5 hues at 72° spacing, L=0.66 C=0.14 — equal lightness keeps them
// readable on charts; controlled chroma keeps them sober (no neon).
export const SECTOR: Record<
  "agriculture" | "industrie" | "résidentiel" | "tertiaire" | "autre",
  string
> = {
  agriculture: "#d77245",
  industrie: "#8f9c20",
  résidentiel: "#00aca1",
  tertiaire: "#5c91e7",
  autre: "#c370b9",
};

// ─── Cluster palette ─────────────────────────────────────────────────
// 7 hues at 360/7° spacing, L=0.62 C=0.15. Used by ChoroplethMap when
// mapColorMode = "cluster" and by AtlasWall when the cluster view is on.
export const CLUSTER: readonly string[] = [
  "#ce6331",
  "#a38300",
  "#3c9d4b",
  "#00a0a6",
  "#2c8adc",
  "#966ed1",
  "#c85b8f",
] as const;

// ─── Sequential ramp (choropleth) ────────────────────────────────────
// 5 stops at the accent hue, L 0.15 → 0.92, C ramping. Replaces the
// generic Plotly Viridis (purple → yellow) with an accent-harmonized
// dark-to-bright orange ramp.
export const SEQUENTIAL: readonly string[] = [
  "#180501",
  "#571100",
  "#a1410d",
  "#f2753a",
  "#ffb97c",
] as const;

// ─── Divergent ramp (Δ tables, comparator) ───────────────────────────
// Crimson 8° (strong negative) → mild crimson → neutral pinned to the
// accent hue at very low chroma → mild green → strong green 145°.
// Crimson at 8° is well separated from accent's 43° so the negative
// side never reads as "more orange".
export const DIVERGENT: readonly string[] = [
  "#b7014d", // strong negative (crimson)
  "#d48492", // mild negative
  "#bdb5b2", // neutral mid
  "#76af77", // mild positive
  "#1c882d", // strong positive
] as const;

// ─── Plotly-specific helpers ────────────────────────────────────────
// Categorical colorway for any Plotly trace that doesn't pass explicit
// colors — prevents D3's category10 from leaking through.
export const PLOTLY_COLORWAY: readonly string[] = [
  ACCENT,
  TEXT.muted,
  ...Object.values(SECTOR),
  ...CLUSTER,
] as const;

// ─── Plotly mapbox/maplibre style — theme-aware helper ───────────────
export type Theme = "dark" | "light";
export function mapStyleFor(theme: Theme = "dark"): string {
  // 'carto-darkmatter' is the no-token MapLibre style that pairs with
  // our dark surface tokens. Light path is documented for future use.
  return theme === "light" ? "carto-positron" : "carto-darkmatter";
}
