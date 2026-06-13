"use client";

import { Grid3x3 } from "lucide-react";
import { useMemo } from "react";
import { ChartShell } from "@/components/ui/chart-shell";
import {
  geojson,
  getCluster,
  getConsumption,
  getDepartmentByCode,
  getDepartmentsByYear,
  isInView,
} from "@/lib/data";
import { ACCENT, BG, CLUSTER, SEQUENTIAL, TEXT } from "@/lib/tokens";
import { useDashboardStore } from "@/lib/store";
import type { Department } from "@/lib/data.types";

/* ───────────────────────────────────────────────────────────────────
 * AtlasWall — small-multiples view of all 101 departments.
 *
 * 100 % SVG (no Plotly) so the bundle stays small and we control every
 * pixel. One <button> per dept (native keyboard support). Event
 * delegation on the grid: the parent reads data-code from the click
 * target — no 101 handlers.
 *
 * Each silhouette is bbox-normalized to a uniform 64×64 tile, so the
 * shape says "which dept" and the FILL says "what value". Mayotte and
 * Nord render the same size — this is the small-multiples convention.
 * ─────────────────────────────────────────────────────────────────── */

const TILE_SIZE = 64;
const PADDING = 6;

interface TilePath {
  code: string;
  d: string; // SVG path
  name: string;
}

type Coord = [number, number];
type Ring = Coord[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

function isMultiPolygon(geom: { type: string }): boolean {
  return geom.type === "MultiPolygon";
}

function flattenCoords(geom: {
  type: string;
  coordinates: unknown;
}): Polygon[] {
  if (geom.type === "Polygon") {
    return [geom.coordinates as Polygon];
  }
  if (isMultiPolygon(geom)) {
    return geom.coordinates as MultiPolygon;
  }
  return [];
}

function buildPath(geom: { type: string; coordinates: unknown }): string {
  // Compute bbox across all rings.
  const polygons = flattenCoords(geom);
  if (polygons.length === 0) return "";
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polygons) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const inner = TILE_SIZE - PADDING * 2;
  const scale = Math.min(inner / w, inner / h);
  const offsetX = (TILE_SIZE - w * scale) / 2;
  const offsetY = (TILE_SIZE - h * scale) / 2;

  const transform = (x: number, y: number): [number, number] => {
    const sx = (x - minX) * scale + offsetX;
    // SVG y axis grows downward; geographic latitude grows upward → flip.
    const sy = TILE_SIZE - ((y - minY) * scale + offsetY);
    return [sx, sy];
  };

  const parts: string[] = [];
  for (const poly of polygons) {
    for (const ring of poly) {
      const points = ring
        .map(([x, y], i) => {
          const [sx, sy] = transform(x, y);
          return `${i === 0 ? "M" : "L"}${sx.toFixed(2)},${sy.toFixed(2)}`;
        })
        .join(" ");
      parts.push(`${points}Z`);
    }
  }
  return parts.join(" ");
}

const TILE_PATHS: TilePath[] = (geojson.features ?? []).map((f) => ({
  code: f.id,
  name: f.properties.name,
  d: buildPath(f.geometry as { type: string; coordinates: unknown }),
}));

function fillForDept(
  d: Department | undefined,
  mode: "consumption" | "cluster",
  perCapita: boolean,
  energy: import("@/lib/data.types").Energy,
  sector: import("@/lib/data.types").Sector,
  minVal: number,
  maxVal: number,
): string {
  if (!d) return BG.elevated;
  if (mode === "cluster") {
    const cluster = getCluster(d.code);
    if (!cluster) return BG.elevated;
    return CLUSTER[cluster.id % CLUSTER.length];
  }
  const raw = getConsumption(d, energy, sector);
  const v = perCapita
    ? d.population && d.population > 0
      ? raw / d.population
      : 0
    : raw;
  if (!Number.isFinite(v) || v <= 0 || maxVal === minVal) return BG.elevated;
  const t = Math.max(0, Math.min(1, (v - minVal) / (maxVal - minVal)));
  // Map t∈[0,1] to one of SEQUENTIAL stops (5 stops).
  const idx = Math.min(SEQUENTIAL.length - 1, Math.floor(t * SEQUENTIAL.length));
  return SEQUENTIAL[idx];
}

export function AtlasWall() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const sector = useDashboardStore((s) => s.sector);
  const view = useDashboardStore((s) => s.view);
  const displayMode = useDashboardStore((s) => s.displayMode);
  const mapColorMode = useDashboardStore((s) => s.mapColorMode);
  const selectedDept = useDashboardStore((s) => s.selectedDept);
  const setSelectedDept = useDashboardStore((s) => s.setSelectedDept);

  const perCapita = displayMode === "per-capita";

  const { tiles, valueFor } = useMemo(() => {
    const inView = TILE_PATHS.filter((t) => isInView(view, t.code));
    const depts = getDepartmentsByYear(year);
    const valueMap = new Map<string, number>();
    for (const t of inView) {
      const d = depts.find((x) => x.code === t.code);
      if (!d) continue;
      const raw = getConsumption(d, energy, sector);
      const v = perCapita
        ? d.population && d.population > 0
          ? raw / d.population
          : 0
        : raw;
      valueMap.set(t.code, v);
    }
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const v of valueMap.values()) {
      if (Number.isFinite(v) && v > 0) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    if (!Number.isFinite(minVal)) minVal = 0;
    if (!Number.isFinite(maxVal)) maxVal = 1;
    return { tiles: inView, valueFor: { min: minVal, max: maxVal, valueMap } };
  }, [year, energy, sector, view, perCapita]);

  // Event delegation: read data-code from the closest button ancestor.
  const handleSelect = (code: string) => {
    setSelectedDept(code === selectedDept ? null : code);
  };
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLElement>("[data-code]");
    if (!btn) return;
    const code = btn.getAttribute("data-code");
    if (code) handleSelect(code);
  };

  if (tiles.length === 0) {
    return (
      <ChartShell
        eyebrow="ATLAS WALL"
        title="Vue alternative — silhouettes"
        icon={Grid3x3}
        empty={{
          title: "Aucun département à afficher pour cette vue.",
        }}
        minBodyHeight={420}
      />
    );
  }

  const titleSuffix = mapColorMode === "cluster"
    ? "Profils par cluster"
    : perCapita
      ? "Consommation par habitant"
      : "Consommation totale";

  return (
    <ChartShell
      eyebrow="ATLAS WALL"
      title={titleSuffix}
      icon={Grid3x3}
      description="101 silhouettes normalisées : la forme dit le département, la couleur la valeur."
      minBodyHeight={520}
    >
      <div
        aria-label="Départements français — vue Atlas wall"
        className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-1.5 md:gap-2"
        onClick={handleClick}
      >
        {tiles.map((t) => {
          const dept = getDepartmentByCode(year, t.code);
          const fill = fillForDept(
            dept,
            mapColorMode,
            perCapita,
            energy,
            sector,
            valueFor.min,
            valueFor.max,
          );
          const v = valueFor.valueMap.get(t.code) ?? 0;
          const valueLabel =
            mapColorMode === "cluster"
              ? (dept ? getCluster(dept.code)?.label ?? "non classé" : "")
              : perCapita
                ? `${v.toFixed(2)} MWh/hab`
                : `${(v / 1_000_000).toFixed(2)} TWh`;
          const ariaLabel = dept
            ? `Sélectionner ${dept.name} — ${valueLabel}`
            : `Sélectionner ${t.name}`;
          const isSelected = t.code === selectedDept;
          return (
            <button
              key={t.code}
              type="button"
              data-code={t.code}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              title={`${t.name} · ${valueLabel}`}
              className="group relative aspect-square rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-transform hover:scale-[1.04]"
              style={{
                backgroundColor: BG.panel,
                border: `1px solid ${
                  isSelected ? ACCENT : "rgba(255,255,255,0.06)"
                }`,
                contain: "paint",
                boxShadow: isSelected
                  ? `0 0 0 1px ${ACCENT}, 0 0 16px rgba(232,93,4,0.25)`
                  : "none",
              }}
            >
              <svg
                viewBox={`0 0 ${TILE_SIZE} ${TILE_SIZE}`}
                width="100%"
                height="100%"
                aria-hidden
                className="pointer-events-none"
              >
                <path
                  d={t.d}
                  fill={fill}
                  stroke={isSelected ? ACCENT : "rgba(0,0,0,0.5)"}
                  strokeWidth={isSelected ? 1.5 : 0.4}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span
                className="absolute bottom-0.5 right-1 text-[8px] tabular-nums font-mono leading-none opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ color: TEXT.subtle }}
              >
                {t.code}
              </span>
            </button>
          );
        })}
      </div>

      {mapColorMode !== "cluster" ? (
        <RampLegend
          min={valueFor.min}
          max={valueFor.max}
          unit={perCapita ? "MWh/hab" : "MWh"}
        />
      ) : null}
    </ChartShell>
  );
}

function RampLegend({
  min,
  max,
  unit,
}: {
  min: number;
  max: number;
  unit: string;
}) {
  const formatVal = (v: number): string => {
    if (unit === "MWh/hab") return v.toFixed(1);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}T`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}G`;
    return v.toFixed(0);
  };
  return (
    <div className="mt-3 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.14em]">
      <span style={{ color: TEXT.subtle }}>{formatVal(min)}{unit === "MWh/hab" ? "" : ""}</span>
      <div
        className="flex h-2 flex-1 rounded-sm overflow-hidden"
        aria-hidden
      >
        {SEQUENTIAL.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>
      <span style={{ color: TEXT.subtle }}>{formatVal(max)}</span>
      <span className="text-text-subtle">{unit === "MWh/hab" ? unit : `${unit} (5 classes)`}</span>
    </div>
  );
}
