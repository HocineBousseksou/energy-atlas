import type {
  AnomalyDataset,
  ClustersDataset,
  Department,
  Energy,
  PredictionsDataset,
  Sector,
} from "./data.types";

import anomaliesRaw from "@/data/anomalies.json";
import clustersRaw from "@/data/clusters.json";
import departmentsRaw from "@/data/departments.json";
import geojsonRaw from "@/data/geojson.json";
import predictionsRaw from "@/data/predictions.json";

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties: { code: string; name: string; region: string };
    geometry: { type: string; coordinates: unknown };
  }>;
}

export const departments = departmentsRaw as unknown as Department[];
export const geojson = geojsonRaw as unknown as GeoJSONFeatureCollection;
export const anomalies = anomaliesRaw as unknown as AnomalyDataset;
export const clusters = clustersRaw as unknown as ClustersDataset;
export const predictions = predictionsRaw as unknown as PredictionsDataset;

export const YEARS: readonly number[] = Array.from(
  new Set(departments.map((d) => d.year)),
).sort((a, b) => a - b);

export const LATEST_YEAR = YEARS[YEARS.length - 1];

export function getDepartmentsByYear(year: number): Department[] {
  return departments.filter((d) => d.year === year);
}

export function getDepartmentByCode(
  year: number,
  code: string,
): Department | undefined {
  return departments.find((d) => d.year === year && d.code === code);
}

export function getConsumption(
  d: Department,
  energy: Energy = "Totale",
  sector: Sector = "totale",
): number {
  return d.consumption[energy]?.[sector] ?? 0;
}

export function getNationalTotal(
  year: number,
  energy: Energy = "Totale",
  sector: Sector = "totale",
): number {
  return getDepartmentsByYear(year).reduce(
    (acc, d) => acc + getConsumption(d, energy, sector),
    0,
  );
}

export function getTopDept(
  year: number,
  energy: Energy = "Totale",
  sector: Sector = "totale",
): Department | undefined {
  return getDepartmentsByYear(year).reduce<Department | undefined>(
    (best, d) =>
      !best || getConsumption(d, energy, sector) > getConsumption(best, energy, sector)
        ? d
        : best,
    undefined,
  );
}

export function getBottomDept(
  year: number,
  energy: Energy = "Totale",
  sector: Sector = "totale",
): Department | undefined {
  return getDepartmentsByYear(year).reduce<Department | undefined>(
    (worst, d) =>
      !worst || getConsumption(d, energy, sector) < getConsumption(worst, energy, sector)
        ? d
        : worst,
    undefined,
  );
}

export function getPercentDeptIncreasingYoY(
  year: number,
  energy: Energy = "Totale",
  sector: Sector = "totale",
): number {
  const previous = year - 1;
  if (!YEARS.includes(previous)) return 0;
  const current = getDepartmentsByYear(year);
  if (current.length === 0) return 0;
  let increasing = 0;
  let comparable = 0;
  for (const d of current) {
    const prev = getDepartmentByCode(previous, d.code);
    if (!prev) continue;
    comparable += 1;
    if (getConsumption(d, energy, sector) > getConsumption(prev, energy, sector)) {
      increasing += 1;
    }
  }
  return comparable === 0 ? 0 : (increasing / comparable) * 100;
}

export function mwhToTwh(mwh: number): number {
  return mwh / 1_000_000;
}

export const REGIONS: readonly string[] = Array.from(
  new Set(departments.map((d) => d.region)),
).sort((a, b) => a.localeCompare(b, "fr"));

export const SECTORS_ALL: readonly Sector[] = [
  "totale",
  "agriculture",
  "industrie",
  "résidentiel",
  "tertiaire",
  "autre",
];

export const SECTORS_NO_TOTAL: readonly Exclude<Sector, "totale">[] = [
  "agriculture",
  "industrie",
  "résidentiel",
  "tertiaire",
  "autre",
];

export const ENERGIES: readonly Energy[] = ["Totale", "Électricité", "Gaz"];

const VIEW_CODES: Record<string, (code: string) => boolean> = {
  metropole: (c) => !c.startsWith("97") && c !== "976",
  antilles: (c) => c === "971" || c === "972",
  "ocean-indien": (c) => c === "974" || c === "976",
  guyane: (c) => c === "973",
  mayotte: (c) => c === "976",
};

export function filterByView(view: string, codes: string[]): string[] {
  if (view === "all") return codes;
  const pred = VIEW_CODES[view];
  return pred ? codes.filter(pred) : codes;
}

export function isInView(view: string, code: string): boolean {
  if (view === "all") return true;
  const pred = VIEW_CODES[view];
  return pred ? pred(code) : true;
}

export function getCluster(code: string): {
  id: number;
  label: string;
  dominant_sector: string;
} | null {
  const assign = clusters.assignments.find((a) => a.code === code);
  if (!assign) return null;
  const desc = clusters.clusters.find((c) => c.id === assign.cluster);
  return desc
    ? { id: desc.id, label: desc.label, dominant_sector: desc.dominant_sector }
    : null;
}

export function getEvolution(
  code: string | null,
  energy: Energy = "Totale",
  sector: Sector = "totale",
): { year: number; value: number }[] {
  if (!code) {
    return YEARS.map((year) => ({
      year,
      value: getNationalTotal(year, energy, sector),
    }));
  }
  return YEARS.map((year) => {
    const d = getDepartmentByCode(year, code);
    return { year, value: d ? getConsumption(d, energy, sector) : 0 };
  });
}

export function getPrediction(
  code: string,
  sector: Sector = "totale",
): { point: number; ci_low: number; ci_high: number } | null {
  const p = predictions.predictions.find(
    (x) => x.code === code && x.sector === sector,
  );
  return p ? { point: p.point, ci_low: p.ci_low, ci_high: p.ci_high } : null;
}

export function getNationalPrediction(
  sector: Sector = "totale",
): { point: number; ci_low: number; ci_high: number } | null {
  const rows = predictions.predictions.filter((p) => p.sector === sector);
  if (rows.length === 0) return null;
  return rows.reduce(
    (acc, p) => ({
      point: acc.point + p.point,
      ci_low: acc.ci_low + p.ci_low,
      ci_high: acc.ci_high + p.ci_high,
    }),
    { point: 0, ci_low: 0, ci_high: 0 },
  );
}

export interface AnomalyHit {
  code: string;
  name: string;
  score: number;
  value: number;
}

export function getAnomalyHits(
  method: "zscore" | "iqr" | "iforest",
  year: number,
  energy: Energy,
  sector: Sector,
  threshold: number,
): AnomalyHit[] {
  if (method === "iforest") {
    const entry = anomalies.iforest[`${year}|${energy}`];
    if (!entry) return [];
    const hits: AnomalyHit[] = [];
    entry.codes.forEach((code, i) => {
      const score = entry.scores[i];
      if (score >= threshold) {
        const d = getDepartmentByCode(year, code);
        if (d) {
          hits.push({
            code,
            name: d.name,
            score,
            value: getConsumption(d, energy, sector),
          });
        }
      }
    });
    return hits.sort((a, b) => b.score - a.score);
  }
  if (method === "zscore") {
    const entry = anomalies.zscore[`${year}|${energy}|${sector}`];
    if (!entry) return [];
    const hits: AnomalyHit[] = [];
    entry.codes.forEach((code, i) => {
      const score = entry.scores[i];
      if (Math.abs(score) >= threshold) {
        const d = getDepartmentByCode(year, code);
        if (d) {
          hits.push({
            code,
            name: d.name,
            score,
            value: getConsumption(d, energy, sector),
          });
        }
      }
    });
    return hits.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }
  // iqr
  const entry = anomalies.iqr[`${year}|${energy}|${sector}`];
  if (!entry) return [];
  const hits: AnomalyHit[] = [];
  entry.codes.forEach((code, i) => {
    const excess = entry.excess[i];
    if (Math.abs(excess) >= threshold) {
      const d = getDepartmentByCode(year, code);
      if (d) {
        hits.push({
          code,
          name: d.name,
          score: excess,
          value: getConsumption(d, energy, sector),
        });
      }
    }
  });
  return hits.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
}
