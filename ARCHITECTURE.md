# Architecture

## High-level

```
┌──────────────────────────────────────────────────────┐
│                    Browser (Next.js)                  │
│  ┌───────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ React Charts  │  │ Filters    │  │ Anomaly UI │  │
│  │ (Plotly.js)   │  │ (URL state)│  │ (cited)    │  │
│  └───────┬───────┘  └─────┬──────┘  └─────┬──────┘  │
│          │                │                │         │
│          ▼                ▼                ▼         │
│   ┌─────────────────────────────────────────────┐   │
│   │       Zustand (URL-synced searchParams)     │   │
│   └─────────────────────────────────────────────┘   │
└────────────────┬─────────────────────────┬──────────┘
                 │                         │
                 ▼                         ▼
   ┌──────────────────────┐    ┌──────────────────────────┐
   │ Static JSON datasets │    │   Vercel Serverless API  │
   │   (precomputed)      │    │ /api/chat                │
   │ - departments.json   │    │ /api/report              │
   │ - geojson.json       │    │ /api/explain-anomaly ⭐  │
   │ - anomalies.json     │    └──────────────┬───────────┘
   │ - clusters.json      │                   │
   │ - predictions.json   │                   ▼
   └──────────────────────┘    ┌──────────────────────────┐
                               │  Google Gemini API       │
                               │  - Flash (free)          │
                               │  - Pro w/ Grounding (paid)│
                               └──────────────────────────┘
```

## Data layer

### Why pre-computed JSON?
- 303 rows × 28 cols is tiny — fits in client memory easily
- Anomaly detection (Z, IQR, IsolationForest) for all (year × energy × sector ×
  threshold) combos = ~9 MB precomputed; load once, filter client-side
- No backend server needed for data → zero ops overhead, zero cost
- Static = cacheable globally on Vercel edge → <50ms TTFB anywhere

### Pipeline stages
1. Excel → DataFrame (pandas)
2. Join INSEE population by department code
3. Compute Z-scores (per year × energy × sector, all thresholds)
4. Compute IQR bounds (per year × energy × sector, all multipliers)
5. Train Isolation Forest (per year × energy, contamination grid)
6. Run K-means on per-capita normalized vectors (k via silhouette)
7. Linear regression 2025 with bootstrap CI
8. Emit 5 JSONs with frozen schemas

### Country extensibility
The pipeline reads a `countries/<iso>.config.json`:
```json
{
  "iso": "FR",
  "name": "France",
  "source_excel": "data/donne_es2026.xlsx",
  "geojson_url": "...",
  "population_csv": "data/insee_population_departements.csv",
  "id_column": "Code département",
  "name_column": "Libellé département",
  "region_column": "Libellé région",
  "sectors": ["agriculture", "industrie", "résidentiel", "tertiaire", "autre"]
}
```
Adding UK / DE = create a new config + provide same-shape CSV. The pipeline
and frontend require zero code changes.

## State management

**Why Zustand and not Redux/Context?**
- 6 global slices (year, energy, region, sector, view, selectedDept)
- No async middleware needed (data is static, AI is via fetch())
- URL sync via Next.js `useSearchParams` — shareable links
- ~3KB gzipped vs Redux ~12KB

## AI architecture

### Provider choice: Gemini

Reasons (in order of importance):
1. **Native Google Search Grounding** — built into the API, no RAG to build
2. **Free tier on Flash** — chatbot + report cost $0
3. **Vercel AI SDK supports Gemini natively** — provider-agnostic code

**Provider-agnostic abstraction**: `lib/ai-client.ts` wraps `streamText()`
from the Vercel SDK. Swapping to Claude or GPT requires changing one line.

### Three endpoints, three concerns

| Endpoint | Model | Cost | Purpose |
|---|---|---|---|
| `/api/chat` | Gemini 2.5 Flash | $0 | Free-form Q&A on the data |
| `/api/report` | Gemini 2.5 Flash | $0 | Templated paragraph for selected dept |
| `/api/explain-anomaly` | Gemini 3.1 Pro + grounding | ~$0.07 | Sourced hypotheses with citations |

### Why not Ollama in production?
- Ollama runs locally; Vercel can't reach `localhost:11434` from edge runtime
- **Used only in dev** for cost-free iteration — switched at deploy via env var

## Frontend architecture

### Component hierarchy
```
app/
  layout.tsx                # root layout, fonts, providers
  page.tsx                  # dashboard composition (Server Component)
  api/                      # serverless endpoints

components/
  filters/                  # URL-synced selects
  charts/                   # Plotly wrappers (Client)
  anomalies/                # detection UI + explanation panel
  ui/                       # shadcn primitives + custom (glass-card)

lib/
  store.ts                  # Zustand
  ai-client.ts              # provider-agnostic LLM wrapper
  plotly-theme.ts           # custom theme matching design tokens
  schemas/                  # Zod input/output validation
  prompts/                  # LLM system prompts (rigor-checked)
  ratelimit.ts              # Upstash wrapper
```

### Server vs Client components
- Default: Server Component (no JS shipped)
- Client only when needed: charts (Plotly), filters (state), AI streams
- Pattern: a Server page composes Client islands. ~70% of code is Server.

## Performance budget

- First Load JS (root): <350 KB
- Largest Contentful Paint: <2s (Vercel edge)
- Plotly bundle is ~280 KB — lazy-loaded via `next/dynamic`
- Static JSONs pre-fetched in parallel via `Promise.all` in the Server page

## Security boundary

Enforced in `middleware.ts`. Summary:
- API keys in env, never client
- Rate limiting on all AI endpoints
- Zod validation on all I/O boundaries
- Strict security headers
- No user data, no cookies, no analytics by default
