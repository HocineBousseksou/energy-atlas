"use client";

import { motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { Drawer } from "vaul";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ENERGIES, REGIONS, SECTORS_ALL, YEARS } from "@/lib/data";
import {
  ALL_REGIONS,
  type SectorFilter,
  type ViewPreset,
  useDashboardStore,
} from "@/lib/store";
import type { Energy } from "@/lib/data.types";

const VIEW_LABELS: Record<ViewPreset, string> = {
  all: "Tout",
  metropole: "Métropole",
  antilles: "Antilles",
  "ocean-indien": "Océan Indien",
  guyane: "Guyane",
  mayotte: "Mayotte",
};

const SECTOR_LABELS: Record<SectorFilter, string> = {
  totale: "Tous secteurs",
  agriculture: "Agriculture",
  industrie: "Industrie",
  résidentiel: "Résidentiel",
  tertiaire: "Tertiaire",
  autre: "Autre",
};

export function GlobalFilters() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const region = useDashboardStore((s) => s.region);
  const sector = useDashboardStore((s) => s.sector);
  const view = useDashboardStore((s) => s.view);
  const displayMode = useDashboardStore((s) => s.displayMode);
  const mapColorMode = useDashboardStore((s) => s.mapColorMode);
  const setYear = useDashboardStore((s) => s.setYear);
  const setEnergy = useDashboardStore((s) => s.setEnergy);
  const setRegion = useDashboardStore((s) => s.setRegion);
  const setSector = useDashboardStore((s) => s.setSector);
  const setView = useDashboardStore((s) => s.setView);
  const setDisplayMode = useDashboardStore((s) => s.setDisplayMode);
  const setMapColorMode = useDashboardStore((s) => s.setMapColorMode);

  const filterSelects = (
    <>
      <FilterField label="Année">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-full md:w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Énergie">
        <Select value={energy} onValueChange={(v) => setEnergy(v as Energy)}>
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENERGIES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Région">
        <Select
          value={region}
          onValueChange={(v) => setRegion(v ?? ALL_REGIONS)}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_REGIONS}>Toutes régions</SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Secteur">
        <Select
          value={sector}
          onValueChange={(v) => setSector(v as SectorFilter)}
        >
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTORS_ALL.map((s) => (
              <SelectItem key={s} value={s}>
                {SECTOR_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Vue">
        <Select value={view} onValueChange={(v) => setView(v as ViewPreset)}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VIEW_LABELS) as ViewPreset[]).map((v) => (
              <SelectItem key={v} value={v}>
                {VIEW_LABELS[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </>
  );

  // Toggles are rendered TWICE in the DOM (once for the desktop layout,
  // once inside the mobile container). Each instance must have unique
  // ids to satisfy WCAG 4.1.1 (no duplicate ids). Switches from
  // @base-ui render as <span role="switch"> rather than a real <input>,
  // so a <label htmlFor=...> wouldn't associate; we use aria-labelledby
  // on the Switch pointing to the visible label's id instead.
  const renderToggles = (suffix: "desktop" | "mobile") => (
    <>
      <div
        className="flex items-center gap-2"
        // data-tour-highlight only on the desktop instance — the
        // demo tour pilots the desktop-resolution spotlight and the
        // mobile drawer toggle is interaction-equivalent.
        {...(suffix === "desktop"
          ? { "data-tour-highlight": "toggle-per-capita" }
          : {})}
      >
        <Switch
          id={`per-capita-${suffix}`}
          aria-labelledby={`per-capita-label-${suffix}`}
          checked={displayMode === "per-capita"}
          onCheckedChange={(c) =>
            setDisplayMode(c ? "per-capita" : "absolute")
          }
        />
        <label
          id={`per-capita-label-${suffix}`}
          htmlFor={`per-capita-${suffix}`}
          className="text-xs cursor-pointer text-foreground"
        >
          Par habitant
        </label>
      </div>

      <div
        className="flex items-center gap-2"
        {...(suffix === "desktop"
          ? { "data-tour-highlight": "toggle-clusters" }
          : {})}
      >
        <Switch
          id={`cluster-mode-${suffix}`}
          aria-labelledby={`cluster-mode-label-${suffix}`}
          checked={mapColorMode === "cluster"}
          onCheckedChange={(c) =>
            setMapColorMode(c ? "cluster" : "consumption")
          }
        />
        <label
          id={`cluster-mode-label-${suffix}`}
          htmlFor={`cluster-mode-${suffix}`}
          className="text-xs cursor-pointer text-foreground"
        >
          Voir les profils (clusters)
        </label>
      </div>
    </>
  );

  return (
    <motion.section
      aria-label="Filtres"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.2,
      }}
      className="rounded-xl border bg-card/40 backdrop-blur-md px-4 py-3 md:px-5 md:py-4"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      {/* Desktop / tablet (≥ md): inline layout, all controls on one row. */}
      <div className="hidden md:flex flex-wrap items-end gap-x-4 gap-y-3">
        <SlidersHorizontal
          className="h-4 w-4 text-text-subtle"
          strokeWidth={1.5}
          aria-hidden
        />
        {filterSelects}
        <div className="ml-auto flex items-center gap-4">
          {renderToggles("desktop")}
        </div>
      </div>

      {/* Mobile (< md): toggles inline above; the 5 selects collapse into
          a vaul Drawer triggered by a Filtres button. */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {renderToggles("mobile")}
        </div>
        <Drawer.Root>
          <Drawer.Trigger asChild>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border bg-card/60 px-3 py-2 text-xs font-mono uppercase tracking-[0.14em] text-foreground hover:border-brand transition-colors"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
              aria-label="Ouvrir le panneau de filtres"
            >
              <SlidersHorizontal
                className="h-4 w-4 text-brand"
                strokeWidth={1.5}
                aria-hidden
              />
              <span>Filtres</span>
            </button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-2xl border bg-bg-panel pb-6 outline-none" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="mx-auto mt-3 mb-2 h-1.5 w-12 rounded-full bg-text-subtle/40" aria-hidden />
              <div className="flex items-center justify-between px-5 py-2">
                <Drawer.Title className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-subtle">
                  Filtres
                </Drawer.Title>
                <Drawer.Close
                  aria-label="Fermer"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" strokeWidth={1.7} />
                </Drawer.Close>
              </div>
              <Drawer.Description className="sr-only">
                Sélectionnez l&apos;année, l&apos;énergie, la région, le secteur
                et la vue géographique.
              </Drawer.Description>
              <div className="flex flex-col gap-4 overflow-y-auto px-5 py-3">
                {filterSelects}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </motion.section>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}
