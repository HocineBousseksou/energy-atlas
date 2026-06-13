"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Grid3x3, Map as MapIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { AnomaliesSection } from "@/components/anomalies/anomalies-section";
import { AtlasWall } from "@/components/charts/atlas-wall";
import { ChoroplethMap } from "@/components/charts/choropleth-map";
import { EvolutionLine } from "@/components/charts/evolution-line";
import { SectorComposition } from "@/components/charts/sector-composition";
import { Top15Bar } from "@/components/charts/top15-bar";
import { DeptComparator } from "@/components/comparator/dept-comparator";
import { DemoOverlay } from "@/components/demo/demo-overlay";
import { GlobalFilters } from "@/components/filters/global-filters";
import { KpiRow } from "@/components/kpi/kpi-row";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useTourOrchestrator } from "@/lib/demo/tour-orchestrator";
import type { DashboardState } from "@/lib/store";
import { useDashboardStore } from "@/lib/store";
import { useSyncedStore } from "@/lib/use-synced-store";

const EASE = [0.16, 1, 0.3, 1] as const;

function FadeIn({
  delayMs,
  children,
  durationMs = 400,
}: {
  delayMs: number;
  children: React.ReactNode;
  durationMs?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: durationMs / 1000,
        ease: EASE,
        delay: delayMs / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

function MapViewToggle() {
  const mode = useDashboardStore((s) => s.mapViewMode);
  const setMode = useDashboardStore((s) => s.setMapViewMode);
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <Eyebrow>VUE GÉOGRAPHIQUE</Eyebrow>
      <div
        role="tablist"
        aria-label="Choisir le mode de visualisation"
        data-tour-highlight="map-view-toggle"
        className="inline-flex rounded-full border bg-card/40 p-0.5 text-xs"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {[
          { key: "choropleth" as const, label: "Carte", icon: MapIcon },
          { key: "atlas-wall" as const, label: "Atlas wall", icon: Grid3x3 },
        ].map(({ key, label, icon: Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
                active
                  ? "bg-brand text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapArea() {
  const mode = useDashboardStore((s) => s.mapViewMode);
  return (
    <div className="space-y-3" data-tour-section="map">
      <MapViewToggle />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {mode === "choropleth" ? <ChoroplethMap /> : <AtlasWall />}
          </motion.div>
        </AnimatePresence>
        <Top15Bar />
      </div>
    </div>
  );
}

function Inner({ initialState }: { initialState?: Partial<DashboardState> }) {
  // SSR-derived state hydration. The Server Component (app/page.tsx) parses
  // the URL searchParams and passes them down here as `initialState`. We
  // seed the Zustand store SYNCHRONOUSLY from the useState initializer —
  // NOT from a useEffect — so the very first client render reads the URL-
  // derived values from the store. With a useEffect-based hydration, the
  // first paint would briefly show defaults ("all"/"Totale"/2024) before
  // flipping to the URL state, breaking shareable-link UX and any social
  // / SEO snapshot.
  //
  // DO NOT refactor this useState initializer into a useEffect — that's
  // exactly the bug this commit fixes.
  useState(() => {
    if (initialState && Object.keys(initialState).length > 0) {
      useDashboardStore.setState(initialState);
    }
    return true;
  });

  useSyncedStore();
  useTourOrchestrator();
  return (
    <main className="px-4 md:px-6 pb-24 pt-8 space-y-6 max-w-[1400px] mx-auto">
      <GlobalFilters />
      <KpiRow />

      <FadeIn delayMs={800}>
        <MapArea />
      </FadeIn>

      <FadeIn delayMs={900}>
        <SectorComposition />
      </FadeIn>

      <FadeIn delayMs={960}>
        <EvolutionLine />
      </FadeIn>

      <FadeIn delayMs={1020}>
        <DeptComparator />
      </FadeIn>

      <FadeIn delayMs={1080}>
        <div data-tour-section="anomalies">
          <AnomaliesSection />
        </div>
      </FadeIn>

      <DemoOverlay />
    </main>
  );
}

export function DashboardShell({
  initialState,
}: { initialState?: Partial<DashboardState> }) {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <Inner initialState={initialState} />
    </Suspense>
  );
}
