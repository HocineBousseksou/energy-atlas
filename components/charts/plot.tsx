"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ComponentProps } from "react";
import type ReactPlotly from "react-plotly.js";

const PlotInner = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Chargement du graphique"
      className="h-full w-full min-h-[240px] animate-pulse rounded-md bg-muted/40"
    />
  ),
});

type PlotProps = ComponentProps<typeof ReactPlotly>;

/**
 * Plot wrapper that:
 *   - Lazy-loads react-plotly.js client-side (ssr: false) — Plotly
 *     ships a ~280KB bundle that we don't want on first paint.
 *   - When useReducedMotion() returns true, injects
 *     transition: { duration: 0 } into layout, suppressing Plotly's
 *     internal property-change animations (so there's a real
 *     prefers-reduced-motion path on Plotly).
 */
export function Plot(props: PlotProps) {
  const reduced = useReducedMotion();
  const layout = useMemo(() => {
    if (!reduced) return props.layout;
    return {
      ...props.layout,
      transition: { duration: 0, easing: "linear" },
    } as PlotProps["layout"];
  }, [props.layout, reduced]);

  return <PlotInner {...props} layout={layout} />;
}
