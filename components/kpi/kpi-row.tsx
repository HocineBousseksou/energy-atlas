"use client";

import { motion } from "framer-motion";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getConsumption,
  getDepartmentsByYear,
  getNationalTotal,
  getPercentDeptIncreasingYoY,
  mwhToTwh,
} from "@/lib/data";
import type { Department, Energy, Sector } from "@/lib/data.types";
import { useDashboardStore } from "@/lib/store";

interface DerivedKpis {
  totalTwh: number;
  top: Department | null;
  topValue: number;
  bottom: Department | null;
  bottomValue: number;
  pctIncreasing: number;
  perCapita: boolean;
}

function computeKpis(
  year: number,
  energy: Energy,
  sector: Sector,
  perCapita: boolean,
): DerivedKpis {
  const totalTwh = mwhToTwh(getNationalTotal(year, energy, sector));
  const pctIncreasing = getPercentDeptIncreasingYoY(year, energy, sector);

  const valueOf = (d: Department): number => {
    const raw = getConsumption(d, energy, sector);
    if (!perCapita) return raw;
    if (!d.population || d.population <= 0) return Number.NaN;
    return raw / d.population;
  };

  let top: Department | null = null;
  let topValue = -Infinity;
  let bottom: Department | null = null;
  let bottomValue = Infinity;
  for (const d of getDepartmentsByYear(year)) {
    const v = valueOf(d);
    if (!Number.isFinite(v)) continue;
    if (v > topValue) {
      top = d;
      topValue = v;
    }
    if (v < bottomValue) {
      bottom = d;
      bottomValue = v;
    }
  }

  return {
    totalTwh,
    top,
    topValue,
    bottom,
    bottomValue,
    pctIncreasing,
    perCapita,
  };
}

function formatPerCapita(mwhPerPerson: number): string {
  return `${mwhPerPerson.toFixed(2)} MWh/hab`;
}

function formatAbsolute(mwh: number): string {
  if (mwh >= 1_000_000) return `${(mwh / 1_000_000).toFixed(2)} TWh`;
  if (mwh >= 1_000) return `${(mwh / 1_000).toFixed(1)} GWh`;
  return `${mwh.toFixed(0)} MWh`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

const CARD_TIMINGS = [0, 100, 200, 300] as const;
const REVEAL_BASE_DELAY = 0.4; // synced with the orchestrated sequence in dashboard-shell

export function KpiRow() {
  const year = useDashboardStore((s) => s.year);
  const energy = useDashboardStore((s) => s.energy);
  const sector = useDashboardStore((s) => s.sector);
  const displayMode = useDashboardStore((s) => s.displayMode);
  const perCapita = displayMode === "per-capita";

  const kpi = computeKpis(year, energy, sector, perCapita);

  const cards: KpiCardProps[] = [
    {
      eyebrow: `CONSOMMATION TOTALE ${year}`,
      value: `${kpi.totalTwh.toFixed(2)}`,
      unit: "TWh",
      hero: true, // single accent reserved for this card
      sub: "France · données ouvertes data.gouv.fr · pop. INSEE 2024",
    },
    {
      eyebrow: perCapita ? "PLUS CONSOMMATEUR · PER HABITANT" : "PLUS CONSOMMATEUR",
      value: kpi.top ? kpi.top.name : "—",
      unit: "",
      mono: false,
      sub: kpi.top
        ? perCapita
          ? formatPerCapita(kpi.topValue)
          : `${formatAbsolute(kpi.topValue)}${kpi.top.population ? ` · pop. ${formatNumber(kpi.top.population)}` : ""}`
        : "Aucune donnée",
    },
    {
      eyebrow: perCapita ? "MOINS CONSOMMATEUR · PER HABITANT" : "MOINS CONSOMMATEUR",
      value: kpi.bottom ? kpi.bottom.name : "—",
      unit: "",
      mono: false,
      sub: kpi.bottom
        ? perCapita
          ? formatPerCapita(kpi.bottomValue)
          : formatAbsolute(kpi.bottomValue)
        : "Aucune donnée",
    },
    {
      eyebrow: "DÉPTS EN HAUSSE YOY",
      value: `${kpi.pctIncreasing.toFixed(1)}`,
      unit: "%",
      sub: "Années comparées : N vs N-1",
    },
  ];

  return (
    <section
      aria-label="Indicateurs clés"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {cards.map((c, i) => (
        <motion.div
          key={c.eyebrow}
          // Demo tour highlight target — step [1] glows kpi-card-2
          // (the "PLUS CONSOMMATEUR" card, index 1 in the cards[] array).
          data-tour-highlight={i === 1 ? "kpi-card-2" : undefined}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
            delay: REVEAL_BASE_DELAY + CARD_TIMINGS[i] / 1000,
          }}
        >
          <KpiCard {...c} />
        </motion.div>
      ))}
    </section>
  );
}

interface KpiCardProps {
  eyebrow: string;
  value: string;
  unit?: string;
  sub?: string;
  hero?: boolean;
  mono?: boolean;
}

function KpiCard({
  eyebrow,
  value,
  unit = "",
  sub,
  hero = false,
  mono = true,
}: KpiCardProps) {
  return (
    <GlassCard
      accent={hero}
      className="px-5 py-5 md:px-6 md:py-6 h-full flex flex-col gap-3"
    >
      <Eyebrow className="text-[10px]">{eyebrow}</Eyebrow>
      <div
        className={`leading-none tracking-[-0.02em] ${
          mono ? "font-mono tabular-nums" : "font-display"
        } ${hero ? "text-brand" : "text-foreground"}`}
        style={{
          fontSize: mono ? "clamp(28px, 4vw, 44px)" : "clamp(20px, 2.5vw, 28px)",
          fontWeight: hero ? 500 : mono ? 500 : 500,
          fontVariationSettings: !mono ? "'opsz' 96, 'wght' 500" : undefined,
        }}
      >
        {value}
        {unit ? (
          <span
            className="text-foreground"
            style={{
              fontSize: "0.45em",
              marginLeft: "0.3em",
              letterSpacing: "0",
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {sub ? (
        <p className="text-xs text-muted-foreground leading-relaxed mt-auto">
          {sub}
        </p>
      ) : null}
    </GlassCard>
  );
}
