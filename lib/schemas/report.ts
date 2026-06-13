import { z } from "zod";

export const ReportRequestSchema = z.object({
  deptCode: z.string().min(1).max(4),
  year: z.number().int().min(2000).max(2100),
  energy: z.enum(["Totale", "Électricité", "Gaz"]),
});

export type ReportRequest = z.infer<typeof ReportRequestSchema>;

export const ReportResponseSchema = z.object({
  markdown: z.string().min(1).max(4000),
});

export type ReportResponse = z.infer<typeof ReportResponseSchema>;
