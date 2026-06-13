import { describe, expect, test } from "vitest";
import { NORD_2024_INDUSTRIEL_FIXTURE } from "@/lib/demo/fixtures/nord-2024-industriel";
import { PARIS_AGRI_FORGE_FIXTURE } from "@/lib/demo/fixtures/paris-agri-forge";
import { AnomalyExplanationResponseSchema } from "@/lib/schemas/anomaly";

/**
 * Regression tests on the two demo fixtures.
 *
 * These run before any release. If they fail, something modified a
 * fixture in a way that breaks the schema or the demo narrative.
 * Re-capture from a live call (DEMO_MODE=false +
 * curl /api/explain-anomaly) before "fixing" the test.
 */

describe("Demo fixtures — schema parse", () => {
  test("T1 — Nord 2024 industriel parses against AnomalyExplanationResponseSchema", () => {
    const result = AnomalyExplanationResponseSchema.safeParse(
      NORD_2024_INDUSTRIEL_FIXTURE,
    );
    if (!result.success) {
      // Print field errors so a CI diff is debuggable at a glance.
      console.error(
        "T1 parse failure:",
        JSON.stringify(result.error.flatten(), null, 2),
      );
    }
    expect(result.success).toBe(true);
  });

  test("T2 — Paris agriculture forge parses against AnomalyExplanationResponseSchema", () => {
    const result = AnomalyExplanationResponseSchema.safeParse(
      PARIS_AGRI_FORGE_FIXTURE,
    );
    if (!result.success) {
      console.error(
        "T2 parse failure:",
        JSON.stringify(result.error.flatten(), null, 2),
      );
    }
    expect(result.success).toBe(true);
  });
});

describe("Demo fixtures — content invariants", () => {
  test("T1 has exactly 3 hypotheses (regression on the demo narrative)", () => {
    expect(NORD_2024_INDUSTRIEL_FIXTURE.hypotheses).toHaveLength(3);
  });

  test("T1 has exactly 16 citations (regression on the resolved-redirect count)", () => {
    expect(NORD_2024_INDUSTRIEL_FIXTURE.citations).toHaveLength(16);
  });

  test("T2 — every hypothesis is 'élevé' (the demo: model rebuts the impossible value with high confidence + INSEE evidence)", () => {
    expect(PARIS_AGRI_FORGE_FIXTURE.hypotheses.length).toBeGreaterThan(0);
    for (const h of PARIS_AGRI_FORGE_FIXTURE.hypotheses) {
      expect(h.confidence).toBe("élevé");
    }
  });

  test("All hypotheses across both fixtures use only the canonical confidence values", () => {
    const allowed = new Set(["élevé", "modéré", "faible"]);
    const all = [
      ...NORD_2024_INDUSTRIEL_FIXTURE.hypotheses,
      ...PARIS_AGRI_FORGE_FIXTURE.hypotheses,
    ];
    for (const h of all) {
      expect(allowed.has(h.confidence)).toBe(true);
    }
  });

  test("Both methodological_notes mention 'corrélation' and 'causalité' (guardrail #4 regression)", () => {
    for (const fx of [
      NORD_2024_INDUSTRIEL_FIXTURE,
      PARIS_AGRI_FORGE_FIXTURE,
    ] as const) {
      expect(fx.methodological_note.toLowerCase()).toContain("corrélation");
      expect(fx.methodological_note.toLowerCase()).toContain("causalité");
    }
  });

  test("Citations have valid URI and non-empty title (CitationSchema invariant)", () => {
    const fxs = [
      NORD_2024_INDUSTRIEL_FIXTURE,
      PARIS_AGRI_FORGE_FIXTURE,
    ] as const;
    for (const fx of fxs) {
      expect(fx.citations.length).toBeGreaterThan(0);
      for (const c of fx.citations) {
        expect(typeof c.uri).toBe("string");
        expect(c.uri).toMatch(/^https?:\/\//);
        expect(c.title.length).toBeGreaterThan(0);
      }
    }
  });
});
