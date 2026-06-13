# Contributing to Energy Atlas

First — thank you for considering a contribution. Energy Atlas is a small
open-source project, and any help (code, data, translations, design feedback)
is genuinely valued.

## TL;DR

- **Bug?** Open an issue with `bug` label, screenshots, browser/OS, repro steps.
- **Idea?** Open an issue with `enhancement` label and motivation.
- **Want to add a country?** See [Adding a new country](#adding-a-new-country).
- **PR?** Fork → branch → commit → PR. We aim to respond within 7 days.

## What we welcome

- 🐛 **Bug reports** — especially edge cases on mobile, screen readers, slow networks
- 🌍 **New country adapters** — UK, Germany, Spain, Italy, Belgium…
- 🎨 **UI/UX improvements** — accessibility wins, micro-interactions, mobile polish
- 📊 **New visualizations** — only if they answer a real analytical question
- 📚 **Documentation** — translations (currently FR/EN), tutorials, screencasts
- 🧪 **Tests** — we always want more snapshot tests on the AI guardrails
- 🔒 **Security findings** — please disclose privately to the project maintainer

## What we don't merge (without prior discussion)

- ❌ New AI features that bypass the four rigor guardrails (citation-or-nothing, confidence taxonomy, domain allowlist, methodological note)
- ❌ New data sources without provenance documentation
- ❌ Visual changes that violate the design tokens (see `lib/plotly-theme.ts` and `app/globals.css`)
- ❌ Major framework changes (we're committed to Next.js + Tailwind)
- ❌ Removing the methodological note on the anomaly explanation (it's load-bearing)

If your change touches any of these, **open an issue first** to discuss before
investing time in a PR.

## Development setup

```bash
git clone https://github.com/<your-username>/energy-atlas.git
cd energy-atlas
npm install
cp .env.example .env.local
# Get a free Gemini key from https://aistudio.google.com/apikey
# Paste into .env.local

# Generate datasets (one-time, ~1 min)
cd data && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python prepare_data.py --verify
cd ..

npm run dev
```

Before submitting a PR, run:

```bash
npm run typecheck
npm run lint
npm run test
```

All three must be clean.

## Adding a new country

This is the highest-impact contribution path. The architecture is designed
to make it tractable:

1. **Source the data** — find an open dataset for territorial energy
   consumption in your country (e.g., data.gov.uk, destatis.de, ine.es).
   It must include per-region/department/state breakdown by sector and energy
   type, ideally with ≥ 3 years of history.

2. **Source the population data** — equivalent of INSEE for your country
   (ONS for UK, Destatis for DE, INE for ES, Istat for IT).

3. **Source the GeoJSON** — administrative boundaries at the right level
   (counties, Länder, comunidades, regions).

4. **Create the country config** — `data/countries/<iso>.config.json`:
   ```json
   {
     "iso": "UK",
     "name": "United Kingdom",
     "name_en": "United Kingdom",
     "source_excel": "data/uk_energy_consumption.xlsx",
     "geojson_url": "...",
     "population_csv": "data/uk_population_lad.csv",
     "id_column": "LAD code",
     "name_column": "LAD name",
     "region_column": "Region",
     "sectors": ["domestic", "industrial", "commercial", "transport", "other"],
     "currency": "GBP",
     "language": "en",
     "map_center": { "lat": 54.0, "lon": -2.5 },
     "map_zoom": 5
   }
   ```

5. **Place the source files** in `data/countries/<iso>/`:
   - The raw dataset (Excel/CSV)
   - The population CSV
   - The GeoJSON

6. **Run the pipeline**: `python prepare_data.py --country=uk`. The script
   produces the same 5 JSON files but in `data/countries/uk/`.

7. **Translate UI strings** — add `messages/en-GB.json` (or `de.json`, etc.)
   if your country uses different terminology.

8. **Open the PR** with:
   - The config and source files
   - Generated JSONs
   - Translation file
   - One screenshot of the dashboard rendering your country
   - Your dataset's license and source URL clearly noted

## Code style

- **TypeScript strict** — no `any`. Use `unknown` then narrow.
- **Zod validation** at every API boundary
- **Server Components by default** — `"use client"` only when justified
- **Tailwind only** — no CSS Modules, no styled-components
- **Lucide icons** — never emojis in section titles
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`

Run `npm run lint` before committing.

### Pre-commit hook (Husky)

A versioned pre-commit hook (`.husky/pre-commit`) blocks commits whose
staged files contain API-key patterns:

- Google AI Studio / Gemini : `AIza` + 35 base64-url chars
- Anthropic : `sk-ant-` + 40+ base64-url chars
- OpenAI / generic `sk-` : `sk-` + 40+ alphanumeric chars

The hook is installed automatically when you run `npm install` (via the
`prepare` script). If you ever need to bypass it after careful review,
use `git commit --no-verify` — but rotate the key in the upstream
provider first if it was real.

`.env.local` is already `.gitignore`d. Never paste a real key into
`.env.example`; use placeholders only.

## PR checklist

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run test` passes
- [ ] No new dependencies added without explanation in PR description
- [ ] No `.env*` files committed
- [ ] Screenshots if UI changes
- [ ] Updated docs if behavior changes
- [ ] PR description explains the WHY, not just the WHAT

## Code of conduct

Be kind. Disagree on substance, never on people. We follow the [Contributor
Covenant](https://www.contributor-covenant.org/) v2.1. Issues with conduct
should be reported privately to the project maintainer.

## License

By contributing, you agree your contributions are licensed under the MIT
license (same as the project).

## Recognition

All contributors are listed in the README. Significant contributions
(>5 merged PRs or a country adapter) get a "Maintainer" mention with
your social profile.

---

Thanks for helping make territorial energy data more accessible to everyone.
