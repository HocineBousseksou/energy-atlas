"use client";

import { useDashboardStore } from "@/lib/store";

/**
 * Side-effects callable from tour-steps[].onEnter.
 *
 * All actions are programmatic equivalents of user interactions —
 * they go through the same Zustand setters as the real UI, so the
 * dashboard reacts identically (chart re-render, URL sync, etc.).
 */

export function resetToHome(): void {
  const s = useDashboardStore.getState();
  s.setYear(2024);
  s.setEnergy("Totale");
  s.setRegion("all");
  s.setSector("totale");
  s.setView("metropole");
  s.setSelectedDept(null);
  s.setComparisonDept(null);
  s.setDisplayMode("absolute");
  s.setMapColorMode("consumption");
  s.setMapViewMode("choropleth");
}

export function scrollToTop(): void {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function scrollToSection(testId: string): void {
  if (typeof window === "undefined") return;
  const el = document.querySelector<HTMLElement>(`[data-tour-section="${testId}"]`);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * Briefly emphasize an element by adding a CSS class for ~2 s.
 * The class is consumed by globals.css; element opts in via
 * data-tour-highlight="<id>" attribute.
 */
export function highlightElement(testId: string, durationMs = 2000): void {
  if (typeof window === "undefined") return;
  const el = document.querySelector<HTMLElement>(
    `[data-tour-highlight="${testId}"]`,
  );
  if (!el) return;
  el.classList.add("tour-highlight");
  window.setTimeout(() => {
    el.classList.remove("tour-highlight");
  }, durationMs);
}

/**
 * Trigger the same path as a manual click on an anomaly row:
 * set the filter context first (so the hit will exist) and then
 * select the dept. The ExplanationPanel mounts and starts fetching
 * automatically via its existing useEffect on the (deptCode, ...)
 * key. The fetched response then runs through the typewriter from
 * Commit 1 — no special tour-only path.
 */
export function triggerAnomalyClick(opts: {
  deptCode: string;
  year: number;
  energy: "Totale" | "Électricité" | "Gaz";
  sector: "totale" | "agriculture" | "industrie" | "résidentiel" | "tertiaire" | "autre";
  method: "zscore" | "iqr" | "iforest";
  threshold: number;
}): void {
  const s = useDashboardStore.getState();
  s.setYear(opts.year);
  s.setEnergy(opts.energy);
  s.setSector(opts.sector);
  s.setAnomalyMethod(opts.method);
  s.setAnomalyThreshold(opts.threshold);
  // Selection last so the panel mounts only after filters are applied.
  s.setSelectedDept(opts.deptCode);
  // Scroll to the anomaly section so the panel reveal is visible.
  scrollToSection("anomalies");
}
