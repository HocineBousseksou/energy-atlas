"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Typewriter } from "@/components/anomalies/typewriter";
import { Button } from "@/components/ui/button";
import {
  YEARS,
  getCluster,
  getConsumption,
  getDepartmentByCode,
  getDepartmentsByYear,
} from "@/lib/data";
import {
  type AnomalyExplanationResponse,
  AnomalyExplanationResponseSchema,
  type Confidence,
} from "@/lib/schemas/anomaly";
import type { AnomalyHit } from "@/lib/data";
import type { Energy, Sector } from "@/lib/data.types";

interface Props {
  hit: AnomalyHit | null;
  year: number;
  energy: Energy;
  sector: Sector;
  method: "zscore" | "iqr" | "iforest";
  threshold: number;
}

type FetchResult =
  | { status: "ok"; data: AnomalyExplanationResponse }
  | { status: "fail"; message: string };

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: AnomalyExplanationResponse }
  | { kind: "error"; message: string };

const CONFIDENCE_FILL: Record<Confidence, number> = {
  élevé: 3,
  modéré: 2,
  faible: 1,
};

function ConfidenceBar({ level }: { level: Confidence }) {
  const filled = CONFIDENCE_FILL[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      aria-label={`Niveau de confiance : ${level}`}
    >
      <span aria-hidden className="font-mono tracking-tight">
        {"▰".repeat(filled)}
        <span className="opacity-30">{"▱".repeat(3 - filled)}</span>
      </span>
      <span className="capitalize">{level}</span>
    </span>
  );
}

function buildBody(p: Props) {
  const dept = getDepartmentByCode(p.year, p.hit?.code ?? "");
  if (!dept) return null;
  const value = getConsumption(dept, p.energy, p.sector);
  const prevYear = p.year - 1;
  const prev = YEARS.includes(prevYear)
    ? getDepartmentByCode(prevYear, dept.code)
    : null;
  const prevVal = prev ? getConsumption(prev, p.energy, p.sector) : 0;
  const yoyPct = prevVal === 0 ? 0 : ((value - prevVal) / prevVal) * 100;
  const all = getDepartmentsByYear(p.year);
  const sectorMean =
    all.reduce((acc, d) => acc + getConsumption(d, p.energy, p.sector), 0) /
    Math.max(all.length, 1);
  const cluster = getCluster(dept.code);
  return {
    deptCode: dept.code,
    deptName: dept.name,
    region: dept.region,
    year: p.year,
    energy: p.energy,
    sector: p.sector,
    method: p.method,
    score: p.hit?.score ?? 0,
    threshold: p.threshold,
    value,
    yoyPct,
    nationalSectorMean: sectorMean,
    population: dept.population ?? 0,
    clusterLabel: cluster?.label ?? null,
  };
}

async function fetchExplanation(
  body: NonNullable<ReturnType<typeof buildBody>>,
  signal: AbortSignal,
): Promise<AnomalyExplanationResponse> {
  const res = await fetch("/api/explain-anomaly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = typeof j?.error === "string" ? ` (${j.error})` : "";
    } catch {}
    throw new Error(`HTTP ${res.status}${detail}`);
  }
  const json = await res.json();
  return AnomalyExplanationResponseSchema.parse(json);
}

export function ExplanationPanel(props: Props) {
  const { hit } = props;
  // Reset counter forces a fresh fetch on retry.
  const [retryNonce, setRetryNonce] = useState(0);
  // Bundle the result with the request key it came from, so a stale
  // response from a previous hit gets ignored as "loading" until the
  // new fetch lands. This avoids calling setResult(null) synchronously
  // inside the effect, which the react-hooks rule rejects.
  const [bundle, setBundle] = useState<{
    key: string;
    result: FetchResult;
  } | null>(null);

  const currentKey = hit ? `${hit.code}|${retryNonce}` : null;
  const body = useMemo(() => (hit ? buildBody(props) : null), [hit, props]);
  const isMissingDept = Boolean(hit) && !body;

  useEffect(() => {
    if (!hit || !currentKey || !body) return;
    const ctrl = new AbortController();
    fetchExplanation(body, ctrl.signal)
      .then((data) =>
        setBundle({ key: currentKey, result: { status: "ok", data } }),
      )
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setBundle({
          key: currentKey,
          result: {
            status: "fail",
            message: err instanceof Error ? err.message : "Erreur inconnue",
          },
        });
      });
    return () => ctrl.abort();
  }, [hit, body, currentKey]);

  const state: State = !hit
    ? { kind: "idle" }
    : isMissingDept
      ? { kind: "error", message: "Département introuvable." }
      : !bundle || bundle.key !== currentKey
        ? { kind: "loading" }
        : bundle.result.status === "ok"
          ? { kind: "success", data: bundle.result.data }
          : { kind: "error", message: bundle.result.message };

  const animationKey = hit ? `result:${hit.code}` : "idle";

  return (
    <section
      aria-label="Explication IA sourcée de l'anomalie"
      className="rounded-lg border bg-card/30 p-4 space-y-3"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-medium inline-flex items-center gap-2">
          <Sparkles
            className="h-4 w-4 text-brand"
            strokeWidth={1.5}
            aria-hidden
          />
          <span>
            {hit
              ? `Explication sourcée — ${hit.name}`
              : "Explication IA"}
          </span>
        </h3>
        {state.kind === "success" && state.data.citations.length > 0 ? (
          <CopySourcesButton citations={state.data.citations} />
        ) : null}
      </header>

      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-text-subtle">
        Hypothèses corrélatives, jamais causales — toutes sourcées.
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={animationKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {state.kind === "idle" ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sélectionnez une anomalie dans le tableau ci-dessus (clic ou
              Entrée / Espace) pour voir une analyse sourcée — hypothèses
              pondérées par niveau de confiance, citations vers des sources
              publiques, et note méthodologique.
            </p>
          ) : state.kind === "loading" ? (
            <Skeleton />
          ) : state.kind === "error" ? (
            <ErrorState
              message={state.message}
              onRetry={() => setRetryNonce((n) => n + 1)}
            />
          ) : (
            <ResultBlock data={state.data} />
          )}
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-muted-foreground">
        Liens fournis par Google Search Grounding ; nous résolvons les
        redirects côté serveur quand possible. Aucune clé d&apos;API n&apos;est
        exposée dans le navigateur.
      </p>
    </section>
  );
}

function ResultBlock({ data }: { data: AnomalyExplanationResponse }) {
  if (data.hypotheses.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-sm">Aucune hypothèse fondée disponible.</div>
        <MethodologicalNote text={data.methodological_note} />
      </div>
    );
  }
  return <RevealedResult data={data} />;
}

/**
 * Reveals the result one hypothesis at a time, typewriter-style.
 *
 * The fetch has already returned a complete server-validated response
 * (citation-or-nothing + Zod parse + grounding check ALL enforced
 * upstream). This component is a pure UX layer: it splits the reveal
 * into a stream of { hypothesis-claim → hypothesis-evidence → next }
 * with citations + methodological note appearing after the last
 * hypothesis is fully revealed. A "Tout afficher" button skips ahead.
 *
 * Reduced-motion: Typewriter renders instantly when the OS asks; the
 * reveal collapses to a single fade-in.
 */
function RevealedResult({ data }: { data: AnomalyExplanationResponse }) {
  const reduced = useReducedMotion();
  // Step encoding: 0 → reveal hypothesis 0 claim
  //                1 → reveal hypothesis 0 evidence
  //                2 → reveal hypothesis 1 claim
  //                ...
  // last step → reveal citations + note
  const stepsPerHyp = 2;
  const totalReveal = data.hypotheses.length * stepsPerHyp + 1; // +1 for citations/note
  const [step, setStep] = useState(reduced ? totalReveal : 0);
  const skipped = step >= totalReveal;

  const advance = () => setStep((s) => Math.min(totalReveal, s + 1));
  const skip = () => setStep(totalReveal);

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {data.hypotheses.map((h, i) => {
          const claimStep = i * stepsPerHyp;
          const evidenceStep = claimStep + 1;
          const claimRevealed = step > claimStep;
          const evidenceVisible = step > evidenceStep || skipped;
          if (!claimRevealed && step !== claimStep) return null;
          return (
            <li
              key={i}
              className="rounded-md border p-3 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <strong className="text-sm">
                  {step === claimStep ? (
                    <Typewriter
                      text={h.claim}
                      cps={120}
                      onDone={advance}
                    />
                  ) : (
                    h.claim
                  )}
                </strong>
                <ConfidenceBar level={h.confidence} />
              </div>
              {step >= evidenceStep ? (
                <p className="text-xs text-muted-foreground">
                  {step === evidenceStep && !skipped ? (
                    <Typewriter
                      text={h.evidence}
                      cps={140}
                      onDone={advance}
                    />
                  ) : (
                    h.evidence
                  )}
                </p>
              ) : null}
              {evidenceVisible && h.source_keywords.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-wrap gap-1"
                >
                  {h.source_keywords.map((k) => (
                    <span
                      key={k}
                      className="text-[10px] uppercase tracking-wide rounded-sm border px-1.5 py-0.5 text-muted-foreground"
                    >
                      {k}
                    </span>
                  ))}
                </motion.div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {skipped ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          {data.citations.length > 0 ? (
            <CitationsList citations={data.citations} />
          ) : null}
          <MethodologicalNote text={data.methodological_note} />
        </motion.div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={skip}
            className="text-xs"
          >
            Tout afficher
          </Button>
        </div>
      )}
    </div>
  );
}

function CitationsList({
  citations,
}: {
  citations: AnomalyExplanationResponse["citations"];
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium">Sources</h4>
      <ul className="space-y-1">
        {citations.map((c) => (
          <li key={c.uri} className="text-xs">
            <a
              href={c.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {c.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MethodologicalNote({ text }: { text: string }) {
  return (
    <aside
      role="note"
      className="rounded-md border-l-2 p-3 text-xs"
      style={{
        borderLeftColor: "#fbbf24",
        background: "rgba(251, 191, 36, 0.06)",
      }}
    >
      <strong className="block text-[11px] uppercase tracking-[0.16em] mb-1 text-warning font-mono">
        Note méthodologique
      </strong>
      {text}
    </aside>
  );
}

function CopySourcesButton({
  citations,
}: {
  citations: AnomalyExplanationResponse["citations"];
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        const md = citations.map((c) => `- [${c.title}](${c.uri})`).join("\n");
        try {
          await navigator.clipboard.writeText(md);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard API not available; silently no-op
        }
      }}
    >
      {copied ? "Copié ✓" : "Copier les sources"}
    </Button>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-label="Analyse en cours" className="space-y-2">
      <div className="h-4 w-3/5 animate-pulse rounded bg-muted/60" />
      <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-muted/40" />
      <div className="h-3 w-2/5 animate-pulse rounded bg-muted/40" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-destructive">Erreur d&apos;analyse : {message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
