import { z } from "zod";

const EnvSchema = z
  .object({
    AI_PROVIDER: z.enum(["google", "ollama"]).default("google"),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("")),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    MAX_DAILY_LLM_CALLS: z.coerce.number().int().positive().default(500),
    OLLAMA_BASE_URL: z.string().optional(),
    OLLAMA_MODEL: z.string().optional(),
    // Demo Mode (server side). When true, every LLM endpoint returns
    // a fixture from lib/demo/fixtures/* with simulated latency. The
    // matching client-visible flag is NEXT_PUBLIC_DEMO_MODE — kept
    // separate because Next inlines NEXT_PUBLIC_* at build-time on
    // the client and they don't traverse this Zod parse.
    DEMO_MODE: z
      .union([z.literal("true"), z.literal("false")])
      .default("false")
      .transform((v) => v === "true"),
    // Admin secret for the runtime demo/live toggle. When set, visiting
    // /api/admin/unlock?secret=<value> drops an admin_unlocked cookie
    // which reveals the header toggle (see lib/demo/mode-cookie.ts).
    // Without this var, the toggle endpoints are disabled — useful for
    // local dev where DEMO_MODE alone is enough.
    ADMIN_SECRET: z.string().min(16).optional(),
  })
  .refine(
    (e) =>
      e.AI_PROVIDER !== "google" ||
      (e.GOOGLE_GENERATIVE_AI_API_KEY?.length ?? 0) > 0,
    {
      message:
        "GOOGLE_GENERATIVE_AI_API_KEY is required when AI_PROVIDER=google",
      path: ["GOOGLE_GENERATIVE_AI_API_KEY"],
    },
  );

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const flat = parsed.error.flatten();
  console.error("[env] Invalid environment configuration:", flat.fieldErrors);
  throw new Error(
    "Invalid environment. Check .env.local against .env.example. Details logged to server stderr.",
  );
}

export const env = parsed.data;

export function isUpstashConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}
