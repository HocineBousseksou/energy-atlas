"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, GitCompare } from "lucide-react";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { Plot } from "@/components/charts/plot";
import { Button } from "@/components/ui/button";
import { ChartShell } from "@/components/ui/chart-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SECTORS_NO_TOTAL,
  YEARS,
  getCluster,
  getConsumption,
  getDepartmentByCode,
  getDepartmentsByYear,
  getEvolution,
} from "@/lib/data";
import {
  ACCENT,
  SECTOR,
  TEXT,
  baseConfig,
  baseLayout,
} from "@/lib/plotly-theme";
import { useDashboardStore } from "@/lib/store";
import type { Department, Sector } from "@/lib/data.types";

function formatTwh(mwh: number): string {
  return `${(mwh / 1_000_000).toFixed(2)} TWh`;
}

function formatPerCapita(mwh: number, pop: number | null): string {
  if (!pop) return "—";
  return `${(mwh / pop).toFixed(2)} MWh/hab`;
}

export function DeptComparator() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const selectedDept = useDashboardStore((s) => s.selectedDept);
  const comparisonDept = useDashboardStore((s) => s.comparisonDept);
  const setComparisonDept = useDashboardStore((s) => s.setComparisonDept);

  const a = selectedDept ? getDepartmentByCode(year, selectedDept) : null;
  const b = comparisonDept ? getDepartmentByCode(year, comparisonDept) : null;

  const candidates = useMemo(
    () =>
      getDepartmentsByYear(year)
        .filter((d) => d.code !== selectedDept)
        .sort((x, y) => x.name.localeCompare(y.name, "fr")),
    [year, selectedDept],
  );

  if (!a) {
    return (
      <ChartShell
        eyebrow="COMPARATEUR"
        title="Comparer deux départements"
        icon={GitCompare}
        empty={{
          title: "Sélectionnez un premier département",
          description:
            "Cliquez sur la carte ou sur une barre du Top 15 pour activer le comparateur.",
        }}
      />
    );
  }

  if (!b) {
    return (
      <ChartShell
        eyebrow="COMPARATEUR"
        title={`Comparer ${a.name} avec…`}
        icon={GitCompare}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select value="" onValueChange={(v) => v && setComparisonDept(v)}>
            <SelectTrigger
              className="w-[260px]"
              aria-label="Choisir un département à comparer"
            >
              <SelectValue placeholder="Choisir un département…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {d.name} · {d.region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            Sélectionnez un second département pour voir les écarts par secteur.
          </span>
        </div>
      </ChartShell>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${a.code}-${b.code}`}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <ChartShell
          eyebrow="COMPARATEUR"
          title={`${a.name} ↔ ${b.name}`}
          icon={GitCompare}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComparisonDept(null)}
            >
              Retirer
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DeptStrip d={a} energy={energy} accent />
              <DeptStrip d={b} energy={energy} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <DualEvolution a={a} b={b} energy={energy} />
              <DeltaTable a={a} b={b} energy={energy} />
            </div>
          </div>
        </ChartShell>
      </motion.div>
    </AnimatePresence>
  );
}

function DeptStrip({
  d,
  energy,
  accent = false,
}: {
  d: Department;
  energy: import("@/lib/data.types").Energy;
  accent?: boolean;
}) {
  const cluster = getCluster(d.code);
  const total = getConsumption(d, energy, "totale");
  return (
    <div
      className="rounded-lg border p-3 space-y-1.5 bg-card/30"
      style={
        accent
          ? { borderColor: ACCENT, boxShadow: "0 0 24px rgba(232,93,4,0.10)" }
          : { borderColor: "rgba(255,255,255,0.06)" }
      }
      aria-label={
        accent
          ? `${d.name} — département de référence`
          : `${d.name} — département comparé`
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">
          {d.name}
          {accent ? (
            <span className="sr-only"> (département de référence)</span>
          ) : null}
        </h3>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-subtle">
          {d.region}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <Field label="Total" value={formatTwh(total)} />
        <Field label="Population" value={d.population ? d.population.toLocaleString("fr-FR") : "—"} />
        <Field label="Per habitant" value={formatPerCapita(total, d.population)} />
        <Field label="Profil" value={cluster ? cluster.label : "—"} />
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </>
  );
}

function DualEvolution({
  a,
  b,
  energy,
}: {
  a: Department;
  b: Department;
  energy: import("@/lib/data.types").Energy;
}) {
  const ax = getEvolution(a.code, energy, "totale");
  const bx = getEvolution(b.code, energy, "totale");
  const traces: Data[] = [
    {
      type: "scatter",
      mode: "lines+markers",
      name: a.name,
      x: ax.map((p) => p.year),
      y: ax.map((p) => p.value / 1_000_000),
      line: { color: ACCENT, width: 2 },
      marker: { color: ACCENT, size: 7 },
      hovertemplate: `${a.name}<br>%{x}: %{y:.2f} TWh<extra></extra>`,
    },
    {
      type: "scatter",
      mode: "lines+markers",
      name: b.name,
      x: bx.map((p) => p.year),
      y: bx.map((p) => p.value / 1_000_000),
      line: { color: TEXT.primary, width: 2 },
      marker: { color: TEXT.primary, size: 7 },
      hovertemplate: `${b.name}<br>%{x}: %{y:.2f} TWh<extra></extra>`,
    },
  ];
  const layout: Partial<Layout> = {
    ...baseLayout,
    height: 240,
    showlegend: true,
    legend: {
      orientation: "h",
      y: -0.25,
      x: 0,
      font: { color: TEXT.muted, size: 11 },
    },
    margin: { l: 56, r: 24, t: 24, b: 48 },
    xaxis: {
      ...baseLayout.xaxis,
      tickvals: [...YEARS],
      tickfont: { size: 11, color: TEXT.muted },
    },
    yaxis: {
      ...baseLayout.yaxis,
      title: { text: "TWh", font: { color: TEXT.muted, size: 11 } },
    },
  };
  return (
    <div
      className="rounded-lg border p-3 space-y-2 bg-card/30"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <h3 className="text-sm font-medium">Évolution comparée</h3>
      <Plot
        data={traces}
        layout={layout}
        config={baseConfig}
        useResizeHandler
        style={{ width: "100%", height: "240px" }}
      />
    </div>
  );
}

function DeltaTable({
  a,
  b,
  energy,
}: {
  a: Department;
  b: Department;
  energy: import("@/lib/data.types").Energy;
}) {
  const rows = SECTORS_NO_TOTAL.map((s) => {
    const va = getConsumption(a, energy, s as Sector);
    const vb = getConsumption(b, energy, s as Sector);
    const delta = vb === 0 ? null : ((va - vb) / vb) * 100;
    return { s, va, vb, delta };
  });
  return (
    <div
      className="rounded-lg border p-3 space-y-2 bg-card/30"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <h3 className="text-sm font-medium">
        Δ par secteur
      </h3>
      <table className="w-full text-xs">
        <caption className="sr-only">
          Différence par secteur entre {a.name} et {b.name} pour l&apos;énergie {energy}
        </caption>
        <thead>
          <tr
            className="text-text-subtle border-b font-mono uppercase tracking-[0.12em]"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <th scope="col" className="text-left py-2 font-normal text-[10px]">
              Secteur
            </th>
            <th scope="col" className="text-right py-2 font-normal text-[10px]">
              {a.name}
            </th>
            <th scope="col" className="text-right py-2 font-normal text-[10px]">
              {b.name}
            </th>
            <th scope="col" className="text-right py-2 font-normal text-[10px]">
              Δ
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const positive = r.delta !== null && r.delta > 0;
            const negative = r.delta !== null && r.delta < 0;
            const sectorColor = SECTOR[r.s as keyof typeof SECTOR];
            return (
              <tr
                key={r.s}
                className="border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <td className="py-2 capitalize">
                  <span
                    className="inline-block h-2 w-2 rounded-sm mr-2 align-middle"
                    style={{ backgroundColor: sectorColor }}
                    aria-hidden
                  />
                  {r.s}
                </td>
                <td className="py-2 text-right tabular-nums font-mono text-foreground">
                  {(r.va / 1000).toFixed(0)} GWh
                </td>
                <td className="py-2 text-right tabular-nums font-mono text-foreground">
                  {(r.vb / 1000).toFixed(0)} GWh
                </td>
                <td
                  className={`py-2 text-right tabular-nums font-mono inline-flex items-center justify-end gap-1 w-full ${
                    positive
                      ? "text-success"
                      : negative
                        ? "text-danger"
                        : "text-text-subtle"
                  }`}
                >
                  {positive ? (
                    <ArrowUp className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                  ) : negative ? (
                    <ArrowDown className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                  ) : null}
                  <span>
                    {r.delta === null
                      ? "—"
                      : `${positive ? "+" : ""}${r.delta.toFixed(1)}%`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

