import { google } from "@ai-sdk/google";
import "./env"; // ensures env is validated at first import

/**
 * Model selection for Energy Atlas.
 *
 * gemini-2.5-flash is used for ALL endpoints (chat, report, explain-anomaly)
 * to keep the project within the Google AI Studio free tier (~1500 req/day
 * per project). Grounding (the google_search tool) is supported on Flash and
 * was verified to return non-empty groundingChunks.
 *
 * Pro upgrade path (gemini-2.5-pro or 3.x preview) is documented in README
 * for users who want higher analytical depth and don't mind paid usage —
 * the swap is a single string change here.
 */

export const DEFAULT_MODEL_ID = "gemini-2.5-flash";

export function getModel(opts: { modelId?: string } = {}) {
  return google(opts.modelId ?? DEFAULT_MODEL_ID);
}

export { google };
