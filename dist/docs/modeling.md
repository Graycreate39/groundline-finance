# Financial modeling methodology

## DCF
Revenue is prior-year revenue multiplied by one plus growth. EBITDA uses year-specific margins. EBIT subtracts D&A; taxes apply only to positive EBIT. Unlevered FCF is `EBIT − cash tax + D&A − capex − ΔNWC`. Annual cash flows are discounted at `1 / (1 + WACC)^t`. Terminal value uses Gordon Growth: `UFCF_n × (1 + g) / (WACC − g)`. Enterprise value is explicit-period PV plus terminal PV; net cash bridges to equity value. The engine checks that bridge and rejects interpretation when WACC does not exceed terminal growth.

## Comparable companies
Peers carry a synthetic snapshot date, rationale, operating metrics, multiple, provenance, and inclusion status. The selected median revenue multiple multiplies current model revenue; exclusions recalculate immediately. Demo peers are fictional and not investment data.

## Startup runway and hiring
Monthly revenue compounds at the selected growth rate. Burn equals payroll plus operating expense minus revenue; ending cash equals beginning cash minus burn. Runway is the last non-negative month. Hiring scenarios specify start date, salary, benefits/payroll load, and one-time recruiting cost. The visible bundled prompt uses 20 engineers, $185k salary, 28% load, and $12k recruiting cost.

## Cap table and dilution
New investor ownership is investment divided by post-money value. An option-pool top-up is allocated on the post-financing fully diluted basis; remaining ownership is distributed pro rata across pre-round holders. Ownership must reconcile to 100%. Exit MOIC is proceeds/investment and annual IRR is `(proceeds / investment)^(1 / years) − 1`. The displayed 1× non-participating preference is simplified; no seniority stack or participating waterfall is implemented.

## Precision, units, checks
Calculations retain full floating-point precision; dollars/rates are rounded only for display (typically one decimal and one percentage point decimal). Implemented checks cover EV/equity reconciliation, ownership total, WACC/terminal-growth validity, deterministic period lengths, and terminal-value concentration. The product flags rather than hides weak or stale evidence.
