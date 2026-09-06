# Groundline

Groundline is a **local-first, auditable finance and strategic-decision workspace**. It connects evidence, provenance, assumptions, deterministic formulas, scenarios, valuation outputs, and decision records rather than treating finance as a collection of opaque calculators.

> All four bundled companies, peers, documents, and figures are fictional. Bundled evidence is an offline demonstration snapshot dated **6 September 2026**, not live research.

## Quick start

Requires Python 3.10+ and Node.js 20+; there are no third-party runtime dependencies.

```bash
npm run dev
# open http://localhost:4173
```

The application opens Arcwell Cloud. Use the company switcher for Northstar Robotics, Meridian Components, and Fieldnote Health. Data and UI state persist in browser `localStorage` under `groundline-state`; clear site data to reset the demo safely.

## Product thesis and audience

Groundline is for startup finance teams, corporate FP&A, investors, and strategy leaders who need an answer **and** a defensible trail explaining it. The interface progressively discloses conclusion → composition → schedule → formula → assumptions → evidence → history.

## Implemented workflows

- Four fictional workspaces spanning SaaS, early-stage, capital-intensive, and new-initiative archetypes.
- Dense operating-model table with actual/forecast periods, stable metric IDs, provenance, formula detail, precedents, evidence, plausible range, override/revert UI, and audit attribution.
- Deterministic DCF, terminal value, EV-to-equity bridge, two-way sensitivity, and inspectable free-cash-flow schedule.
- Comparable-company inclusion/exclusion with immediate median and implied-value recalculation.
- Monthly revenue, burn and runway; hiring scenario; financing, option-pool effects, ownership, MOIC, and IRR.
- Base, Downside, and Upside scenario patches, side-by-side comparisons, and sequential change attribution with residual disclosure.
- Bounded reverse solver for a target enterprise value.
- Provider-independent analyst surface. Credential-free demo mode parses bundled questions into typed proposed actions and never claims an external model is active.
- Evidence/claim register, coverage, conflicts/staleness signals, and a documented information-priority heuristic.
- Persisted decision records linked to model version and scenarios.
- Model health and lint signals for bridge reconciliation, terminal concentration, evidence age, and ownership.

## Demo walkthrough

1. Open **Overview** to read the current conclusion, outputs, scenario range, and model health.
2. Open **Model**, select Revenue or EBITDA, and inspect its formula/evidence. Apply an override and observe the recalculation confirmation/audit event.
3. Open **Scenarios** and compare the deliberate operating patches and valuation bridge.
4. Open **Valuation**, inspect DCF/WACC/terminal mechanics, toggle a peer, and use **Reverse-underwrite target**.
5. Switch to **Northstar Robotics** or open **Capital & ownership**. Add a hiring cohort or round and review runway/dilution.
6. Ask one of the analyst’s bundled questions; review its typed interpretation before applying it.
7. Open **Decisions**, save the recommendation, reload, and verify it remains in local storage.

## Architecture

```text
index.html                 local application entry
src/app.mjs                feature views, interactions, local persistence
src/engine.mjs             deterministic calculations and validation
src/data/demo.mjs          fictional normalized demo data
src/styles.css             responsive design system and components
tests/engine.test.mjs      critical finance-engine tests
docs/                      focused modeling and product methodology
screenshots/               application states captured for documentation
scripts/                    dependency-free quality/build utilities
```

The static front end is deliberately deployable later without changing domain calculations. Provider interfaces and a durable embedded database are the next architectural boundary; the current local slice uses browser storage to remain zero-install.

## Modeling and data conventions

- Money is modeled in USD millions unless explicitly noted; calculations retain JavaScript double precision and display rounding occurs only at the UI boundary.
- Rates are decimals internally; periods are aligned explicitly by schedule index and labeled annual/monthly in the interface.
- Provenance categories are **Reported**, **Externally sourced**, **Inferred**, **Model-estimated**, and **User-entered/manually overridden**. Text and markers accompany color.
- DCF uses unlevered cash flow and Gordon Growth terminal value. Terminal WACC must exceed growth.
- Scenario changes are patches over a versioned baseline. Sequential attribution is order-dependent; any interaction is shown as residual rather than forced into a driver.
- Information priority is a transparent impact × uncertainty × evidence weakness × verifiability heuristic, not Bayesian value of information.

See [financial modeling](docs/modeling.md), [research and estimation](docs/research.md), [scenario/version semantics](docs/scenarios.md), [AI boundaries](docs/ai-safety.md), and [demo provenance](docs/demo-data.md).

## Privacy and providers

No network request is made by the application. No credentials are needed. Imported/private data should remain local; this first slice does not log or transmit it. Optional live AI and research adapters are intentionally deferred until a user supplies a provider and credentials via an uncommitted local environment file. The current analyst identifies itself as a deterministic demo interpreter.

## Quality commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Screenshots

Documentation images are in [`screenshots/`](screenshots/): overview, operating model, evidence drill-down, scenario comparison, valuation, startup capital, and decision record.

## Limitations and roadmap

**Real now:** deterministic core formulas, local scenarios/UI state, demo parser, bundled evidence, DCF/comps, runway/financing, reverse solve, decisions, responsive workspace, and finance unit tests.

**Intentionally deferred:** live market data and research, LLM providers, PDF/OCR extraction, robust CSV/JSON import UI, multi-currency FX curves, debt schedules and liquidation waterfalls beyond a simple 1× non-participating case, precedent transactions, formula authoring/cycle UI, multi-user collaboration, and a production database/migrations. Buttons that represent local intake scaffolding return an explicit saved/local response rather than pretending a provider ran.

A production extension should add SQLite migrations behind a persistence interface, formal runtime schemas for imports, formula AST/unit checking, browser E2E coverage, and encrypted local provider secrets—without moving calculations into an LLM.
