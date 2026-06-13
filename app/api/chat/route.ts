import { streamText } from "ai";
import { getModel } from "@/lib/ai-client";
import { chatDemo } from "@/lib/demo";
import { isEffectiveDemoMode } from "@/lib/demo/mode-cookie";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts/chat";
import { chatLimiter, clientId } from "@/lib/ratelimit";
import { ChatRequestSchema } from "@/lib/schemas/chat";

export const runtime = "nodejs";

function contextHeader(
  ctx: NonNullable<
    ReturnType<typeof ChatRequestSchema.parse>["context"]
  > | undefined,
): string {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.year) parts.push(`année=${ctx.year}`);
  if (ctx.energy) parts.push(`énergie=${ctx.energy}`);
  if (ctx.region && ctx.region !== "all") parts.push(`région=${ctx.region}`);
  if (ctx.selectedDept) parts.push(`département sélectionné=${ctx.selectedDept}`);
  if (ctx.displayMode) parts.push(`mode=${ctx.displayMode}`);
  if (parts.length === 0) return "";
  return `\n\nContexte du tableau de bord (filtres en cours) : ${parts.join(", ")}.`;
}

export async function POST(req: Request) {
  // Rate limit
  const { success } = await chatLimiter.limit(clientId(req));
  if (!success) {
    return Response.json(
      { error: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  // Demo Mode short-circuit — wire-faithful streamed mock. Cookie
  // override (force_mode) wins over env.DEMO_MODE for unlocked admins.
  if (await isEffectiveDemoMode()) {
    return chatDemo(body);
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "INVALID_BODY", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { messages, context } = parsed.data;

  try {
    const result = streamText({
      model: getModel(),
      system: CHAT_SYSTEM_PROMPT + contextHeader(context),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.4,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat] LLM error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ error: "LLM_FAILURE" }, { status: 502 });
  }
}
