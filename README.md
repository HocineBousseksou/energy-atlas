# Energy Atlas

**Open-source decision-support tool for analyzing French departmental energy
consumption — with statistical anomaly detection and grounded LLM explanations.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live demo](https://img.shields.io/badge/demo-live-green.svg)](#)
[![Made with Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> 🔗 **Live demo**: _[link to be added after deployment]_

---

## Who is this for?

Energy Atlas is built for the people who **don't have access to operator-internal
BI tools** (EDF, Enedis, RTE) but still need to understand and analyze
territorial energy patterns.

### 🏛️ Local public decision-makers
Agents in collectivities, ADEME, DREAL, regional development agencies. Today
they outsource analyses at €30k/mission to consultancies. Energy Atlas gives
them the same quick comparisons (per-capita, by cluster, against region) for
free.

### 📰 Data journalists & researchers
Le Monde, Mediapart, Vert.eco, AFP, academic researchers. Energy Atlas
produces analyses with **citation-verified sources** via Google Search
Grounding — exactly what's needed to support an article or paper.

### 🎓 Educators & students
A zero-install pedagogical tool for energy / transition formations. Live URL,
mobile-friendly, accessible WCAG AA.

---

## What makes it different

The data is open and not the differentiator. The combination is:

1. **Multi-method statistical analysis** without code (3 anomaly detection
   methods + K-means clustering + linear regression)
2. **LLM-grounded explanations** with epistemological guardrails
   (citation-or-nothing, confidence taxonomy, methodological note)
3. **Open-source country-extensible architecture** — add UK, DE, ES with one
   config file (see [CONTRIBUTING.md](CONTRIBUTING.md))

No existing tool combines these three on the public French market today.

---

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript strict
- **Tailwind v4** + **shadcn/ui** + **Framer Motion** + **Lucide**
- **react-plotly.js** with custom theme
- **Vercel AI SDK** + **Google Gemini** (Flash + Pro w/ Search Grounding)
- **Zustand** state, URL-synced via searchParams
- **Static JSON datasets** pre-computed via `data/prepare_data.py`
  (Python + pandas + scikit-learn)
- Deployed on **Vercel** (edge static + serverless API routes)

See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions, and the
[Roadmap](#roadmap) below for what's deferred.

---

## AI rigor — the four guardrails

The LLM layer (`/api/explain-anomaly`) is the most defendable part of
this project. Every grounded response goes through four discipline gates,
enforced in `lib/prompts/explain-anomaly.ts` and `lib/schemas/anomaly.ts`:

1. **Citation-or-nothing** — if Google Search Grounding returns no
   sources, the endpoint short-circuits to `{hypotheses: [], …}` with a
   methodological note. Never produces a hypothesis without a citation.
2. **Confidence taxonomy** — three literal labels (`élevé / modéré /
   faible`) enforced by Zod enum; English variants like `"high"` reject
   at parse-time and return 502.
3. **Domain bias** — system prompt prefers `*.gouv.fr`, INSEE, ADEME,
   MétéoFrance, Le Monde, Les Échos, Reuters, fr.wikipedia. Other
   domains accepted but downgraded.
4. **Methodological note** — every response must include ≥ 50 chars
   reminding the reader that *corrélation n'implique pas causalité*.
   Required by the schema even when the response is empty.

The adversarial demo (synthetic forge: Paris agriculture 50 TWh, fabricated
+1200 % YoY) shows the framework working under adversarial input — the
model **rebuts the impossible value with sourced INSEE counter-evidence**
rather than confabulating causes.

---

## Demo Mode (for presentations)

`DEMO_MODE=true` makes every LLM endpoint return a pre-recorded fixture
from `lib/demo/fixtures/` with simulated latency (~700-1300 ms).
Zero Gemini round-trips, zero network dependency. The two scripted
moments are Nord 2024 industriel (a real capture: 3 hypotheses,
16 citations) and Paris agriculture forge (the rigor demo).

```bash
# .env.local
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true   # client-side flag for the bottom-right "DEMO" badge
```

Both vars must be in agreement. Switch back with `DEMO_MODE=false` for
live Q&A.

---

## Quick start

```bash
git clone https://github.com/<your-username>/energy-atlas.git
cd energy-atlas
npm install

# Get a free Gemini key from https://aistudio.google.com/apikey
cp .env.example .env.local
# Edit .env.local and paste your key

# Generate datasets (one-time, ~1 minute)
cd data
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python prepare_data.py --verify
cd ..

npm run dev          # http://localhost:3000
```

See [INSTALL.md](INSTALL.md) for full setup details.

---

## Deploy your own

```bash
vercel --prod
```

Required env vars on Vercel: `GOOGLE_GENERATIVE_AI_API_KEY` (and optionally
`UPSTASH_REDIS_REST_URL` + token for rate limiting).

---

## Project structure

```
.
├── app/                    # Next.js App Router
│   ├── api/                # serverless endpoints (chat, report, explain-anomaly)
│   └── page.tsx            # main dashboard
├── components/             # UI components (Server + Client mix)
├── lib/                    # state, schemas, prompts, utilities
├── data/                   # static JSON datasets + Python pipeline
├── public/                 # static assets
└── middleware.ts           # security headers
```

---

## Data sources

- 🔌 **Energy consumption**: [data.gouv.fr / Agence ORE](https://opendata.agenceore.fr/)
- 👥 **Population**: [INSEE](https://www.insee.fr/fr/statistiques/serie/001641607)
- 🗺️ **Geographic boundaries**: data.gouv.fr (administrative départements)

---

## Contributing

Contributions are warmly welcomed — especially:

- 🌍 **Adding a new country** (UK, DE, ES, IT…) — see [CONTRIBUTING.md](CONTRIBUTING.md)
- 🐛 **Bug reports** with clear repro steps
- 🎨 **UI/UX improvements** especially around accessibility
- 📚 **Translations** (currently FR/EN)
- 🧪 **Tests** for the AI rigor guardrails

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## License

[MIT](LICENSE) — use, fork, modify freely. Attribution appreciated but not required.

---

## Author

Built by **Mohamed Hocine Bousseksou** as part of an L3 EEA internship CY CERGY PARIS UNIVERSITÉ 2026.

Developed with AI assistance (Claude Code), under a strict set of engineering and AI-rigor conventions — the same citation-or-nothing discipline the app itself enforces.

If this project helps you, a ⭐ on GitHub is the best thank-you.

---

## Roadmap

- [ ] **v1.0** — France MVP with all features (current)
- [ ] **v1.1** — UK adapter + i18n (FR/EN)
- [ ] **v1.2** — Germany adapter
- [ ] **v2.0** — Time series at monthly granularity (when source data permits)
- [ ] **v2.1** — Comparison vs European peers (cross-country analysis)

Have a different idea? [Open an issue](../../issues/new).
