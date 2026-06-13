# Installation Guide

## Prerequisites

- **Node.js** ≥ 20.x (recommend 22 LTS)
- **Python** ≥ 3.10 (for the data pipeline)
- **Git**
- A **Google AI Studio** account (free) — https://aistudio.google.com
- (Optional) An **Upstash** account for rate limiting (free) — https://console.upstash.com
- (Optional) **Ollama** for local LLM dev — https://ollama.com

## Step 1 — Clone and install

```bash
git clone https://github.com/<your-username>/energy-atlas.git
cd energy-atlas
npm install
```

`npm install` also installs the Husky pre-commit hook (via the `prepare`
script). The hook blocks commits that contain API-key patterns — see
[CONTRIBUTING.md](CONTRIBUTING.md#pre-commit-hook-husky).

## Step 2 — Provide the source data

Place the source Excel here:
```
data/donne_es2026.xlsx
```

The repository already ships a copy of this dataset (open data from
Agence ORE / data.gouv.fr). If you replace it with a newer export, keep
the same column layout.

INSEE population CSV is optional — the pipeline has a hardcoded fallback.
For best precision, download `Population par département` from insee.fr and
save as `data/insee_population_departements.csv` (semicolon-separated,
columns: `Code département;Population`).

## Step 3 — Set up environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
1. Get your Gemini API key from https://aistudio.google.com/apikey
2. Paste it into `GOOGLE_GENERATIVE_AI_API_KEY=`
3. (Optional) Sign up at console.upstash.com for free Redis and paste the
   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` credentials.

`.env.local` is gitignored — your key never leaves your machine.

## Step 4 — Generate the datasets

```bash
cd data
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python prepare_data.py --verify
cd ..
```

This produces the five static JSON files the frontend loads
(`departments.json`, `geojson.json`, `anomalies.json`, `clusters.json`,
`predictions.json`). Outputs are deterministic (`random_state=42`) and the
run should complete in under a minute.

## Step 5 — Run locally

```bash
npm run dev
```

Open http://localhost:3000.

To run without any Gemini calls (pre-recorded fixtures, ~700–1300 ms
simulated latency), set both demo flags in `.env.local`:

```bash
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

## Troubleshooting

### "Module not found" after install
Re-run `npm install`. If you pulled new commits, a dependency may have been
added since your last install.

### Plotly bundle warnings
Plotly is heavy (~280 KB). It is code-split via `next/dynamic`, so a warning
about its size during the first build is expected and harmless.

### Gemini API quota errors
The free tier on Flash is ~1500 req/day. If you hit it, wait or upgrade. The
Pro grounding calls are paid — set `MAX_DAILY_LLM_CALLS` in your env to cap
total usage.

### Environment validation error on startup
The app validates env vars at boot. If you see an "Invalid environment"
error, check `.env.local` against `.env.example` — most often a missing
`GOOGLE_GENERATIVE_AI_API_KEY` while `AI_PROVIDER=google`.
