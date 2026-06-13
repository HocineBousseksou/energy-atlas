import { createUIMessageStreamResponse, simulateReadableStream } from "ai";

/**
 * Wire-faithful streamed mock for /api/chat in demo mode.
 *
 * Uses two AI SDK primitives to avoid hand-rolling the SSE protocol:
 *   - simulateReadableStream({chunks,...}) emits typed chunks with
 *     configurable delays (the typing-effect cadence).
 *   - createUIMessageStreamResponse({stream,...}) wraps that stream
 *     into the exact Response shape that useChat() expects on the
 *     client (correct headers, x-vercel-ai-ui-message-stream marker,
 *     UIMessageChunk envelopes).
 *
 * Net effect: a useChat consumer cannot distinguish the demo response
 * from a live streamText one. No bespoke wire-protocol code in this
 * file.
 */

interface UIChunk {
  type: string;
  // Indexer required so the strict UIMessageChunk schema accepts our
  // hand-built objects without us re-typing the entire union.
  [key: string]: unknown;
}

function chunkText(text: string, approxLen = 22): string[] {
  const words = text.split(/(\s+)/); // keep whitespace for natural reads
  const chunks: string[] = [];
  let cur = "";
  for (const w of words) {
    cur += w;
    if (cur.length >= approxLen) {
      chunks.push(cur);
      cur = "";
    }
  }
  if (cur.length > 0) chunks.push(cur);
  return chunks;
}

/**
 * Build a streamed response carrying the given assistant text, formatted
 * as a single text-part of one message. Caller is the chat endpoint
 * branch that runs in demo mode.
 */
export function createDemoChatResponse(
  text: string,
  opts: { msPerChunk?: number; initialDelayMs?: number } = {},
): Response {
  const msPerChunk = opts.msPerChunk ?? 45;
  const initialDelayMs = opts.initialDelayMs ?? 200;

  const id = "demo-msg-1";
  const deltas = chunkText(text);

  const chunks: UIChunk[] = [
    { type: "start", messageId: id },
    { type: "start-step" },
    { type: "text-start", id },
    ...deltas.map((delta) => ({ type: "text-delta", id, delta })),
    { type: "text-end", id },
    { type: "finish-step" },
    { type: "finish" },
  ];

  const stream = simulateReadableStream({
    chunks,
    initialDelayInMs: initialDelayMs,
    chunkDelayInMs: msPerChunk,
    // biome-ignore lint: AI SDK casts internally; the chunk shape is duck-typed
  }) as unknown as ReadableStream<never>;

  return createUIMessageStreamResponse({
    stream,
  });
}
