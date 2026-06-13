import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";
import { getModel, google } from "@/lib/ai-client";
import { explainAnomalyDemo } from "@/lib/demo";
import { isEffectiveDemoMode } from "@/lib/demo/mode-cookie";
import {
  EXPLAIN_ANOMALY_SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/lib/prompts/explain-anomaly";
import { clientId, explainLimiter } from "@/lib/ratelimit";
import {
  type AnomalyExplanation,
  AnomalyExplanationSchema,
  type AnomalyExplanationResponse,
  ExplainAnomalyRequestSchema,
} from "@/lib/schemas/anomaly";

export const runtime = "nodejs";

/**
 * Resolves Google grounding redirects to canonical source URLs
 * for citation transparency and link durability.
 *
 * 2-second per-link timeout via AbortController so a dead source
 * cannot block the API response. On any error, returns the
 * unresolved URI as a graceful fallback.
 */
async function resolveRedirect(uri: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(uri, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    return res.url || uri;
  } catch {
    return uri;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: Request) {
  // ── Rate limit (5/min/IP — grounding is the expensive call) ─────────
  const { success } = await explainLimiter.limit(clientId(req));
  if (!success) {
    return Response.json(
      { error: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // ── Body validation ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  // Demo Mode short-circuit — return a fixture from lib/demo/fixtures
  // with simulated latency. Live Gemini path below is bypassed entirely.
  // Cookie override (force_mode) wins over env.DEMO_MODE, so an unlocked
  // admin can flip live/demo per browser without a redeploy.
  if (await isEffectiveDemoMode()) {
    return explainAnomalyDemo(body);
  }

  const validated = ExplainAnomalyRequestSchema.safeParse(body);
  if (!validated.success) {
    return Response.json(
      { error: "INVALID_BODY", issues: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // ── LLM call with grounding ─────────────────────────────────────────
  let resultText: string;
  let groundingMeta: GoogleGenerativeAIProviderMetadata | undefined;
  try {
    const result = await generateText({
      model: getModel(),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      system: EXPLAIN_ANOMALY_SYSTEM_PROMPT,
      prompt: buildUserPrompt(validated.data),
      // low temp for source fidelity — minimize creative interpretation of facts
      temperature: 0.1,
    });
    resultText = result.text;
    groundingMeta = result.providerMetadata?.google as
      | GoogleGenerativeAIProviderMetadata
      | undefined;
  } catch (err) {
    console.error("[explain-anomaly] LLM error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ error: "LLM_FAILURE" }, { status: 502 });
  }

  // ── Guardrail #1: citation-or-nothing ───────────────────────────────
  const chunks = groundingMeta?.groundingMetadata?.groundingChunks ?? [];
  const webChunks = chunks
    .map((c) => c.web)
    .filter(
      (w): w is { uri: string; title?: string | null } =>
        Boolean(w?.uri),
    );

  if (webChunks.length === 0) {
    const empty: AnomalyExplanationResponse = {
      hypotheses: [],
      methodological_note:
        "Aucune source publique fiable n'a été identifiée pour cette anomalie ; l'analyse n'est pas concluante. Rappel : corrélation n'implique pas causalité.",
      citations: [],
    };
    return Response.json(empty, { status: 200 });
  }

  // ── Guardrails #2, #3, #4 (parse-time): Zod schema enforcement ──────
  let parsed: AnomalyExplanation;
  try {
    const cleaned = resultText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = AnomalyExplanationSchema.parse(JSON.parse(cleaned));
  } catch (err) {
    // Defensive logging: NEVER include raw model text — only shape diagnostics.
    console.error("[explain-anomaly] parse failure", {
      zodError: err instanceof z.ZodError ? err.flatten() : "non-zod-error",
      rawTextLength: resultText?.length ?? 0,
    });
    return Response.json(
      { error: "LLM_RESPONSE_UNPARSEABLE" },
      { status: 502 },
    );
  }

  // ── Citation pipeline: resolve Google redirects to canonical URLs ───
  const citations = await Promise.all(
    webChunks.map(async (w) => {
      const resolvedUri = await resolveRedirect(w.uri);
      let displayTitle = w.title?.trim() || "";
      if (!displayTitle) {
        try {
          displayTitle = new URL(resolvedUri).hostname;
        } catch {
          displayTitle = "Source";
        }
      }
      return { uri: resolvedUri, title: displayTitle };
    }),
  );

  const response: AnomalyExplanationResponse = { ...parsed, citations };
  return Response.json(response, { status: 200 });
}
