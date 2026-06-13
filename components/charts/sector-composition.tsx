"use client";

import { Layers } from "lucide-react";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { Plot } from "@/components/charts/plot";
import { ChartShell } from "@/components/ui/chart-shell";
import {
  SECTORS_NO_TOTAL,
  clusters,
  getCluster,
  getConsumption,
  getDepartmentByCode,
  getDepartmentsByYear,
} from "@/lib/data";
import { SECTOR, TEXT, baseConfig, baseLayout } from "@/lib/plotly-theme";
import { useDashboardStore } from "@/lib/store";
import type { Department, Energy, Sector } from "@/lib/data.types";

interface Row {
  label: string;
  pct: Record<string, number>; // sector → %
  total: number; // raw sum, used to mark empty rows
}

function computeRow(label: string, depts: Department[], energy: Energy): Row {
  if (depts.length === 0) return { label, pct: {}, total: 0 };
  const sums: Record<string, number> = {};
  for (const s of SECTORS_NO_TOTAL) sums[s] = 0;
  for (const d of depts) {
    for (const s of SECTORS_NO_TOTAL) {
      sums[s] += getConsumption(d, energy, s);
    }
  }
  const total =
    sums.agriculture +
    sums.industrie +
    sums.résidentiel +
    sums.tertiaire +
    sums.autre;
  if (total === 0) return { label, pct: {}, total: 0 };
  const pct: Record<string, number> = {};
  for (const s of SECTORS_NO_TOTAL) {
    pct[s] = (sums[s] / total) * 100;
  }
  return { label, pct, total };
}

export function SectorComposition() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const selectedDept = useDashboardStore((s) => s.selectedDept);
  const comparisonDept = useDashboardStore((s) => s.comparisonDept);

  const rows = useMemo<Row[]>(() => {
    const all = getDepartmentsByYear(year);
    const out: Row[] = [];
    out.push(computeRow(`France ${year}`, all, energy));

    if (selectedDept) {
      const d = getDepartmentByCode(year, selectedDept);
      if (d) out.push(computeRow(d.name, [d], energy));
    }
    if (comparisonDept) {
      const d = getDepartmentByCode(year, comparisonDept);
      if (d) out.push(computeRow(`vs ${d.name}`, [d], energy));
    }
    if (selectedDept) {
      const cluster = getCluster(selectedDept);
      if (cluster) {
        const members = clusters.assignments
          .filter((a) => a.cluster === cluster.id)
          .map((a) => getDepartmentByCode(year, a.code))
          .filter((d): d is Department => Boolean(d));
        out.push(
          computeRow(
            `Cluster moyen — ${cluster.label} (n=${members.length})`,
            members,
            energy,
          ),
        );
      }
    }
    return out;
  }, [year, energy, selectedDept, comparisonDept]);

  if (rows.length === 0 || rows.every((r) => r.total === 0)) {
    return (
      <ChartShell
        eyebrow="COMPOSITION"
        title="Répartition par secteur"
        icon={Layers}
        empty={{
          title: "Aucune donnée à afficher.",
          description: "Sélectionnez un département ou élargissez les filtres.",
        }}
        minBodyHeight={200}
      />
    );
  }

  const yLabels = rows.map((r) => r.label);
  const traces: Data[] = SECTORS_NO_TOTAL.map((s) => ({
    type: "bar",
    orientation: "h",
    name: s,
    y: yLabels,
    x: rows.map((r) => r.pct[s] ?? 0),
    marker: { color: SECTOR[s as Sector & keyof typeof SECTOR] },
    text: rows.map((r) => {
      const v = r.pct[s] ?? 0;
      return v >= 5 ? `${v.toFixed(0)}%` : "";
    }),
    textposition: "inside",
    insidetextanchor: "middle",
    textfont: { size: 10, color: TEXT.primary },
    hovertemplate: `<b>${s}</b>: %{x:.1f}%<extra>%{y}</extra>`,
  }));

  const layout: Partial<Layout> = {
    ...baseLayout,
    barmode: "stack",
    showlegend: true,
    legend: {
      orientation: "h",
      y: -0.2,
      x: 0,
      font: { size: 11, color: TEXT.muted },
    },
    height: Math.max(180, rows.length * 50 + 80),
    margin: { l: 220, r: 30, t: 16, b: 60 },
    xaxis: {
      ...baseLayout.xaxis,
      range: [0, 100],
      ticksuffix: "%",
      automargin: true,
    },
    yaxis: { ...baseLayout.yaxis, automargin: true },
  };

  return (
    <ChartShell
      eyebrow="COMPOSITION"
      title="Répartition par secteur"
      icon={Layers}
      description="Comparaison France entière, département sélectionné, comparé, et profil-cluster moyen."
      minBodyHeight={Math.max(220, rows.length * 50 + 80)}
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
