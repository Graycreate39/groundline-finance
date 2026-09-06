# Groundline

Groundline is a **local-hosted, research-first finance workspace**. A user starts with a real company name or U.S. ticker, inspects the resolved legal entity and official evidence, reviews gaps and proposed assumptions, then generates a deterministic model whose outputs remain linked to source claims.

The product does not use GitHub Pages as its intended runtime: live research requires the included local server so requests and optional credentials never enter browser code.

## Quick start

Requirements: Node.js 20+. There are no third-party package dependencies.

```bash
cp .env.example .env
# Edit SEC_USER_AGENT to identify yourself to SEC.gov.
npm run dev
# http://127.0.0.1:4173
```

Enter `AAPL` to exercise the public-company path. Groundline resolves the SEC registrant, downloads SEC submissions and XBRL company facts, normalizes current filing claims, and stores the workspace locally. SEC asks automated clients to declare a user agent and respect fair-access limits.

Local records are written atomically to `.groundline/data.json` by default (mode 0600). Change `GROUNDLINE_DATA_PATH` in `.env` if desired. That directory and environment files are ignored by Git.

## First-run workflow

1. **Research a company** — enter a public ticker/name, private company, sector, or concept and select valuation, operating model, comparables, financing, or decision analysis.
2. **Resolve identity** — inspect legal name, ticker, exchange, country, SIC sector, CIK, match confidence, and the SEC submissions source.
3. **Review the plan** — see identity, filing collection, claim normalization, market-data requirements, and model-generation readiness.
4. **Inspect claims** — each reported fact retains company, metric, value, unit/currency, period, filing type/date, retrieval time, XBRL location, confidence, provenance, model-use flag, and direct filing link.
5. **Assess coverage** — distinguish reported, externally sourced, inferred, estimated, contradictory, stale, and missing inputs.
6. **Confirm assumptions** — accept or edit bounded estimates, with method, rationale, range, confidence, and supporting evidence.
7. **Generate the model** — deterministic calculation code, never an LLM, produces schedules and outputs and rejects non-finite inputs.

If SEC, network access, a market-data provider, or a fact is unavailable, the workflow stops in a named incomplete state with the missing dependency and next action. It never substitutes fictional values. Current market capitalization is intentionally shown as incomplete until an optional market-data adapter is configured.

## Modes

### Real research mode

Uses the local `/api/research` endpoint and the official SEC EDGAR submissions and company-facts APIs. Configure `SEC_USER_AGENT`. Optional market-data and research providers belong behind server-side adapters using local environment variables.

### Credential-free example mode

“Explore examples” contains four clearly marked fictional, bundled datasets dated 6 September 2026. These examples are secondary to live research. Their numbers are never labeled as company-reported facts.

## Architecture

```text
server/server.mjs          local HTTP application and JSON API
server/providers/sec.mjs   SEC EDGAR identity/facts adapter
server/store.mjs           atomic, durable local JSON persistence
server/model.mjs           evidence-to-model generation and input validation
src/app.mjs                research-first browser interface
src/engine.mjs             deterministic finance calculations
src/styles.css             responsive editorial design system
tests/                     finance, provider, provenance, and failure tests
```

Provider adapters return typed, normalized research results. The local server owns outbound requests and credentials. The persistence boundary can be replaced with SQLite later without changing provider or modeling interfaces. Browser `localStorage` is no longer the system of record.

## Provenance

Groundline uses five visible categories:

- **Reported** — only a value obtained from a real company disclosure such as an SEC filing.
- **Externally sourced** — a value from a third-party public source.
- **Inferred** — a conclusion derived from evidence but not directly disclosed.
- **Model-estimated** — a deterministic estimate with method, rationale, range, and confidence.
- **User-entered or manually overridden** — a retained human change that does not erase its prior value.

See [research methodology](docs/research.md), [modeling methodology](docs/modeling.md), [AI and numerical boundaries](docs/ai-safety.md), and [demo-data provenance](docs/demo-data.md).

## Numerical integrity

Calculation entry points reject missing, `NaN`, infinite, or incompatible critical inputs. DCF also rejects WACC at or below terminal growth and non-positive share counts; runway rejects non-finite values and invalid horizons. UI formatters only receive validated outputs. Tests cover valid calculations and invalid/incomplete states.

## Commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## Privacy

Research data and audit events remain on the local machine. Groundline does not ship telemetry. `.env`, `.env.local`, provider keys, and `.groundline/` are excluded from Git. SEC requests include the configured user agent. Imported financial data is not written to application logs.

## Current limitations

- SEC EDGAR supports U.S. registrants and filing-based facts; taxonomy variation can leave gaps.
- A market-data provider is not bundled, so live price, market capitalization, and enterprise value remain explicitly incomplete.
- Private-company collection currently presents the cautious workflow and next actions; automated funding/pricing/hiring adapters and document upload are next.
- The first durable store is atomic local JSON rather than SQLite. It persists workspaces/evidence/audit history but does not yet support concurrent processes or migrations beyond its schema version.
- Optional LLM and additional research adapters are not implemented. The compact command surface does not impersonate an AI provider.
- Formula authoring, multi-currency curves, advanced debt schedules, and liquidation waterfalls remain deferred.
- Live SEC verification depends on local network access to `data.sec.gov` and `www.sec.gov`.

## Screenshots

Updated research-first documentation captures live in [`screenshots/`](screenshots/). They cover the primary company-research entry, active evidence collection, coverage/evidence review, incomplete-provider state, and generated model foundation.
