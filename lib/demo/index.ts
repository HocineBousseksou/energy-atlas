import { env } from "@/lib/env";
import { ExplainAnomalyRequestSchema } from "@/lib/schemas/anomaly";
import type { AnomalyExplanationResponse } from "@/lib/schemas/anomaly";
import { ReportRequestSchema } from "@/lib/schemas/report";
import { CHAT_DEMO_REPLY } from "./fixtures/chat-conversation";
import { NORD_2024_INDUSTRIEL_FIXTURE } from "./fixtures/nord-2024-industriel";
import { PARIS_AGRI_FORGE_FIXTURE } from "./fixtures/paris-agri-forge";
import { REPORT_DEMO_RHONE } from "./fixtures/report-rhone";
import { createDemoChatResponse } from "./stream-mock";

/**
 * Demo mode router.
 *
 * Activated by the `DEMO_MODE` env var (server-side). Each LLM endpoint
 * imports `isDemoMode()` and the matching `*Demo()` handler, branches
 * at the top of the POST handler, and falls through to the live Gemini
 * path when DEMO_MODE is false. Live logic is unmodified.
 *
 * The fixtures were captured from real calls and are bit-for-bit
 * preserved (see lib/demo/fixtures/*.ts header comments).
 */

export function isDemoMode(): boolean {
  return env.DEMO_MODE === true;
}

const DEMO_LATENCY_MIN_MS = 700;
const DEMO_LATENCY_JITTER_MS = 600;

function naturalLatency(): Promise<void> {
  const ms = DEMO_LATENCY_MIN_MS + Math.random() * DEMO_LATENCY_JITTER_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const EMPTY_FALLBACK: AnomalyExplanationResponse = {
  hypotheses: [],
  methodological_note:
    "Mode démo : aucune fixture n'est disponible pour ce département / secteur. Désactivez DEMO_MODE pour interroger le LLM en direct. Rappel : corrélation n'implique pas causalité.",
  citations: [],
};

/**
 * Demo handler for /api/explain-anomaly.
 * Matches by (deptCode, sector); returns the empty fallback otherwise.
 */
export async function explainAnomalyDemo(body: unknown): Promise<Response> {
  await naturalLatency();
  const parsed = ExplainAnomalyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "INVALID_BODY", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { deptCode, sector } = parsed.data;
  if (deptCode === "59" && sector === "industrie") {
    return Response.json(
      NORD_2024_INDUSTRIEL_FIXTURE satisfies AnomalyExplanationResponse,
    );
  }
  if (deptCode === "75" && sector === "agriculture") {
    return Response.json(
      PARIS_AGRI_FORGE_FIXTURE satisfies AnomalyExplanationResponse,
    );
  }
  return Response.json(EMPTY_FALLBACK);
}

/**
 * Demo handler for /api/chat. Returns a wire-faithful streamed Response
 * (UIMessageChunk envelopes) via the AI SDK's simulateReadableStream +
 * createUIMessageStreamResponse helpers — useChat() cannot tell it apart
 * from a live streamText() call.
 */
export async function chatDemo(body: unknown): Promise<Response> {
  // Body is accepted for shape symmetry with the live endpoint; we
  // don't currently key the fixture off conversation context (one
  // pre-recorded turn covers the demo). Reference body
  // here so the lint rule for unused params doesn't fire.
  void body;
  return createDemoChatResponse(CHAT_DEMO_REPLY, {
    initialDelayMs: 250,
    msPerChunk: 45,
  });
}

/**
 * Demo handler for /api/report. Non-streaming JSON; sleep simulates the
 * generateText round-trip the live endpoint normally pays.
 */
export async function reportDemo(body: unknown): Promise<Response> {
  await naturalLatency();
  const parsed = ReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "INVALID_BODY", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  // Single fixture serves any department in demo mode — the body is
  // accepted for shape but the response narrative stays Rhône-flavoured.
  return Response.json({ markdown: REPORT_DEMO_RHONE });
}
