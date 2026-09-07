const finite = number => typeof number === 'number' && Number.isFinite(number);
const midpoint = (low, high) => (low + high) / 2;
const claimNamed = (claims, label) => claims.find(claim => claim.label.toLowerCase() === label.toLowerCase());

const outputFromClaim = (claim, id, label = claim.label) => ({
  id, label, value: claim.value, low: claim.value, high: claim.value, unit: claim.unit || 'USD',
  currency: claim.currency || (claim.unit === 'USD' ? 'USD' : null), formula: claim.location || claim.sourceType || 'Collected evidence',
  evidenceIds: [claim.id], provenance: claim.provenance, confidence: claim.confidence ?? 0.7
});

const estimate = ({id, label, low, high, unit = 'USD', formula, confidence, evidenceIds = []}) => ({
  id, label, value: midpoint(low, high), low, high, unit, currency: unit === 'USD' ? 'USD' : null,
  formula, evidenceIds, provenance: 'Model-estimated', confidence
});

function privateProfile(workspace) {
  const description = String((workspace.evidence?.claims || []).find(claim => claim.metricId === 'company-description')?.value || '').toLowerCase();
  if (/biotech|laborator|robot|hardware|manufactur|medical|device/.test(description)) {
    return {name: 'specialized hardware and life sciences', revenueLow: 20e6, revenueHigh: 150e6, marginLow: -0.25, marginHigh: 0.12, multipleLow: 2, multipleHigh: 6};
  }
  if (/software|platform|fintech|financial services|cloud|subscription|marketplace/.test(description)) {
    return {name: 'software and platform', revenueLow: 30e6, revenueHigh: 250e6, marginLow: -0.15, marginHigh: 0.2, multipleLow: 3, multipleHigh: 9};
  }
  if (/retail|restaurant|consumer|commerce|food|apparel/.test(description)) {
    return {name: 'consumer and commerce', revenueLow: 15e6, revenueHigh: 120e6, marginLow: -0.08, marginHigh: 0.12, multipleLow: 0.8, multipleHigh: 3};
  }
  return {name: 'private-company broad prior', revenueLow: 10e6, revenueHigh: 100e6, marginLow: -0.2, marginHigh: 0.15, multipleLow: 1.5, multipleHigh: 5};
}

function privateModel(workspace, claims) {
  const profile = privateProfile(workspace);
  const description = claims.find(claim => claim.metricId === 'company-description');
  const revenueClaim = claimNamed(claims, 'Revenue');
  const operatingClaim = claimNamed(claims, 'Operating income');
  const cashClaim = claimNamed(claims, 'Cash and cash equivalents') || claimNamed(claims, 'Cash');
  const valuationClaim = claimNamed(claims, 'Market capitalization') || claimNamed(claims, 'Equity value') || claimNamed(claims, 'Post-money valuation');
  const evidenceIds = description ? [description.id] : [];
  const revenue = revenueClaim
    ? outputFromClaim(revenueClaim, 'base-revenue', 'Current revenue')
    : estimate({id: 'base-revenue', label: 'Estimated current revenue', low: profile.revenueLow, high: profile.revenueHigh,
      formula: `${profile.name} prior; replace with company evidence when available`, confidence: 0.2, evidenceIds});
  const margin = operatingClaim && revenueClaim && finite(revenueClaim.value) && revenueClaim.value !== 0
    ? estimate({id: 'operating-margin', label: 'Operating margin', low: operatingClaim.value / revenueClaim.value,
      high: operatingClaim.value / revenueClaim.value, unit: 'percent', formula: 'Operating income ÷ revenue', confidence: 0.65,
      evidenceIds: [operatingClaim.id, revenueClaim.id]})
    : estimate({id: 'operating-margin', label: 'Estimated operating margin', low: profile.marginLow, high: profile.marginHigh,
      unit: 'percent', formula: `${profile.name} maturity range`, confidence: 0.18, evidenceIds});
  const cash = cashClaim
    ? outputFromClaim(cashClaim, 'cash', 'Cash')
    : estimate({id: 'cash', label: 'Estimated cash', low: revenue.low * 0.08, high: revenue.high * 0.35,
      formula: '8%–35% of estimated annual revenue', confidence: 0.15, evidenceIds: revenue.evidenceIds});
  const equityValue = valuationClaim
    ? outputFromClaim(valuationClaim, 'market-cap', 'Equity value')
    : estimate({id: 'market-cap', label: 'Estimated equity value', low: revenue.low * profile.multipleLow,
      high: revenue.high * profile.multipleHigh, formula: `${profile.multipleLow}×–${profile.multipleHigh}× estimated revenue; private-company illiquidity included`,
      confidence: 0.15, evidenceIds: revenue.evidenceIds});
  return {
    status: 'estimated', outputs: [revenue, margin, cash, equityValue],
    assumptions: [{id: 'private-prior', label: 'Private-company profile', value: profile.name, provenance: 'Model-estimated',
      confidence: 0.2, rationale: 'Broad sector prior derived from the public company description.', evidenceIds}],
    checks: [{id: 'finite', status: [revenue, margin, cash, equityValue].every(item => finite(item.value)) ? 'pass' : 'fail', message: 'All estimates must be finite.'}],
    gaps: [{metric: 'Estimate precision', material: false, reason: 'Private-company financials were not publicly verified, so Groundline used broad ranges.',
      nextAction: 'Add revenue, funding, cash, or operating results to replace each estimate and narrow valuation.'}]
  };
}

function publicModel(workspace, claims) {
  const revenue = claimNamed(claims, 'Revenue');
  const operatingIncome = claimNamed(claims, 'Operating income');
  const netIncome = claimNamed(claims, 'Net income');
  const cashClaim = claimNamed(claims, 'Cash and cash equivalents');
  const equityClaim = claimNamed(claims, 'Stockholders equity');
  const marketClaim = claimNamed(claims, 'Market capitalization');
  const outputs = [];
  if (revenue && finite(revenue.value)) outputs.push(outputFromClaim(revenue, 'base-revenue', 'Latest reported revenue'));
  if (operatingIncome && revenue && finite(operatingIncome.value) && finite(revenue.value) && revenue.value !== 0) {
    outputs.push(estimate({id: 'operating-margin', label: 'Latest operating margin', low: operatingIncome.value / revenue.value,
      high: operatingIncome.value / revenue.value, unit: 'percent', formula: 'Operating income ÷ revenue', confidence: 0.95,
      evidenceIds: [operatingIncome.id, revenue.id]}));
  } else if (revenue) {
    outputs.push(estimate({id: 'operating-margin', label: 'Estimated operating margin', low: 0.05, high: 0.25, unit: 'percent',
      formula: 'Broad profitable public-company prior', confidence: 0.2, evidenceIds: [revenue.id]}));
  }
  if (cashClaim) outputs.push(outputFromClaim(cashClaim, 'cash', 'Latest reported cash'));
  else if (revenue) outputs.push(estimate({id: 'cash', label: 'Estimated cash', low: revenue.value * 0.03, high: revenue.value * 0.2,
    formula: '3%–20% of latest revenue', confidence: 0.2, evidenceIds: [revenue.id]}));

  if (marketClaim) outputs.push(outputFromClaim(marketClaim, 'market-cap', 'Current market capitalization'));
  else if (netIncome && finite(netIncome.value) && netIncome.value > 0) {
    outputs.push(estimate({id: 'market-cap', label: 'Estimated market capitalization', low: netIncome.value * 14, high: netIncome.value * 28,
      formula: '14×–28× latest reported net income; price data unavailable', confidence: 0.38, evidenceIds: [netIncome.id]}));
  } else if (revenue && finite(revenue.value)) {
    outputs.push(estimate({id: 'market-cap', label: 'Estimated market capitalization', low: revenue.value, high: revenue.value * 6,
      formula: '1×–6× latest reported revenue; price and earnings data unavailable', confidence: 0.22, evidenceIds: [revenue.id]}));
  } else if (equityClaim) {
    outputs.push(estimate({id: 'market-cap', label: 'Estimated market capitalization', low: Math.max(0, equityClaim.value * 0.75), high: equityClaim.value * 3,
      formula: '0.75×–3× reported book equity; price, earnings, and revenue data unavailable', confidence: 0.15, evidenceIds: [equityClaim.id]}));
  }
  return {
    status: outputs.length ? 'estimated' : 'blocked', outputs,
    assumptions: [{id: 'valuation-multiple', label: 'Valuation multiple range', value: netIncome?.value > 0 ? '14×–28× net income' : '1×–6× revenue',
      provenance: 'Model-estimated', confidence: netIncome?.value > 0 ? 0.38 : 0.22, rationale: 'Broad market prior used because a current share price is unavailable.',
      evidenceIds: [netIncome?.id, revenue?.id].filter(Boolean)}],
    checks: [{id: 'finite', status: outputs.every(item => finite(item.value)) ? 'pass' : 'fail', message: 'All generated numerical outputs must be finite.'}],
    gaps: [{metric: 'Live market price', material: false, reason: 'Market capitalization is estimated from reported fundamentals because live price data is unavailable.',
      nextAction: 'Connecting market data will replace this range with shares outstanding × current price.'}]
  };
}

export function generateInitialModel(workspace) {
  const claims = workspace.evidence?.claims || [];
  return workspace.identity?.cik ? publicModel(workspace, claims) : privateModel(workspace, claims);
}

export function safeNumber(value, {min = -Infinity, max = Infinity, label = 'Value'} = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return {ok: false, error: `${label} must be a finite number.`};
  if (number < min || number > max) return {ok: false, error: `${label} must be between ${min} and ${max}.`};
  return {ok: true, value: number};
}
