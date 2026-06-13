"use client";

import { AlertTriangle } from "lucide-react";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { ExplanationPanel } from "@/components/anomalies/explanation-panel";
import { Plot } from "@/components/charts/plot";
import { ChartShell } from "@/components/ui/chart-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  YEARS,
  anomalies,
  getAnomalyHits,
  getConsumption,
  getDepartmentByCode,
  getDepartmentsByYear,
} from "@/lib/data";
import { ACCENT, TEXT, baseConfig, baseLayout } from "@/lib/plotly-theme";
import {
  type AnomalyMethod,
  useDashboardStore,
} from "@/lib/store";

const METHOD_LABELS: Record<AnomalyMethod, string> = {
  zscore: "Z-Score",
  iqr: "IQR",
  iforest: "Isolation Forest",
};

const METHOD_HINTS: Record<AnomalyMethod, string> = {
  zscore: "Suppose une distribution normale. Sensible aux outliers.",
  iqr: "Robuste, basé sur les quartiles. 1D par secteur.",
  iforest: "Multidimensionnel sur les 5 secteurs. Opaque.",
};

function thresholdBounds(method: AnomalyMethod): {
  min: number;
  max: number;
  step: number;
} {
  if (method === "iforest") return { min: 0.01, max: 0.5, step: 0.01 };
  if (method === "iqr") return { min: 1.0, max: 3.0, step: 0.1 };
  return { min: 1.0, max: 5.0, step: 0.1 };
}

export function AnomaliesSection() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const sector = useDashboardStore((s) => s.sector);
  const method = useDashboardStore((s) => s.anomalyMethod);
  const threshold = useDashboardStore((s) => s.anomalyThreshold);
  const setMethod = useDashboardStore((s) => s.setAnomalyMethod);
  const setThreshold = useDashboardStore((s) => s.setAnomalyThreshold);
  const selectedDept = useDashboardStore((s) => s.selectedDept);
  const setSelectedDept = useDashboardStore((s) => s.setSelectedDept);

  const bounds = thresholdBounds(method);

  const hitCodes = useMemo(() => {
    const hits = getAnomalyHits(method, year, energy, sector, threshold);
    return new Set(hits.map((h) => h.code));
  }, [method, year, energy, sector, threshold]);

  const hits = useMemo(
    () => getAnomalyHits(method, year, energy, sector, threshold),
    [method, year, energy, sector, threshold],
  );

  const scatter = useMemo(() => {
    const depts = getDepartmentsByYear(year);
    const prevYear = year - 1;
    const hasPrev = YEARS.includes(prevYear);
    const points = depts.map((d) => {
      const value = getConsumption(d, energy, sector);
      let yoy = 0;
      if (hasPrev) {
        const prev = getDepartmentByCode(prevYear, d.code);
        if (prev) {
          const prevVal = getConsumption(prev, energy, sector);
          yoy = prevVal === 0 ? 0 : ((value - prevVal) / prevVal) * 100;
        }
      }
      return { code: d.code, name: d.name, x: value / 1_000_000, y: yoy };
    });
    return points;
  }, [year, energy, sector]);

  const traces: Data[] = [
    {
      type: "scatter",
      mode: "markers",
      name: "Normal",
      x: scatter.filter((p) => !hitCodes.has(p.code)).map((p) => p.x),
      y: scatter.filter((p) => !hitCodes.has(p.code)).map((p) => p.y),
      text: scatter
        .filter((p) => !hitCodes.has(p.code))
        .map((p) => p.name),
      marker: { color: "rgba(120,120,140,0.55)", size: 7 },
      hovertemplate: "%{text}<br>%{x:.2f} TWh · YoY %{y:.1f}%<extra></extra>",
    },
    {
      type: "scatter",
      mode: "markers",
      name: "Anomalie",
      x: scatter.filter((p) => hitCodes.has(p.code)).map((p) => p.x),
      y: scatter.filter((p) => hitCodes.has(p.code)).map((p) => p.y),
      text: scatter.filter((p) => hitCodes.has(p.code)).map((p) => p.name),
      marker: {
        color: ACCENT,
        size: 11,
        line: { color: "#000", width: 1 },
      },
      hovertemplate:
        "<b>%{text}</b><br>%{x:.2f} TWh · YoY %{y:.1f}%<extra></extra>",
    },
  ];

  const layout: Partial<Layout> = {
    ...baseLayout,
    height: 320,
    showlegend: true,
    legend: {
      orientation: "h",
      y: -0.25,
      x: 0,
      font: { color: TEXT.muted, size: 11 },
    },
    margin: { l: 56, r: 24, t: 16, b: 48 },
    xaxis: {
      ...baseLayout.xaxis,
      title: { text: "Consommation (TWh)", font: { color: TEXT.muted, size: 11 } },
    },
    yaxis: {
      ...baseLayout.yaxis,
      title: { text: "YoY (%)", font: { color: TEXT.muted, size: 11 } },
      zeroline: true,
    },
  };

  const ifIneligibleForSector =
    method === "iforest" && sector !== "totale" ? (
      <p className="text-xs text-warning">
        Isolation Forest est multidimensionnel sur les 5 secteurs : il ne
        dépend pas du filtre Secteur. Les hits affichés ignorent ce filtre.
      </p>
    ) : null;

  return (
    <ChartShell
      eyebrow="ANOMALIES STATISTIQUES"
      title={`Détection — ${METHOD_LABELS[method]}`}
      icon={AlertTriangle}
      description={METHOD_HINTS[method]}
      minBodyHeight={400}
    >
      <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span
            id="anomaly-method-label"
            className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-subtle"
          >
            Méthode
          </span>
          <Select
            value={method}
            onValueChange={(v) => setMethod(v as AnomalyMethod)}
          >
            <SelectTrigger
              className="w-[180px]"
              aria-labelledby="anomaly-method-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(METHOD_LABELS) as AnomalyMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {METHOD_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[260px]">
          <span
            id="anomaly-threshold-label"
            className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-subtle"
          >
            Seuil <span className="tabular-nums text-foreground">({threshold.toFixed(2)})</span>
          </span>
          <Slider
            aria-labelledby="anomaly-threshold-label"
            value={[threshold]}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v;
              if (typeof next === "number") setThreshold(next);
            }}
          />
          <span className="text-[11px] text-muted-foreground">
            {bounds.min.toFixed(2)} → {bounds.max.toFixed(2)}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          {hits.length} anomalie{hits.length === 1 ? "" : "s"} détectée
          {hits.length === 1 ? "" : "s"}
        </div>
      </div>

      {ifIneligibleForSector}

      <p id="anomaly-chart-kbd-hint" className="sr-only">
        Le nuage de points est interactif à la souris. Pour une sélection au
        clavier, utilisez le tableau ci-dessous.
      </p>
      <div aria-describedby="anomaly-chart-kbd-hint">
        <Plot
          data={traces}
          layout={layout}
          config={baseConfig}
          useResizeHandler
          style={{ width: "100%", height: "320px" }}
          onClick={(e) => {
            const point = e.points?.[0] as { text?: string } | undefined;
            if (!point?.text) return;
            // Find code from name (cheap; 101 depts)
            const found = scatter.find((p) => p.name === point.text);
            if (!found) return;
            setSelectedDept(found.code === selectedDept ? null : found.code);
          }}
        />
      </div>

      {hits.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">
          Aucune anomalie au-dessus du seuil — relâchez le seuil pour en voir.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Département</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Consommation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hits.slice(0, 30).map((h) => {
                const isSelected = h.code === selectedDept;
                const toggle = () =>
                  setSelectedDept(isSelected ? null : h.code);
                return (
                  <TableRow
                    key={h.code}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${h.name} — score ${h.score.toFixed(2)} · ${(h.value / 1_000_000).toFixed(2)} TWh · ${isSelected ? "désélectionner" : "voir détail"}`}
                    className={`cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isSelected ? "bg-muted/40" : ""}`}
                    onClick={toggle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle();
                      }
                    }}
                  >
                    <TableCell>{h.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {h.score.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(h.value / 1_000_000).toFixed(2)} TWh
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Détection statistique seulement. L&apos;explication IA ci-dessous
        ajoute des hypothèses sourcées (avec garde-fous épistémologiques :
        citation obligatoire, taxonomie de confiance, note corrélation
        ≠ causalité).
      </p>

      <ExplanationPanel
        hit={hits.find((h) => h.code === selectedDept) ?? null}
        year={year}
        energy={energy}
        sector={sector}
        method={method}
        threshold={threshold}
      />
      </div>
    </ChartShell>
  );
}

// silences unused export warning when only types are imported elsewhere
export type _AnomalyExports = typeof anomalies;
