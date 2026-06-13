import { z } from "zod";

export const ChatRoleSchema = z.enum(["user", "assistant", "system"]);

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string().min(1).max(2000),
});

export const ChatContextSchema = z
  .object({
    year: z.number().int().min(2000).max(2100).optional(),
    energy: z.enum(["Totale", "Électricité", "Gaz"]).optional(),
    region: z.string().max(120).optional(),
    selectedDept: z.string().max(4).nullable().optional(),
    displayMode: z.enum(["absolute", "per-capita"]).optional(),
  })
  .partial();

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
  context: ChatContextSchema.optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatContext = z.infer<typeof ChatContextSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
