import { generateText } from "ai";
import { getModel } from "@/lib/ai-client";
import { reportDemo } from "@/lib/demo";
import { isEffectiveDemoMode } from "@/lib/demo/mode-cookie";
import {
  SECTORS_NO_TOTAL,
  YEARS,
  getCluster,
  getConsumption,
  getDepartmentByCode,
} from "@/lib/data";
import { REPORT_SYSTEM_PROMPT } from "@/lib/prompts/report";
import { clientId, reportLimiter } from "@/lib/ratelimit";
import { ReportRequestSchema } from "@/lib/schemas/report";
import type { Department, Energy, Sector } from "@/lib/data.types";

export const runtime = "nodejs";

function tw(mwh: number): string {
  return (mwh / 1_000_000).toFixed(2);
}

function buildReportPrompt(d: Department, year: number, energy: Energy): string {
  const total = getConsumption(d, energy, "totale" as Sector);
  const perCapita = d.population && d.population > 0 ? total / d.population : null;

  const sectorPct: string[] = [];
  if (total > 0) {
    for (const s of SECTORS_NO_TOTAL) {
      const v = getConsumption(d, energy, s as Sector);
      const pct = (v / total) * 100;
      sectorPct.push(`${s} ${pct.toFixed(1)}%`);
    }
  }

  const cluster = getCluster(d.code);

  let yoyLine = "";
  const prevYear = year - 1;
  if (YEARS.includes(prevYear)) {
    const prev = getDepartmentByCode(prevYear, d.code);
    if (prev) {
      const prevTotal = getConsumption(prev, energy, "totale" as Sector);
      if (prevTotal > 0) {
        const yoy = ((total - prevTotal) / prevTotal) * 100;
        yoyLine = `Variation YoY vs ${prevYear} : ${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%.`;
      }
    }
  }

  return `Données factuelles à synthétiser (NE PAS INVENTER de chiffres au-delà de ceux-ci) :

  Département       : ${d.name} (code ${d.code}), région ${d.region}
  Année             : ${year}
  Énergie           : ${energy}
  Consommation total: ${tw(total)} TWh
${perCapita !== null ? `  Per habitant      : ${perCapita.toFixed(2)} MWh/hab\n` : ""}  Population        : ${d.population ? d.population.toLocaleString("fr-FR") : "non renseignée"}
  Composition       : ${sectorPct.join(", ") || "non disponible"}
  Profil (cluster)  : ${cluster ? cluster.label : "non classé"}
  ${yoyLine}

Rédige un paragraphe analytique de 180 à 240 mots respectant les
contraintes du system prompt. Pas de markdown, texte brut.`;
}

export async function POST(req: Request) {
  const { success } = await reportLimiter.limit(clientId(req));
  if (!success) {
    return Response.json(
      { error: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  // Demo Mode short-circuit. Cookie override (force_mode) wins over
  // env.DEMO_MODE for unlocked admins.
  if (await isEffectiveDemoMode()) {
    return reportDemo(body);
  }

  const parsed = ReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "INVALID_BODY", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { deptCode, year, energy } = parsed.data;
  const dept = getDepartmentByCode(year, deptCode);
  if (!dept) {
    return Response.json({ error: "DEPARTMENT_NOT_FOUND" }, { status: 404 });
  }

  try {
    const result = await generateText({
      model: getModel(),
      system: REPORT_SYSTEM_PROMPT,
      prompt: buildReportPrompt(dept, year, energy),
      temperature: 0.3,
    });
    return Response.json({ markdown: result.text });
  } catch (err) {
    console.error("[report] LLM error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ error: "LLM_FAILURE" }, { status: 502 });
  }
}
