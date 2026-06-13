import type { Config, Layout } from "plotly.js";
import {
  ACCENT,
  ACCENT_DIM,
  BG,
  CLUSTER,
  DIVERGENT,
  PLOTLY_COLORWAY,
  SECTOR,
  SEQUENTIAL,
  TEXT,
  mapStyleFor,
} from "./tokens";

/**
 * Energy Atlas Plotly theme.
 *
 * - Transparent canvas (paper + plot bg) so the editorial dark surface
 *   from app/globals.css shows through.
 * - Gridlines at rgba(255,255,255,0.04) — barely visible by design
 *   (0.12 was too loud).
 * - Explicit colorway so traces that don't pass colors don't fall
 *   back to D3 category10 (avoids palette sprawl).
 * - Hover labels styled to match the surface palette.
 *
 * Token re-exports below: charts that need the categorical colors
 * import them from this module so there is exactly ONE place chart
 * code looks for design data.
 */

const GRID = "rgba(255,255,255,0.04)";
const ZERO = "rgba(255,255,255,0.10)";

export const baseLayout: Partial<Layout> = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: {
    family: "var(--font-geist), system-ui, sans-serif",
    size: 12,
    color: TEXT.muted,
  },
  margin: { l: 48, r: 16, t: 16, b: 40 },
  colorway: [...PLOTLY_COLORWAY],
  xaxis: {
    gridcolor: GRID,
    zerolinecolor: ZERO,
    tickfont: { size: 11, color: TEXT.muted },
    linecolor: GRID,
  },
  yaxis: {
    gridcolor: GRID,
    zerolinecolor: ZERO,
    tickfont: { size: 11, color: TEXT.muted },
    linecolor: GRID,
  },
  hoverlabel: {
    bgcolor: BG.elevated,
    bordercolor: "rgba(255,255,255,0.08)",
    font: {
      family: "var(--font-geist), system-ui, sans-serif",
      color: TEXT.primary,
      size: 12,
    },
  },
  showlegend: false,
};

export const baseConfig: Partial<Config> = {
  displayModeBar: false,
  responsive: true,
  locale: "fr",
};

// Re-exports so chart code has a single import surface.
export {
  ACCENT,
  ACCENT_DIM,
  BG,
  CLUSTER,
  DIVERGENT,
  SECTOR,
  SEQUENTIAL,
  TEXT,
  mapStyleFor,
};

// Legacy aliases (loose-typed) for charts still referencing old names.
// Removed in subsequent commits as each chart is refactored to import
// the strongly-typed SECTOR / CLUSTER directly from tokens.
export const SECTOR_COLORS: Record<string, string> = SECTOR;
export const CLUSTER_PALETTE: readonly string[] = CLUSTER;
