"use client";

import type { ReactNode } from "react";
import { useDashboardStore } from "@/lib/store";
import {
  resetToHome,
  scrollToSection,
  scrollToTop,
  triggerAnomalyClick,
} from "./tour-actions";

/**
 * 9 steps × ~3:11 total. Each step has a French body (Fraunces italic
 * via the .accent span) and an A/B phase pair:
 *
 *   phaseA — read text only. Backdrop blur, card centered. Duration
 *            kept short (6 s for context steps, 12 s intro, 7 s outro).
 *
 *   phaseB — observe the feature. Card fades out, spotlight mounts on
 *            the targeted DOM node (spotlightSelector). onEnter runs
 *            side-effects (scroll, toggle, etc.) so the spotlight lands
 *            on the right post-mutation rect.
 *
 * Step 7 (IA grounded) is the exception — splitScreen=true keeps the
 * card visible top-right while the explanation panel mounts below the
 * spotlight zone, so the user can read the meta-text AND watch the
 * grounded answer stream in parallel.
 *
 * Steps without phaseB (intro & outro) just play the read-and-advance
 * pattern with no observe phase.
 */

export interface TourStep {
  /** Reading phase — short text-only beat. */
  phaseA: {
    duration: number;
    body: ReactNode;
  };
  /** Observe phase — spotlight + dashboard interaction. Optional. */
  phaseB?: {
    duration: number;
    /** Side-effect at phase B entry (scroll, toggle, etc.). */
    onEnter?: () => void;
    /** CSS selector targeted by DemoSpotlight. */
    spotlightSelector?: string;
    /** Step 7 only — keep card top-right while panel mounts below. */
    splitScreen?: boolean;
  };
}

const A = ({ children }: { children: ReactNode }) => (
  <span className="text-brand">{children}</span>
);

export const TOUR_STEPS: readonly TourStep[] = [
  // [0] Intro — text only (12 s)
  {
    phaseA: {
      duration: 12_000,
      body: (
        <>
          Energy Atlas. <A>769 TWh</A> consommés en France en 2024,
          répartis entre <A>101 départements</A>. Voici comment ce
          dashboard les analyse avec rigueur.
        </>
      ),
    },
  },
  // [1] KPI hero — read 6 s, observe top KPI 14 s
  {
    phaseA: {
      duration: 6_000,
      body: (
        <>
          Le top consommateur : <A>Nord, 40,84 TWh</A>. Mais à quel point
          c&apos;est anormal ? La donnée brute ne suffit pas — il faut un
          cadre statistique pour distinguer le banal de l&apos;atypique.
        </>
      ),
    },
    phaseB: {
      duration: 14_000,
      spotlightSelector: '[data-tour-highlight="kpi-card-2"]',
      onEnter: () => {
        scrollToTop();
      },
    },
  },
  // [2] Carte choroplèthe — read 6 s, observe map 14 s
  {
    phaseA: {
      duration: 6_000,
      body: (
        <>
          La carte choroplèthe révèle des disparités géographiques.{" "}
          <A>Nord et Bouches-du-Rhône</A> ressortent en orange clair —
          des départements industriels denses et peuplés.
        </>
      ),
    },
    phaseB: {
      duration: 14_000,
      spotlightSelector: '[data-tour-section="map"]',
      onEnter: () => {
        scrollToSection("map");
      },
    },
  },
  // [3] Toggle per-capita — read 6 s, observe toggle 14 s
  {
    phaseA: {
      duration: 6_000,
      body: (
        <>
          Mais consommer beaucoup peut juste signifier être peuplé. Voyons
          <A> par habitant</A> — la perspective change radicalement les
          leaders apparents.
        </>
      ),
    },
    phaseB: {
      duration: 14_000,
      spotlightSelector: '[data-tour-highlight="toggle-per-capita"]',
      onEnter: () => {
        useDashboardStore.getState().setDisplayMode("per-capita");
      },
    },
  },
  // [4] Clusters non-supervisés — read 6 s, observe toggle 16 s
  {
    phaseA: {
      duration: 6_000,
      body: (
        <>
          Et si on groupait les 101 départements par profil sectoriel ?{" "}
          <A>K-means découvre 7 clusters</A>, le k optimisé par silhouette
          score sur les vecteurs sectoriels normalisés.
        </>
      ),
    },
    phaseB: {
      duration: 16_000,
      spotlightSelector: '[data-tour-highlight="toggle-clusters"]',
      onEnter: () => {
        useDashboardStore.getState().setMapColorMode("cluster");
      },
    },
  },
  // [5] Atlas wall — read 6 s, observe view-toggle 14 s
  {
    phaseA: {
      duration: 6_000,
      body: (
        <>
          <A>101 silhouettes en small multiples</A> — la convention de
          Tufte. Chaque département lisible individuellement, sans
          frontières administratives qui distraient l&apos;œil.
        </>
      ),
    },
    phaseB: {
      duration: 14_000,
      spotlightSelector: '[data-tour-highlight="map-view-toggle"]',
      onEnter: () => {
        useDashboardStore.getState().setMapColorMode("consumption");
        useDashboardStore.getState().setMapViewMode("atlas-wall");
      },
    },
  },
  // [6] Détection d'anomalies — read 6 s, observe anomalies 14 s
  {
    phaseA: {
      duration: 6_000,
      body: (
        <>
          Les chiffres globaux cachent des anomalies. Détection
          multi-méthodes : <A>Z-score</A>, <A>IQR</A>,{" "}
          <A>Isolation Forest</A>. Le désaccord entre méthodes EST
          l&apos;information.
        </>
      ),
    },
    phaseB: {
      duration: 14_000,
      spotlightSelector: '[data-tour-section="anomalies"]',
      onEnter: () => {
        useDashboardStore.getState().setMapViewMode("choropleth");
        useDashboardStore.getState().setDisplayMode("absolute");
        scrollToSection("anomalies");
      },
    },
  },
  // [7] IA grounded — moment phare. Split-screen: card top-right, panel below.
  {
    phaseA: {
      duration: 6_000,
      body: (
        <>
          Cliquons sur <A>Nord 2024 industriel</A>. L&apos;IA explique
          avec des sources publiques vérifiables. Quatre garde-fous :
          <span className="block mt-3 text-sm space-y-1">
            <span className="block">
              <A>•</A> Citation obligatoire ou rien
            </span>
            <span className="block">
              <A>•</A> Taxonomie de confiance graduée
            </span>
            <span className="block">
              <A>•</A> Préférence gouv.fr / INSEE / presse fiable
            </span>
            <span className="block">
              <A>•</A> Rappel corrélation ≠ causalité
            </span>
          </span>
        </>
      ),
    },
    phaseB: {
      duration: 44_000,
      splitScreen: true,
      spotlightSelector: '[data-tour-section="anomalies"]',
      onEnter: () => {
        triggerAnomalyClick({
          deptCode: "59",
          year: 2024,
          energy: "Totale",
          sector: "industrie",
          method: "zscore",
          threshold: 2,
        });
      },
    },
  },
  // [8] Outro — text only (7 s)
  {
    phaseA: {
      duration: 7_000,
      body: (
        <>
          Energy Atlas. <A>Open-source, MIT.</A> À vous d&apos;explorer.
        </>
      ),
    },
    // No phaseB — final state preserved (panel open on Nord, anomaly
    // section in view) so the user can keep manually exploring after
    // the tour fades out.
  },
];

// Total = sum of phaseA.duration + (phaseB.duration if present) for all steps.
export const TOTAL_DURATION_MS = TOUR_STEPS.reduce(
  (acc, s) => acc + s.phaseA.duration + (s.phaseB?.duration ?? 0),
  0,
);

// Re-export resetToHome so the orchestrator can call it on teardown
// without re-importing tour-actions directly. (Centralised surface.)
export { resetToHome };
