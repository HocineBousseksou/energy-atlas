// NB: NOT "use client". This module is imported by both the Client
// dashboard (Zustand hook) and the Server Component at app/page.tsx
// (parseSearchParamsToStoreState only). Zustand's `create` is plain
// state-machine code with no React internals at module evaluation
// time; the React subscription happens INSIDE useDashboardStore() at
// call time. Server components must never call the hook (they don't),
// but they can import the parser helper safely.
import { create } from "zustand";
import type { Energy, Sector } from "./data.types";
import { LATEST_YEAR, YEARS } from "./data";

export type RegionFilter = string;
export type SectorFilter = Sector;
export type ViewPreset =
  | "all"
  | "metropole"
  | "antilles"
  | "ocean-indien"
  | "guyane"
  | "mayotte";
export type AnomalyMethod = "zscore" | "iqr" | "iforest";
export type DisplayMode = "absolute" | "per-capita";
export type MapColorMode = "consumption" | "cluster";
export type MapViewMode = "choropleth" | "atlas-wall";

export interface DemoTourState {
  active: boolean;
  currentStep: number;
  /**
   * Each step has two phases:
   *   "A" — read-only: card centered + backdrop blur, no side-effects.
   *   "B" — observe: card fades out, spotlight on the targeted DOM
   *         element, the step's onEnter side-effect runs.
   * Steps with no phase B (intro / outro) skip directly to the next
   * step at end of phase A.
   */
  phase: "A" | "B";
  startedAt: number | null;
}

export const ALL_REGIONS = "all";

export interface DashboardState {
  year: number;
  energy: Energy;
  region: RegionFilter;
  sector: SectorFilter;
  view: ViewPreset;
  selectedDept: string | null;
  comparisonDept: string | null;
  anomalyMethod: AnomalyMethod;
  anomalyThreshold: number;
  displayMode: DisplayMode;
  mapColorMode: MapColorMode;
  mapViewMode: MapViewMode;
  demoTour: DemoTourState;

  setYear: (y: number) => void;
  setEnergy: (e: Energy) => void;
  setRegion: (r: RegionFilter) => void;
  setSector: (s: SectorFilter) => void;
  setView: (v: ViewPreset) => void;
  setSelectedDept: (code: string | null) => void;
  setComparisonDept: (code: string | null) => void;
  setAnomalyMethod: (m: AnomalyMethod) => void;
  setAnomalyThreshold: (t: number) => void;
  setDisplayMode: (m: DisplayMode) => void;
  setMapColorMode: (m: MapColorMode) => void;
  setMapViewMode: (m: MapViewMode) => void;
  startDemoTour: () => void;
  stopDemoTour: () => void;
  advanceDemoStep: () => void;
  enterDemoPhaseB: () => void;
  hydrate: (patch: Partial<DashboardState>) => void;
}

const DEFAULT_THRESHOLD: Record<AnomalyMethod, number> = {
  zscore: 2,
  iqr: 1.5,
  iforest: 0.1,
};

export const DEFAULT_STATE = {
  year: LATEST_YEAR,
  energy: "Totale" as Energy,
  region: ALL_REGIONS,
  sector: "totale" as SectorFilter,
  view: "metropole" as ViewPreset,
  selectedDept: null as string | null,
  comparisonDept: null as string | null,
  anomalyMethod: "zscore" as AnomalyMethod,
  anomalyThreshold: DEFAULT_THRESHOLD.zscore,
  displayMode: "absolute" as DisplayMode,
  mapColorMode: "consumption" as MapColorMode,
  mapViewMode: "choropleth" as MapViewMode,
  // Demo tour is purely client-side runtime state; not URL-synced
  // (a deep-link with active=true would create a tour-without-context
  // experience that doesn't exist in the design).
  demoTour: {
    active: false,
    currentStep: 0,
    phase: "A",
    startedAt: null,
  } as DemoTourState,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  ...DEFAULT_STATE,
  setYear: (year) => set({ year }),
  setEnergy: (energy) => set({ energy }),
  setRegion: (region) => set({ region }),
  setSector: (sector) => set({ sector }),
  setView: (view) => set({ view }),
  setSelectedDept: (selectedDept) => set({ selectedDept }),
  setComparisonDept: (comparisonDept) => set({ comparisonDept }),
  setAnomalyMethod: (anomalyMethod) =>
    set({ anomalyMethod, anomalyThreshold: DEFAULT_THRESHOLD[anomalyMethod] }),
  setAnomalyThreshold: (anomalyThreshold) => set({ anomalyThreshold }),
  setDisplayMode: (displayMode) => set({ displayMode }),
  setMapColorMode: (mapColorMode) => set({ mapColorMode }),
  setMapViewMode: (mapViewMode) => set({ mapViewMode }),
  startDemoTour: () =>
    set({
      demoTour: {
        active: true,
        currentStep: 0,
        phase: "A",
        startedAt: Date.now(),
      },
    }),
  stopDemoTour: () =>
    // NB: stopDemoTour intentionally does NOT reset other store slices
    // (mapViewMode, displayMode, selectedDept, etc.). Per spec, when
    // the user re-clicks the button mid-tour, the dashboard is left
    // in the state the orchestrator brought it to — they can keep
    // exploring from there manually.
    set({
      demoTour: {
        active: false,
        currentStep: 0,
        phase: "A",
        startedAt: null,
      },
    }),
  advanceDemoStep: () =>
    set((state) => ({
      demoTour: {
        ...state.demoTour,
        currentStep: state.demoTour.currentStep + 1,
        phase: "A",
      },
    })),
  enterDemoPhaseB: () =>
    set((state) => ({
      demoTour: {
        ...state.demoTour,
        phase: "B",
      },
    })),
  hydrate: (patch) => set(patch),
}));

const URL_KEYS = {
  year: "y",
  energy: "e",
  region: "r",
  sector: "s",
  view: "v",
  selectedDept: "d",
  comparisonDept: "c",
  anomalyMethod: "am",
  anomalyThreshold: "at",
  displayMode: "dm",
  mapColorMode: "mc",
  mapViewMode: "mv",
  // demoTour is intentionally absent — it's purely runtime client state,
  // never serialized to the URL.
} as const satisfies Record<
  Exclude<keyof typeof DEFAULT_STATE, "demoTour">,
  string
>;

const ENERGIES: readonly Energy[] = ["Totale", "Électricité", "Gaz"];
const SECTORS: readonly SectorFilter[] = [
  "totale",
  "agriculture",
  "industrie",
  "résidentiel",
  "tertiaire",
  "autre",
];
const VIEWS: readonly ViewPreset[] = [
  "all",
  "metropole",
  "antilles",
  "ocean-indien",
  "guyane",
  "mayotte",
];
const METHODS: readonly AnomalyMethod[] = ["zscore", "iqr", "iforest"];
const DISPLAY_MODES: readonly DisplayMode[] = ["absolute", "per-capita"];
const MAP_MODES: readonly MapColorMode[] = ["consumption", "cluster"];
const MAP_VIEW_MODES: readonly MapViewMode[] = ["choropleth", "atlas-wall"];

function pick<T>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function parseSearchParams(
  sp: URLSearchParams,
): Partial<DashboardState> {
  const patch: Partial<DashboardState> = {};
  const yearStr = sp.get(URL_KEYS.year);
  const yearNum = yearStr ? Number(yearStr) : NaN;
  if (Number.isFinite(yearNum) && YEARS.includes(yearNum)) patch.year = yearNum;

  const energy = pick(sp.get(URL_KEYS.energy), ENERGIES);
  if (energy) patch.energy = energy;

  const region = sp.get(URL_KEYS.region);
  if (region) patch.region = region;

  const sector = pick(sp.get(URL_KEYS.sector), SECTORS);
  if (sector) patch.sector = sector;

  const view = pick(sp.get(URL_KEYS.view), VIEWS);
  if (view) patch.view = view;

  const selected = sp.get(URL_KEYS.selectedDept);
  if (selected) patch.selectedDept = selected;

  const comparison = sp.get(URL_KEYS.comparisonDept);
  if (comparison) patch.comparisonDept = comparison;

  const method = pick(sp.get(URL_KEYS.anomalyMethod), METHODS);
  if (method) patch.anomalyMethod = method;

  const threshStr = sp.get(URL_KEYS.anomalyThreshold);
  const threshNum = threshStr ? Number(threshStr) : NaN;
  if (Number.isFinite(threshNum)) patch.anomalyThreshold = threshNum;

  const display = pick(sp.get(URL_KEYS.displayMode), DISPLAY_MODES);
  if (display) patch.displayMode = display;

  const map = pick(sp.get(URL_KEYS.mapColorMode), MAP_MODES);
  if (map) patch.mapColorMode = map;

  const mapView = pick(sp.get(URL_KEYS.mapViewMode), MAP_VIEW_MODES);
  if (mapView) patch.mapViewMode = mapView;

  return patch;
}

/**
 * Bridge for Next.js Server Components reading the route's searchParams
 * (plain object, possibly with array values) and emitting a
 * Partial<DashboardState> ready to seed the Zustand store on first paint.
 *
 * Reuses parseSearchParams() so the URL-decoding rules stay in one place.
 */
export function parseSearchParamsToStoreState(
  sp: Record<string, string | string[] | undefined>,
): Partial<DashboardState> {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") usp.set(k, v);
    else if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string")
      usp.set(k, v[0]);
  }
  return parseSearchParams(usp);
}

export function stateToSearchParams(state: DashboardState): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.year !== DEFAULT_STATE.year) sp.set(URL_KEYS.year, String(state.year));
  if (state.energy !== DEFAULT_STATE.energy) sp.set(URL_KEYS.energy, state.energy);
  if (state.region !== DEFAULT_STATE.region) sp.set(URL_KEYS.region, state.region);
  if (state.sector !== DEFAULT_STATE.sector) sp.set(URL_KEYS.sector, state.sector);
  if (state.view !== DEFAULT_STATE.view) sp.set(URL_KEYS.view, state.view);
  if (state.selectedDept) sp.set(URL_KEYS.selectedDept, state.selectedDept);
  if (state.comparisonDept) sp.set(URL_KEYS.comparisonDept, state.comparisonDept);
  if (state.anomalyMethod !== DEFAULT_STATE.anomalyMethod)
    sp.set(URL_KEYS.anomalyMethod, state.anomalyMethod);
  if (state.anomalyThreshold !== DEFAULT_THRESHOLD[state.anomalyMethod])
    sp.set(URL_KEYS.anomalyThreshold, String(state.anomalyThreshold));
  if (state.displayMode !== DEFAULT_STATE.displayMode)
    sp.set(URL_KEYS.displayMode, state.displayMode);
  if (state.mapColorMode !== DEFAULT_STATE.mapColorMode)
    sp.set(URL_KEYS.mapColorMode, state.mapColorMode);
  if (state.mapViewMode !== DEFAULT_STATE.mapViewMode)
    sp.set(URL_KEYS.mapViewMode, state.mapViewMode);
  return sp;
}
