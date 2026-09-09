import crypto from 'node:crypto';
import {ProviderError} from './sec.mjs';
import {collectPrivateCompanyResearch} from './web-search.mjs';

const WIKIPEDIA = 'https://en.wikipedia.org';
const LEGAL_SUFFIX = /\b(incorporated|corporation|company|limited|inc|corp|co|llc|ltd|plc)\b/g;

async function getJson(url, fetcher) {
  try {
    const response = await fetcher(url, {headers: {'User-Agent': 'Groundline local company research/0.3'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch {
    throw new ProviderError('NETWORK_UNAVAILABLE', 'Public web research could not be reached.', 'Check your connection or add evidence manually; no invented data was substituted.');
  }
}

function normalizedName(value) {
  return String(value || '').toLowerCase().replace(LEGAL_SUFFIX, '').replace(/[^a-z0-9]+/g, '');
}

function decodeHtml(value = '') {
  return String(value).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? decodeHtml(match[2].trim()) : '';
}

function metaContent(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if ([attribute(tag, 'name'), attribute(tag, 'property')].some(value => value.toLowerCase() === key.toLowerCase())) return attribute(tag, 'content');
  }
  return '';
}

function organizationName(html) {
  for (const block of html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []) {
    const raw = block.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data?.['@graph']) ? data['@graph'] : [data];
      const organization = nodes.find(node => String(node?.['@type'] || '').toLowerCase() === 'organization' && node.name);
      if (organization) return String(organization.name).trim();
    } catch {}
  }
  return '';
}

function pageTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].replace(/\s+/g, ' ').trim()).split(/\s+[|–—-]\s+/)[0] : '';
}

function validateWebsite(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new ProviderError('INVALID_WEBSITE', 'The official website is not a valid URL.', 'Enter the full address, such as https://farm.one/.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new ProviderError('INVALID_WEBSITE', 'The official website must use HTTP or HTTPS.', 'Enter the public company website.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || /^127\.|^10\.|^192\.168\.|^169\.254\./.test(host)) throw new ProviderError('INVALID_WEBSITE', 'The official website must be a public website.', 'Enter the company’s public website.');
  return url;
}

function inferIdentityDetails(text) {
  const value = String(text || '').toLowerCase();
  const location = /brooklyn|bergen street|prospect heights/.test(value) ? 'Brooklyn, New York, United States'
    : /new york|nyc/.test(value) ? 'New York, United States' : null;
  const country = /\b(united states|usa|u\.s\.|new york|nyc|brooklyn)\b/.test(value) ? 'United States' : null;
  const sector = /vertical farm|urban farm|neighborhood farm|micro\s?green|salad green|edible flower|hydroponic|brewery|taproom/.test(value) ? 'Indoor agriculture, food & hospitality'
    : /artificial intelligence|large language model|generative ai/.test(value) ? 'Artificial intelligence'
      : /software|platform|fintech|cloud|subscription/.test(value) ? 'Software and technology'
        : /restaurant|retail|consumer|food|apparel/.test(value) ? 'Consumer and commerce' : 'Not yet established';
  return {location, country, sector};
}

function identityClaim({legalName, description, sourceUrl, retrievedAt, sourceType, confidence, location}) {
  return {
    id: `web-${crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12)}`,
    companyId: legalName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), metricId: 'company-description',
    label: 'Company description', value: description, unit: 'text', currency: null,
    periodStart: null, periodEnd: null, form: null, filingDate: null, accession: null,
    sourceUrl, sourceTitle: `${legalName} — ${sourceType === 'Official website' ? 'official website' : 'Wikipedia'}`, sourceType,
    retrievedAt, location, excerpt: description.slice(0, 240), confidence,
    provenance: 'Externally sourced', usedInModel: false
  };
}

async function researchOfficialWebsite(query, website, context, fetcher, retrievedAt) {
  const requestedUrl = validateWebsite(website);
  let response;
  try {
    response = await fetcher(requestedUrl, {headers: {'User-Agent': 'Groundline local company research/0.3', Accept: 'text/html,application/xhtml+xml'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch {
    throw new ProviderError('WEBSITE_UNAVAILABLE', `Groundline could not verify ${requestedUrl.hostname}.`, 'Check the website address or add another distinguishing detail; no substitute company was selected.');
  }
  const html = (await response.text()).slice(0, 2_000_000);
  const legalName = organizationName(html) || metaContent(html, 'og:site_name') || metaContent(html, 'og:title') || pageTitle(html);
  const description = metaContent(html, 'description') || metaContent(html, 'og:description');
  const domainName = requestedUrl.hostname.replace(/^www\./, '').split('.')[0];
  const queryName = normalizedName(query);
  const matched = [legalName, domainName].some(value => {
    const candidate = normalizedName(value);
    return candidate && (candidate === queryName || candidate.includes(queryName) || queryName.includes(candidate));
  });
  if (!matched || !legalName || !description) {
    throw new ProviderError('IDENTITY_NOT_VERIFIED', `The supplied website did not provide enough matching evidence for “${query}”.`, 'Check the company name and website, then add a location or short description. Groundline did not select another company.');
  }
  const details = inferIdentityDetails(`${description} ${context}`);
  const claims = [identityClaim({legalName, description, sourceUrl: requestedUrl.href, retrievedAt, sourceType: 'Official website', confidence: 0.94, location: 'Official website metadata'})];
  if (String(context || '').trim()) claims.push({
    id: `context-${crypto.createHash('sha1').update(`${query}:${context}`).digest('hex').slice(0, 12)}`,
    companyId: legalName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), metricId: 'identity-context', label: 'Identity context',
    value: String(context).trim(), unit: 'text', currency: null, periodStart: null, periodEnd: null, form: null,
    filingDate: null, accession: null, sourceUrl: null, sourceTitle: 'User-provided identity context', sourceType: 'User-provided evidence',
    retrievedAt, location: 'Research form', excerpt: String(context).trim().slice(0, 240), confidence: 0.8,
    provenance: 'User-entered', usedInModel: false
  });
  return {identity: {legalName, ticker: null, exchange: null, country: details.country, location: details.location, sector: details.sector, confidence: 0.94, sourceUrl: requestedUrl.href}, claims};
}

async function researchExactWikipedia(query, context, fetcher, retrievedAt) {
  const searchText = [query, context].filter(Boolean).join(' ');
  const searchUrl = `${WIKIPEDIA}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchText)}&srlimit=5&format=json&origin=*`;
  const search = await getJson(searchUrl, fetcher);
  const queryName = normalizedName(query);
  const match = (search.query?.search || []).find(candidate => normalizedName(candidate.title) === queryName);
  if (!match) throw new ProviderError('IDENTITY_NOT_VERIFIED', `Groundline could not verify an exact public identity for “${query}”.`, 'Add the official website and a location or short description. No similarly named company was selected.');
  const summary = await getJson(`${WIKIPEDIA}/api/rest_v1/page/summary/${encodeURIComponent(match.title)}`, fetcher);
  if (!summary.extract) throw new ProviderError('IDENTITY_NOT_VERIFIED', `Groundline found a name match for “${query}” but no usable company evidence.`, 'Add the official website and distinguishing details.');
  const legalName = summary.title || match.title;
  const sourceUrl = summary.content_urls?.desktop?.page || `${WIKIPEDIA}/wiki/${encodeURIComponent(match.title)}`;
  const details = inferIdentityDetails(`${summary.extract} ${context}`);
  return {
    identity: {legalName, ticker: null, exchange: null, country: details.country, location: details.location, sector: details.sector, confidence: 0.82, sourceUrl},
    claims: [identityClaim({legalName, description: summary.extract, sourceUrl, retrievedAt, sourceType: 'Public reference', confidence: 0.72, location: 'Page summary'})]
  };
}

export async function researchPrivateCompany(query, {fetcher = fetch, now = new Date(), website = '', context = ''} = {}) {
  const retrievedAt = now.toISOString();
  const resolved = String(website || '').trim()
    ? await researchOfficialWebsite(query, website, context, fetcher, retrievedAt)
    : await researchExactWikipedia(query, context, fetcher, retrievedAt);
  const research = await collectPrivateCompanyResearch(resolved.identity, {fetcher, now, website, context, seedEvidence: resolved.claims});
  const claims = [...resolved.claims, ...research.claims];
  return {
    identity: resolved.identity,
    evidence: {provider: 'Multi-source public web research', providerUrl: resolved.identity.sourceUrl, retrievedAt, claims, searches: research.queries},
    plan: [
      {id: 'identity', label: 'Resolve company identity', status: 'complete', reason: `Matched ${resolved.identity.legalName} to ${resolved.identity.sourceUrl}.`},
      {id: 'public', label: 'Search public company evidence', status: research.sourceCount ? 'complete' : 'blocked', reason: research.sourceCount ? `Collected ${research.sourceCount} additional public sources.` : 'No additional relevant public sources were found.', nextAction: research.sourceCount ? null : 'Add an official website or enter company evidence manually.'},
      {id: 'financials', label: 'Collect funding, valuation, revenue, and scale evidence', status: research.financialClaimCount ? 'complete' : 'blocked', reason: research.financialClaimCount ? `Extracted ${research.financialClaimCount} traceable financial claims.` : 'The completed search did not find a usable financial claim.', nextAction: research.financialClaimCount ? 'Conflicting claims remain visible so recency and source quality can be inspected.' : 'Groundline will use a low-confidence sector estimate and identify the missing evidence.'},
      {id: 'claims', label: 'Separate facts from estimates', status: 'ready'},
      {id: 'model', label: 'Generate range-based model', status: 'ready', reason: 'Low-confidence estimates remain visibly labeled and traceable.', nextAction: 'Add financial evidence to narrow the ranges.'}
    ]
  };
}
