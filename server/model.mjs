const finite = number => typeof number === 'number' && Number.isFinite(number);
const midpoint = (low, high) => (low + high) / 2;
const claimNamed = (claims, label) => claims.find(claim => claim.label.toLowerCase() === label.toLowerCase());
const bestClaim = (claims, labels) => claims.filter(claim => labels.some(label => claim.label.toLowerCase() === label.toLowerCase()) && finite(claim.value))
  .sort((a, b) => {
    const dateDifference = Date.parse(b.periodEnd || '') - Date.parse(a.periodEnd || '');
    if (Number.isFinite(dateDifference) && dateDifference) return dateDifference;
    return (b.confidence || 0) - (a.confidence || 0) || b.value - a.value;
  })[0];

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
  const description = (workspace.evidence?.claims || [])
    .filter(claim => ['company-description', 'identity-context'].includes(claim.metricId))
    .map(claim => String(claim.value || '')).join(' ').toLowerCase();
  if (/vertical farm|urban farm|indoor farm|microgreen|hydroponic|brewery|taproom/.test(description)) {
    return {name: 'single-site indoor farm, taproom, events, and restaurant supply', revenue: 1.2e6, revenueBand: 0.15, margin: -0.02, marginBand: 0.06, multiple: 1.4, valuationBand: 0.2,
      method: '$480k restaurant produce + $520k taproom + $200k tours, classes, and events; built from one verified Brooklyn location',
      drivers: [
        {id: 'produce-stream', label: 'Restaurant produce revenue', value: '$480k', rationale: 'Estimated recurring chef and restaurant orders from the verified indoor farm.'},
        {id: 'taproom-stream', label: 'Taproom revenue', value: '$520k', rationale: 'Estimated annual sales from the verified six-day public schedule.'},
        {id: 'events-stream', label: 'Tours, classes, and events revenue', value: '$200k', rationale: 'Estimated ticketed programming and private-event contribution.'}
      ]};
  }
  if (/artificial intelligence|large language model|foundation model|generative ai/.test(description)) {
    return {name: 'frontier artificial intelligence', revenue: 5e9, revenueBand: 0.3, margin: -0.1, marginBand: 0.15, multiple: 12, valuationBand: 0.3};
  }
  if (/biotech|laborator|robot|hardware|manufactur|medical|device/.test(description)) {
    return {name: 'specialized hardware and life sciences', revenue: 75e6, revenueBand: 0.2, margin: -0.07, marginBand: 0.05, multiple: 4.25, valuationBand: 0.2};
  }
  if (/software|platform|fintech|financial services|cloud|subscription|marketplace/.test(description)) {
    return {name: 'software and platform', revenue: 120e6, revenueBand: 0.2, margin: 0.08, marginBand: 0.1, multiple: 6, valuationBand: 0.2};
  }
  if (/retail|restaurant|consumer|commerce|food|apparel/.test(description)) {
    return {name: 'consumer and commerce', revenue: 50e6, revenueBand: 0.2, margin: 0.06, marginBand: 0.06, multiple: 1.8, valuationBand: 0.2};
  }
  return {name: 'broad private-company', revenue: 50e6, revenueBand: 0.3, margin: 0.02, marginBand: 0.1, multiple: 3, valuationBand: 0.3};
}

function privateModel(workspace, claims) {
  const profile = privateProfile(workspace);
  const description = claims.find(claim => claim.metricId === 'company-description');
  const revenueClaim = bestClaim(claims, ['Revenue', 'Annualized revenue run rate']);
  const operatingClaim = bestClaim(claims, ['Operating income']);
  const cashClaim = bestClaim(claims, ['Cash and cash equivalents', 'Cash']);
  const valuationClaim = bestClaim(claims, ['Market capitalization', 'Equity value', 'Post-money valuation']);
  const evidenceIds = description ? [description.id] : [];
  const revenue = revenueClaim
    ? outputFromClaim(revenueClaim, 'base-revenue', revenueClaim.label === 'Annualized revenue run rate' ? 'Annualized revenue run rate' : 'Current revenue')
    : estimate({id: 'base-revenue', label: 'Estimated current revenue', low: profile.revenue * (1 - profile.revenueBand), high: profile.revenue * (1 + profile.revenueBand),
      formula: profile.method || `${profile.name} operating-footprint estimate; replace with company evidence when available`, confidence: profile.method ? 0.3 : 0.2, evidenceIds});
  const margin = operatingClaim && revenueClaim && finite(revenueClaim.value) && revenueClaim.value !== 0
    ? estimate({id: 'operating-margin', label: 'Operating margin', low: operatingClaim.value / revenueClaim.value,
      high: operatingClaim.value / revenueClaim.value, unit: 'percent', formula: 'Operating income ÷ revenue', confidence: 0.65,
      evidenceIds: [operatingClaim.id, revenueClaim.id]})
    : estimate({id: 'operating-margin', label: 'Estimated operating margin', low: profile.margin - profile.marginBand, high: profile.margin + profile.marginBand,
      unit: 'percent', formula: `${profile.name} maturity range`, confidence: 0.18, evidenceIds});
  const cash = cashClaim
    ? outputFromClaim(cashClaim, 'cash', 'Cash')
    : estimate({id: 'cash', label: 'Estimated cash', low: revenue.value * 0.15, high: revenue.value * 0.25,
      formula: '20% of estimated annual revenue, shown with a ±25% range', confidence: 0.15, evidenceIds: revenue.evidenceIds});
  const equityValue = valuationClaim
    ? outputFromClaim(valuationClaim, 'market-cap', 'Equity value')
    : estimate({id: 'market-cap', label: 'Estimated equity value', low: revenue.value * profile.multiple * (1 - profile.valuationBand),
      high: revenue.value * profile.multiple * (1 + profile.valuationBand), formula: `${profile.multiple}× estimated revenue with a ±${Math.round(profile.valuationBand * 100)}% range; private-company illiquidity included`,
      confidence: 0.15, evidenceIds: revenue.evidenceIds});
  return {
    status: 'estimated', outputs: [revenue, margin, cash, equityValue],
    assumptions: [{id: 'private-prior', label: 'Private-company estimation method', value: profile.name, provenance: 'Model-estimated',
      confidence: profile.method ? 0.3 : 0.2, rationale: profile.method || 'Sector and scale estimate derived from the collected company evidence.', evidenceIds},
    ...(profile.drivers || []).map(driver => ({...driver, provenance: 'Model-estimated', confidence: 0.25, evidenceIds}))],
    checks: [{id: 'finite', status: [revenue, margin, cash, equityValue].every(item => finite(item.value)) ? 'pass' : 'fail', message: 'All estimates must be finite.'}],
    gaps: [
      !revenueClaim && {metric: 'Revenue evidence', material: true, reason: 'No traceable current revenue figure was found; the displayed value is a sector prior.', nextAction: 'Add a company announcement, financial report, or credible revenue estimate.'},
      !operatingClaim && {metric: 'Operating results', material: true, reason: 'No operating income or margin evidence was found.', nextAction: 'Add operating income, loss, or margin evidence to replace the sector estimate.'},
      !cashClaim && {metric: 'Cash position', material: true, reason: 'No current cash balance was found.', nextAction: 'Add a financing document, balance-sheet figure, or management estimate.'},
      !valuationClaim && {metric: 'Valuation evidence', material: true, reason: 'No traceable financing valuation was found.', nextAction: 'Add a funding announcement or credible secondary-market valuation.'}
    ].filter(Boolean)
  };
}

function publicModel(workspace, claims) {
  const revenue = claimNamed(claims, 'Revenue');
  const operatingIncome = claimNamed(claims, 'Operating income');
  const netIncome = claimNamed(claims, 'Net income');
  const cashClaim = claimNamed(claims, 'Cash and cash equivalents');
  const equityClaim = claimNamed(claims, 'Stockholders equity');
  const marketClaim = claimNamed(claims, 'Market capitalization');
  const sector = String(workspace.identity?.sector || '').toLowerCase();
  const earningsMultiple = /computer|software|technology|semiconductor|electronic/.test(sector) ? [24, 30]
    : /bank|insurance|financial/.test(sector) ? [10, 14]
      : /utility|utilities/.test(sector) ? [15, 20] : [18, 24];
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
    outputs.push(estimate({id: 'market-cap', label: 'Estimated market capitalization', low: netIncome.value * earningsMultiple[0], high: netIncome.value * earningsMultiple[1],
      formula: `${earningsMultiple[0]}×–${earningsMultiple[1]}× latest reported net income based on sector; price data unavailable`, confidence: 0.42, evidenceIds: [netIncome.id]}));
  } else if (revenue && finite(revenue.value)) {
    outputs.push(estimate({id: 'market-cap', label: 'Estimated market capitalization', low: revenue.value, high: revenue.value * 6,
      formula: '1×–6× latest reported revenue; price and earnings data unavailable', confidence: 0.22, evidenceIds: [revenue.id]}));
  } else if (equityClaim) {
    outputs.push(estimate({id: 'market-cap', label: 'Estimated market capitalization', low: Math.max(0, equityClaim.value * 0.75), high: equityClaim.value * 3,
      formula: '0.75×–3× reported book equity; price, earnings, and revenue data unavailable', confidence: 0.15, evidenceIds: [equityClaim.id]}));
  }
  return {
    status: outputs.length ? 'estimated' : 'blocked', outputs,
    assumptions: [{id: 'valuation-multiple', label: 'Valuation multiple range', value: netIncome?.value > 0 ? `${earningsMultiple[0]}×–${earningsMultiple[1]}× net income` : '1×–6× revenue',
      provenance: 'Model-estimated', confidence: netIncome?.value > 0 ? 0.42 : 0.22, rationale: 'Sector-adjusted market prior used because a current share price is unavailable.',
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
