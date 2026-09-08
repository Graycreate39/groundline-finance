import crypto from 'node:crypto';
import {ProviderError} from './sec.mjs';

const WIKIPEDIA = 'https://en.wikipedia.org';

async function getJson(url, fetcher) {
  try {
    const response = await fetcher(url, {headers: {'User-Agent': 'Groundline local company research/0.2'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch {
    throw new ProviderError('NETWORK_UNAVAILABLE', 'Public web research could not be reached.', 'Check your connection or add evidence manually; no invented data was substituted.');
  }
}

export async function researchPrivateCompany(query, {fetcher = fetch, now = new Date(), website = ''} = {}) {
  const searchUrl = `${WIKIPEDIA}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`;
  const search = await getJson(searchUrl, fetcher);
  const match = search.query?.search?.[0];
  const retrievedAt = now.toISOString();
  const claims = [];
  let legalName = String(query).trim();
  let sourceUrl = website || '';
  let confidence = 0.55;

  if (match) {
    const summaryUrl = `${WIKIPEDIA}/api/rest_v1/page/summary/${encodeURIComponent(match.title)}`;
    const summary = await getJson(summaryUrl, fetcher);
    legalName = summary.title || match.title;
    sourceUrl = summary.content_urls?.desktop?.page || `${WIKIPEDIA}/wiki/${encodeURIComponent(match.title)}`;
    confidence = match.title.toLowerCase() === String(query).trim().toLowerCase() ? 0.9 : 0.7;
    if (summary.extract) claims.push({
      id: `web-${crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12)}`,
      companyId: legalName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), metricId: 'company-description',
      label: 'Company description', value: summary.extract, unit: 'text', currency: null,
      periodStart: null, periodEnd: null, form: null, filingDate: null, accession: null,
      sourceUrl, sourceTitle: `${legalName} — Wikipedia`, sourceType: 'Public reference',
      retrievedAt, location: 'Page summary', excerpt: summary.extract.slice(0, 240),
      confidence: 0.65, provenance: 'Externally sourced', usedInModel: false
    });
  }

  return {
    identity: {legalName, ticker: null, exchange: null, country: null, sector: 'Not yet established', confidence, sourceUrl},
    evidence: {provider: 'Public web', providerUrl: WIKIPEDIA, retrievedAt, claims},
    plan: [
      {id: 'identity', label: 'Resolve company identity', status: match ? 'complete' : 'blocked', reason: match ? null : 'No public reference matched the name.', nextAction: match ? null : 'Add the official website or enter identity evidence manually.'},
      {id: 'public', label: 'Collect public company evidence', status: claims.length ? 'complete' : 'blocked', reason: claims.length ? null : 'No public source was collected.'},
      {id: 'financials', label: 'Estimate unavailable company financials', status: 'ready', reason: 'Private companies do not publish standardized SEC company facts.', nextAction: 'Groundline will start with broad ranges and replace them as better evidence is added.'},
      {id: 'claims', label: 'Separate facts from estimates', status: 'ready'},
      {id: 'model', label: 'Generate range-based model', status: 'ready', reason: 'Low-confidence estimates remain visibly labeled and traceable.', nextAction: 'Add financial evidence to narrow the ranges.'}
    ]
  };
}
