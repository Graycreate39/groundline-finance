# Groundline

Groundline is a local-first company-research and financial-modeling workspace. It begins with a real company name or ticker, collects available evidence, identifies material gaps, and generates only the outputs that the evidence can support.

No fictional company or financial value is loaded on first run. Groundline never substitutes invented figures when a provider or data point is unavailable.

## Run locally

Requires Node.js 20 or newer. There are no third-party runtime packages.

```bash
cp .env.example .env
# Replace SEC_USER_AGENT with your name and contact email.
npm run dev
```

Open <http://127.0.0.1:4173>. The local server keeps provider requests and future credentials outside browser code. Research workspaces, evidence, and audit records are stored in `.groundline/data.json`, which is excluded from Git.

The GitHub Pages site is a safe interface preview. Live SEC research requires the local server because GitHub Pages cannot run a server or protect provider credentials.

## What works

- Search a U.S. public company by ticker, name, or CIK.
- Resolve its legal entity, ticker, exchange, location, sector, and match confidence.
- Collect current SEC EDGAR submissions and company facts with filing links, periods, retrieval timestamps, XBRL locations, and provenance.
- Research a private company through a public-reference adapter, while leaving undisclosed financials explicitly missing.
- Add manual financial evidence. Manual values are always labeled **User-entered**.
- Show the research plan, coverage categories, evidence register, source links, initial model outputs, and material gaps.
- Persist workspaces and an audit trail locally.
- Reject `NaN`, `Infinity`, invalid terminal assumptions, and non-finite manual values.

## Provenance

Groundline uses five visible categories:

- **Reported** — a real company disclosure such as an SEC filing.
- **Externally sourced** — a public source outside a company filing.
- **Inferred** — a transparent deduction from evidence.
- **Model-estimated** — a deterministic model assumption or output.
- **User-entered** — a manually provided or overridden value.

Each claim retains its metric, value, unit, currency, reporting period, source URL, source type, filing/publication date when available, retrieval time, supporting location, confidence, provenance, and whether it is used in the active model.

## Public and private companies

Public-company research uses official SEC EDGAR data. SEC facts alone do not provide current market price or market capitalization, so those fields remain missing until an optional market-data adapter is configured.

Private-company research is deliberately cautious. Groundline can establish identity and organize public evidence, but it does not call estimated revenue or margins “reported.” Add management data manually or connect future search and market-data adapters to expand coverage.

## Architecture

```text
index.html                         research-first client entry
tokens.css                        portable visual design tokens
assets/research-desk.jpg          generated editorial research image
src/app.mjs                       company search and evidence workspace
src/engine.mjs                    deterministic finance calculations
server/server.mjs                 local HTTP and research API
server/providers/sec.mjs          SEC EDGAR adapter
server/providers/public-web.mjs   credential-free public-reference adapter
server/model.mjs                  evidence-to-model boundary and validation
server/store.mjs                  durable local JSON store and audit log
tests/                             calculations, providers, API, persistence
```

## Quality checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The test suite covers real-company SEC normalization, inspectable filing links, honest provider failure, private-company evidence boundaries, local persistence, manual provenance, and finite model outputs.

## Current limits

- SEC research covers U.S. registrants and the financial concepts currently mapped in `server/providers/sec.mjs`.
- Private-company financial research needs manual evidence or an additional search/data adapter.
- Current share prices and market capitalization require an optional market-data provider.
- Generated images are product visuals; they never serve as company evidence.
