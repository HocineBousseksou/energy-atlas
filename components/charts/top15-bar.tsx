"use client";

import { BarChart3 } from "lucide-react";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { Plot } from "@/components/charts/plot";
import { ChartShell } from "@/components/ui/chart-shell";
import { getConsumption, getDepartmentsByYear, isInView } from "@/lib/data";
import {
  ACCENT,
  ACCENT_DIM,
  TEXT,
  baseConfig,
  baseLayout,
} from "@/lib/plotly-theme";
import { useDashboardStore } from "@/lib/store";
import type { Department } from "@/lib/data.types";

const NEUTRAL_BAR = "rgba(120,120,140,0.55)";

function displayValue(
  d: Department,
  perCapita: boolean,
  energy: "Totale" | "Électricité" | "Gaz",
  sector: string,
): number {
  const raw = getConsumption(d, energy, sector as Parameters<typeof getConsumption>[2]);
  if (!perCapita) return raw / 1_000_000; // → TWh in absolute mode
  return d.population && d.population > 0 ? raw / d.population : 0;
}

export function Top15Bar() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const sector = useDashboardStore((s) => s.sector);
  const view = useDashboardStore((s) => s.view);
  const region = useDashboardStore((s) => s.region);
  const displayMode = useDashboardStore((s) => s.displayMode);
  const selectedDept = useDashboardStore((s) => s.selectedDept);
  const setSelectedDept = useDashboardStore((s) => s.setSelectedDept);

  const { rows, mean } = useMemo(() => {
    const perCapita = displayMode === "per-capita";
    let pool = getDepartmentsByYear(year).filter((d) =>
      isInView(view, d.code),
    );
    if (region !== "all") {
      pool = pool.filter((d) => d.region === region);
    }
    const enriched = pool.map((d) => ({
      d,
      v: displayValue(d, perCapita, energy, sector),
    }));
    const sorted = enriched
      .filter((r) => Number.isFinite(r.v) && r.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 15);
    const meanValue =
      enriched.length > 0
        ? enriched.reduce((acc, r) => acc + r.v, 0) / enriched.length
        : 0;
    return { rows: sorted, mean: meanValue };
  }, [year, energy, sector, view, region, displayMode]);

  const perCapita = displayMode === "per-capita";
  const unit = perCapita ? "MWh/hab" : "TWh";

  if (rows.length === 0) {
    return (
      <ChartShell
        eyebrow="TOP 15"
        title={`Départements (${unit})`}
        icon={BarChart3}
        empty={{
          title: "Aucun département à afficher pour ces filtres.",
          description: "Élargissez la région ou la vue pour voir un classement.",
        }}
        minBodyHeight={400}
      />
    );
  }

  const orderedAsc = [...rows].reverse(); // bottom-to-top in horizontal bar

  // Region color is intentionally dropped — one categorical color
  // axis is enough. Default neutral bars; selected dept gets the brand accent.
  const trace: Data = {
    type: "bar",
    orientation: "h",
    x: orderedAsc.map((r) => r.v),
    y: orderedAsc.map((r) => r.d.name),
    marker: {
      color: orderedAsc.map((r) =>
        r.d.code === selectedDept ? ACCENT : NEUTRAL_BAR,
      ),
      line: {
        color: orderedAsc.map((r) =>
          r.d.code === selectedDept ? ACCENT : "transparent",
        ),
        width: 1,
      },
    },
    text: orderedAsc.map((r) => r.v.toFixed(2)),
    textposition: "outside",
    textfont: { color: TEXT.muted, size: 10 },
    customdata: orderedAsc.map((r) => r.d.code),
    hovertemplate: `<b>%{y}</b><br>%{x:.2f} ${unit}<extra></extra>`,
  };

  const layout: Partial<Layout> = {
    ...baseLayout,
    height: Math.max(400, orderedAsc.length * 26 + 80),
    margin: { l: 160, r: 60, t: 16, b: 40 },
    xaxis: {
      ...baseLayout.xaxis,
      title: { text: unit },
      automargin: true,
    },
    yaxis: {
      ...baseLayout.yaxis,
      automargin: true,
      tickfont: { size: 11, color: TEXT.muted },
    },
    shapes:
      mean > 0
        ? [
            {
              type: "line",
              x0: mean,
              x1: mean,
              yref: "paper",
              y0: 0,
              y1: 1,
              line: { color: ACCENT_DIM, width: 1.5, dash: "dot" },
            },
          ]
        : undefined,
    annotations:
      mean > 0
        ? [
            {
              x: mean,
              y: 1.02,
              yref: "paper",
              xanchor: "left",
              yanchor: "bottom",
              text: `moyenne nat. ${mean.toFixed(2)}`,
              showarrow: false,
              font: { size: 10, color: ACCENT_DIM },
            },
          ]
        : undefined,
  };

  return (
    <ChartShell
      eyebrow="TOP 15"
      title={`Départements (${unit})`}
      icon={BarChart3}
      description={
        perCapita
          ? "Classement par habitant — fait apparaître des leaders différents du classement absolu."
          : undefined
      }
      minBodyHeight={400}
    >
      <Plot
        data={[trace]}
        layout={layout}
        config={baseConfig}
        useResizeHandler
        style={{ width: "100%", height: `${layout.height}px` }}
        onClick={(e) => {
          const point = e.points?.[0] as { customdata?: string } | undefined;
          const code = point?.customdata;
          if (!code) return;
          setSelectedDept(code === selectedDept ? null : code);
        }}
      />
    </ChartShell>
  );
}
