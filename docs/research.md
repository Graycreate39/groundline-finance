# Research architecture and claim methodology

## Provider contract

The SEC adapter first resolves a registrant through SEC submissions/company-ticker data, then requests XBRL company facts. It supplies a declared `SEC_USER_AGENT`, treats HTTP failures and rate limits as structured provider errors, and never falls back to fabricated data. A research plan records complete, ready, or blocked state for identity, filings, claims, market data, and model generation.

## Claim record

Every SEC claim retains a stable identifier, CIK, XBRL concept and human label, value, unit, currency, reporting period, filing type, accession, filing/publication date, retrieval timestamp, direct SEC filing URL, source title/type, supporting XBRL location, confidence, provenance, and active-model use. “Reported” is reserved for real company disclosure. Bundled fictional examples cannot receive that label.

## Coverage and gaps

Coverage counts provenance categories separately and exposes contradictions, staleness, and missing model inputs. SEC facts do not provide a current share price or market capitalization; without a configured market-data adapter, valuation is incomplete and says so. Private companies are expected to have fewer direct facts and must use uploaded statements or transparent triangulation based on funding announcements, pricing, headcount, customers, and public peers.

## Estimation

An estimate requires a named method, rationale, evidence IDs, low/base/high range, confidence, creation date, and alternatives considered. The initial forward-growth proposal is visibly model-estimated and requires confirmation. Estimated values never overwrite their source facts or become “Reported.”
