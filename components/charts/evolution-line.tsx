"use client";

import { TrendingUp } from "lucide-react";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { Plot } from "@/components/charts/plot";
import { ChartShell } from "@/components/ui/chart-shell";
import {
  SECTORS_NO_TOTAL,
  YEARS,
  getDepartmentByCode,
  getEvolution,
  getNationalPrediction,
  getPrediction,
} from "@/lib/data";
import { SECTOR, TEXT, baseConfig, baseLayout } from "@/lib/plotly-theme";
import { useDashboardStore } from "@/lib/store";
import type { Sector } from "@/lib/data.types";

interface SectorSeries {
  sector: string;
  history: { year: number; value: number }[];
  prediction: { point: number; ci_low: number; ci_high: number } | null;
}

export function EvolutionLine() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const selectedDept = useDashboardStore((s) => s.selectedDept);

  const series = useMemo<SectorSeries[]>(() => {
    return SECTORS_NO_TOTAL.map((s) => {
      const history = getEvolution(selectedDept, energy, s as Sector);
      const prediction = selectedDept
        ? getPrediction(selectedDept, s as Sector)
        : getNationalPrediction(s as Sector);
      return { sector: s, history, prediction };
    });
  }, [energy, selectedDept]);

  const dept = selectedDept ? getDepartmentByCode(year, selectedDept) : null;
  const title = dept
    ? `Évolution sectorielle — ${dept.name}`
    : "Évolution sectorielle — France";

  const allEmpty = series.every(
    (s) => s.history.every((p) => p.value === 0) && !s.prediction,
  );
  if (allEmpty) {
    return (
      <ChartShell
        eyebrow="ÉVOLUTION"
        title={title}
        icon={TrendingUp}
        empty={{
          title: "Aucune donnée pour la sélection.",
        }}
        minBodyHeight={280}
      />
    );
  }

  const traces: Data[] = [];
  const lastHistYear = YEARS[YEARS.length - 1];

  for (const s of series) {
    const color =
      SECTOR[s.sector as keyof typeof SECTOR] ?? TEXT.muted;
    // Historical line (solid)
    traces.push({
      type: "scatter",
      mode: "lines+markers",
      name: s.sector,
      legendgroup: s.sector,
      x: s.history.map((p) => p.year),
      y: s.history.map((p) => p.value / 1_000_000),
      line: { color, width: 2 },
      marker: { size: 6, color },
      hovertemplate: `<b>${s.sector}</b><br>%{x}: %{y:.2f} TWh<extra></extra>`,
    });

    if (s.prediction && s.history.length > 0) {
      const lastHistPoint = s.history[s.history.length - 1];
      // Dotted predicted segment connecting last historical point to 2025 point
      traces.push({
        type: "scatter",
        mode: "lines+markers",
        name: `${s.sector} (prévision)`,
        legendgroup: s.sector,
        showlegend: false,
        x: [lastHistPoint.year, lastHistYear + 1],
        y: [
          lastHistPoint.value / 1_000_000,
          s.prediction.point / 1_000_000,
        ],
        line: { color, width: 2, dash: "dot" },
        marker: { size: 6, color, symbol: "diamond-open" },
        hovertemplate: `<b>${s.sector}</b> (prévision 2025)<br>%{y:.2f} TWh<extra></extra>`,
      });

      // CI band — fill between ci_low and ci_high at year 2025, anchored to lastHistPoint
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `${s.sector} CI95`,
        legendgroup: s.sector,
        showlegend: false,
        x: [
          lastHistPoint.year,
          lastHistYear + 1,
          lastHistYear + 1,
          lastHistPoint.year,
        ],
        y: [
          lastHistPoint.value / 1_000_000,
          s.prediction.ci_high / 1_000_000,
          s.prediction.ci_low / 1_000_000,
          lastHistPoint.value / 1_000_000,
        ],
        fill: "toself",
        fillcolor: hexToRgba(color, 0.12),
        line: { color: "transparent" },
        hoverinfo: "skip",
      });
    }
  }

  const layout: Partial<Layout> = {
    ...baseLayout,
    height: 360,
    showlegend: true,
    legend: {
      orientation: "h",
      y: -0.2,
      x: 0,
      font: { size: 11, color: TEXT.muted },
    },
    margin: { l: 56, r: 24, t: 36, b: 60 },
    xaxis: {
      ...baseLayout.xaxis,
      tickvals: [...YEARS, lastHistYear + 1],
      ticktext: [...YEARS.map(String), `${lastHistYear + 1}*`],
      tickfont: { size: 11, color: TEXT.muted },
    },
    yaxis: {
      ...baseLayout.yaxis,
      title: { text: "TWh", font: { color: TEXT.muted, size: 11 } },
    },
    annotations: [
      {
        x: lastHistYear + 0.5,
        xref: "x",
        y: 1,
        yref: "paper",
        text: "* Prévision 2025 — IC 95 % large (3 ans de données)",
        showarrow: false,
        font: { size: 10, color: TEXT.muted },
        bgcolor: "rgba(251, 191, 36, 0.05)",
        bordercolor: "rgba(251, 191, 36, 0.20)",
        borderwidth: 1,
        borderpad: 4,
        xanchor: "center",
        yanchor: "top",
      },
    ],
  };

  return (
    <ChartShell
      eyebrow="ÉVOLUTION"
      title={title}
      icon={TrendingUp}
      description="Historique 2022–2024 (trait plein) puis prévision 2025 (pointillés) avec bande IC 95 %."
      minBodyHeight={360}
    >
      <Plot
        data={traces}
        layout={layout}
        config={baseConfig}
        useResizeHandler
        style={{ width: "100%", height: `${layout.height}px` }}
      />
    </ChartShell>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const bigint = parseInt(
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

