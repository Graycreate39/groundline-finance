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
- Verify a private company's identity, search multiple public sources for funding, valuation, revenue, customers, employees, and market position, and retain conflicting claims for inspection.
- Limit duplicate domains so one company website cannot crowd out independent evidence.
- Annualize disclosed monthly or weekly revenue and use a company-specific operating-footprint estimate when a direct annual figure is unavailable.
- Prefer recent company-specific evidence over fallback assumptions, while keeping unsupported financial values visibly model-estimated.
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

Public-company research uses official SEC EDGAR data. When current price data is unavailable, Groundline estimates market capitalization from reported fundamentals and a sector-adjusted multiple.

Private-company research begins with public identity evidence, then runs targeted public-web searches and ranks official-company material and financial press above aggregators. It diversifies domains, distinguishes funding from revenue, and converts disclosed recurring revenue into an annual figure. Extracted company-specific values are labeled **Externally sourced**; missing values use a visible operating-footprint method and compact expected range.

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
server/providers/web-search.mjs   multi-query private-company evidence search
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
- Public-web research relies on search-result titles and excerpts, so source links and confidence remain visible for inspection; paywalled or unindexed details may still be absent.
- Exact live share prices require an optional market-data provider; without one, market capitalization is estimated from reported fundamentals.
- Generated images are product visuals; they never serve as company evidence.
