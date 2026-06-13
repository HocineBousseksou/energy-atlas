import { z } from "zod";

export const ConfidenceLevel = z.enum(["élevé", "modéré", "faible"]);
export type Confidence = z.infer<typeof ConfidenceLevel>;

export const HypothesisSchema = z.object({
  claim: z.string().min(10).max(300),
  evidence: z.string().min(20).max(800),
  confidence: ConfidenceLevel,
  source_keywords: z.array(z.string().min(1)).min(1).max(8),
});

export const AnomalyExplanationSchema = z.object({
  hypotheses: z.array(HypothesisSchema).max(4),
  methodological_note: z.string().min(50).max(500),
});

export type AnomalyExplanation = z.infer<typeof AnomalyExplanationSchema>;

export const CitationSchema = z.object({
  uri: z.string().url(),
  title: z.string().min(1),
});

export type Citation = z.infer<typeof CitationSchema>;

export const AnomalyExplanationResponseSchema = AnomalyExplanationSchema.extend(
  {
    citations: z.array(CitationSchema),
  },
);

export type AnomalyExplanationResponse = z.infer<
  typeof AnomalyExplanationResponseSchema
>;

const ENERGY = z.enum(["Totale", "Électricité", "Gaz"]);
const SECTOR = z.enum([
  "totale",
  "agriculture",
  "industrie",
  "résidentiel",
  "tertiaire",
  "autre",
]);
const METHOD = z.enum(["zscore", "iqr", "iforest"]);

export const ExplainAnomalyRequestSchema = z.object({
  deptCode: z.string().min(1).max(4),
  deptName: z.string().min(1).max(80),
  year: z.number().int().min(2000).max(2100),
  energy: ENERGY,
  sector: SECTOR,
  method: METHOD,
  score: z.number().finite(),
  threshold: z.number().finite().min(0).max(100),
  value: z.number().finite().min(0),
  yoyPct: z.number().finite(),
  nationalSectorMean: z.number().finite().min(0),
  population: z.number().int().min(0).max(50_000_000),
  clusterLabel: z.string().min(1).max(120).optional().nullable(),
  region: z.string().min(1).max(120).optional(),
});

export type ExplainAnomalyRequest = z.infer<typeof ExplainAnomalyRequestSchema>;
