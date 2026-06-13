"use client";

import { Map as MapIcon } from "lucide-react";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { Plot } from "@/components/charts/plot";
import { ChartShell } from "@/components/ui/chart-shell";
import {
  clusters,
  geojson,
  getCluster,
  getConsumption,
  getDepartmentsByYear,
  isInView,
} from "@/lib/data";
import { ACCENT, BG, CLUSTER, SEQUENTIAL, baseConfig } from "@/lib/plotly-theme";
import { useDashboardStore } from "@/lib/store";
import type { Department } from "@/lib/data.types";

function valueOf(d: Department, perCapita: boolean): number {
  const raw = getConsumption(d, "Totale", "totale");
  if (!perCapita) return raw;
  return d.population && d.population > 0 ? raw / d.population : 0;
}

export function ChoroplethMap() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const sector = useDashboardStore((s) => s.sector);
  const view = useDashboardStore((s) => s.view);
  const displayMode = useDashboardStore((s) => s.displayMode);
  const mapColorMode = useDashboardStore((s) => s.mapColorMode);
  const selectedDept = useDashboardStore((s) => s.selectedDept);
  const setSelectedDept = useDashboardStore((s) => s.setSelectedDept);

  const traceData = useMemo(() => {
    const all = getDepartmentsByYear(year).filter((d) => isInView(view, d.code));
    if (all.length === 0) return null;

    if (mapColorMode === "cluster") {
      const codes = all.map((d) => d.code);
      const clusterIds = all.map((d) => getCluster(d.code)?.id ?? -1);
      const labels = all.map((d) => {
        const c = getCluster(d.code);
        return c ? `${d.name}<br>${c.label}` : `${d.name}<br>(non classé)`;
      });
      return { codes, z: clusterIds, text: labels, mode: "cluster" as const };
    }

    const perCapita = displayMode === "per-capita";
    const codes = all.map((d) => d.code);
    // Convert z to display units up-front so the Plotly colorbar shows
    // human-readable values (TWh in absolute mode, MWh/hab per capita).
    // Keeping raw MWh in z made the colorbar label ticks like '40M' which
    // collided with the 'TWh' axis title.
    const z = all.map((d) => {
      const raw = perCapita
        ? valueOf(d, true) // MWh/hab — already small numbers
        : getConsumption(d, energy, sector) / 1_000_000; // MWh → TWh
      return raw;
    });
    const text = all.map((d, i) => {
      const v = z[i];
      const formatted = perCapita
        ? `${v.toFixed(2)} MWh/hab`
        : `${v.toFixed(2)} TWh`;
      return `${d.name}<br>${formatted}`;
    });
    return { codes, z, text, mode: "consumption" as const };
  }, [year, energy, sector, view, displayMode, mapColorMode]);

  if (!traceData) {
    return (
      <ChartShell
        eyebrow="CARTE"
        title="Cartographie des consommations"
        icon={MapIcon}
        empty={{
          title: "Aucune donnée pour cette vue",
          description: "Sélectionnez une autre vue géographique ou réinitialisez les filtres.",
        }}
      />
    );
  }

  const isCluster = traceData.mode === "cluster";
  const colorscale = isCluster
    ? buildCategoricalColorscale(clusters.k_chosen, CLUSTER)
    : buildSequentialColorscale(SEQUENTIAL);

  return (
    <ChartShell
      eyebrow="CARTE"
      title={
        isCluster
          ? "Profils par cluster"
          : displayMode === "per-capita"
            ? "Consommation per habitant"
            : "Consommation totale"
      }
      icon={MapIcon}
      minBodyHeight={520}
    >
      <PlotMap
        traceData={traceData}
        isCluster={isCluster}
        colorscale={colorscale}
        selectedDept={selectedDept}
        displayMode={displayMode}
        view={view}
        kChosen={clusters.k_chosen}
        onSelect={setSelectedDept}
      />
      {isCluster ? <ClusterLegend /> : null}
    </ChartShell>
  );
}

interface PlotMapProps {
  traceData: {
    codes: string[];
    z: number[];
    text: string[];
    mode: "consumption" | "cluster";
  };
  isCluster: boolean;
  colorscale: Array<[number, string]>;
  selectedDept: string | null;
  displayMode: "absolute" | "per-capita";
  view: string;
  kChosen: number;
  onSelect: (code: string) => void;
}

/**
 * Memoized inner component using Plotly's CLASSIC `choropleth` trace
 * type (D3/SVG-based) instead of the maplibre-backed `choroplethmap`.
 *
 * Why the pivot: in dev with React Strict Mode + the orchestrated
 * reveal motion, the maplibre canvas never finished allocating — the
 * carto style.json fetched HTTP 200 but no tile requests followed and
 * no canvas DOM appeared. Atlas wall (native SVG) was unaffected. The
 * SVG-based `choropleth` trace is bombproof across versions, ships
 * pure DOM nodes, animates cleanly with React lifecycle, and matches
 * the editorial / NYT-Graphics aesthetic better than a satellite
 * basemap anyway (no carto tiles, just our polygons against the dark
 * editorial bg).
 *
 * Stable refs for `data` and `layout` are still preserved via useMemo
 * so the reduced-motion patch in plot.tsx behaves
 * predictably.
 */
function PlotMap({
  traceData,
  isCluster,
  colorscale,
  selectedDept,
  displayMode,
  view,
  kChosen,
  onSelect,
}: PlotMapProps) {
  // Filter the geojson to features visible in the active view, so that
  // `geo.fitbounds = "geojson"` snaps to the correct region (the full
  // 101 features include DOM-TOM scattered across the globe).
  const filteredGeojson = useMemo(() => {
    const features = geojson.features.filter((f) => isInView(view, f.id));
    return { type: "FeatureCollection" as const, features };
  }, [view]);

  const data = useMemo<Data[]>(
    () => [
      {
        type: "choropleth",
        geojson: filteredGeojson as unknown as object,
        locations: traceData.codes,
        z: traceData.z,
        featureidkey: "properties.code",
        colorscale,
        marker: {
          line: {
            width: traceData.codes.map((c) => (c === selectedDept ? 2.2 : 0.5)),
            color: traceData.codes.map((c) =>
              c === selectedDept ? ACCENT : "rgba(255,255,255,0.18)",
            ),
          },
        },
        zmin: isCluster ? 0 : undefined,
        zmax: isCluster ? kChosen - 1 : undefined,
        showscale: !isCluster,
        colorbar: !isCluster
          ? {
              title: {
                text: displayMode === "per-capita" ? "MWh/hab" : "TWh",
                side: "top",
                font: { size: 10, color: "#9a9aa3" },
              },
              tickformat: displayMode === "per-capita" ? ".1f" : ".0f",
              thickness: 8,
              len: 0.6,
              x: 1.02,
              bgcolor: "rgba(0,0,0,0)",
              bordercolor: "rgba(255,255,255,0.08)",
              borderwidth: 1,
              tickfont: { color: "#9a9aa3", size: 11 },
              outlinecolor: "rgba(255,255,255,0.08)",
            }
          : undefined,
        hovertemplate: "%{text}<extra></extra>",
        text: traceData.text,
      } as unknown as Data,
    ],
    [
      filteredGeojson,
      traceData,
      isCluster,
      colorscale,
      selectedDept,
      displayMode,
      kChosen,
    ],
  );

  const layout = useMemo<Partial<Layout>>(
    () =>
      ({
        // No baseLayout spread — its xaxis/yaxis are irrelevant for
        // a geo subplot and would cause Plotly to allocate a phantom
        // cartesian alongside the map.
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 0, r: 0, t: 0, b: 0 },
        autosize: true,
        geo: {
          // No basemap — just our polygons against the editorial bg.
          bgcolor: "rgba(0,0,0,0)",
          showcoastlines: false,
          showcountries: false,
          showland: false,
          showocean: false,
          showsubunits: false,
          showlakes: false,
          showrivers: false,
          showframe: false,
          framewidth: 0,
          fitbounds: "geojson",
          projection: { type: "mercator" },
        },
      }) as unknown as Partial<Layout>,
    [],
  );

  return (
    <div style={{ background: BG.deep, borderRadius: "0.5rem" }}>
      <Plot
        data={data}
        layout={layout}
        config={baseConfig}
        useResizeHandler
        style={{ width: "100%", height: "480px" }}
        onClick={(e) => {
          const point = e.points?.[0];
          if (!point) return;
          const code = (point as { location?: string }).location;
          if (!code) return;
          onSelect(code);
        }}
      />
    </div>
  );
}

function buildSequentialColorscale(
  stops: readonly string[],
): Array<[number, string]> {
  return stops.map((c, i) => [i / (stops.length - 1), c]);
}

function buildCategoricalColorscale(
  k: number,
  palette: readonly string[],
): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  for (let i = 0; i < k; i++) {
    const t = k === 1 ? 0 : i / (k - 1);
    out.push([t, palette[i % palette.length]]);
  }
  return out;
}

function ClusterLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {clusters.clusters.map((c, i) => (
        <span key={c.id} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: CLUSTER[i % CLUSTER.length] }}
            aria-hidden
          />
          <span className="text-muted-foreground">
            {c.label} <span className="text-text-subtle">({c.size})</span>
          </span>
        </span>
      ))}
    </div>
  );
}
