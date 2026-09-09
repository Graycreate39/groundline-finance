import crypto from 'node:crypto';

const SEARCH = 'https://html.duckduckgo.com/html/';
const MONTHS = {january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12};
const SCALE = {trillion: 1e12, t: 1e12, billion: 1e9, b: 1e9, million: 1e6, m: 1e6};

function decodeHtml(value = '') {
  return String(value).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ');
}

const plainText = value => decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const companyKey = value => String(value || '').toLowerCase().replace(/\b(incorporated|corporation|company|limited|inc|corp|co|llc|ltd|plc|pbc)\b/g, '').replace(/[^a-z0-9]+/g, '');

function resultUrl(href) {
  try {
    const url = new URL(decodeHtml(href), SEARCH);
    return url.searchParams.get('uddg') || url.href;
  } catch { return ''; }
}

export function parseSearchResults(html) {
  const links = [...String(html).matchAll(/<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const snippets = [...String(html).matchAll(/<a\b[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)];
  return links.map((match, index) => ({
    url: resultUrl(match[1]),
    title: plainText(match[2]),
    snippet: plainText(snippets[index]?.[1] || '')
  })).filter(result => result.url && result.title);
}

function sourceProfile(url, officialDomain, company) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch {}
  const firstHostLabel = host.split('.')[0] || '';
  const matchesKnownDomain = officialDomain && (host === officialDomain || host.endsWith(`.${officialDomain}`));
  const matchesCompanyName = companyKey(firstHostLabel) === companyKey(company);
  if (matchesKnownDomain || matchesCompanyName) return {host, type: 'Company announcement', confidence: 0.97};
  if (host.endsWith('sec.gov')) return {host, type: 'Regulatory filing', confidence: 0.95};
  if (['reuters.com', 'apnews.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'cnbc.com', 'axios.com'].some(domain => host.endsWith(domain))) {
    return {host, type: 'Major financial press', confidence: 0.86};
  }
  if (['crunchbase.com', 'pitchbook.com', 'sacra.com', 'stockanalysis.com', 'cbinsights.com'].some(domain => host.endsWith(domain))) {
    return {host, type: 'Company data provider', confidence: 0.72};
  }
  return {host, type: 'Public web result', confidence: 0.56};
}

function publicationDate(text) {
  const numeric = String(text).match(/\b(20\d{2})[\/_-](0?[1-9]|1[0-2])[\/_-](0?[1-9]|[12]\d|3[01])\b/);
  if (numeric) return `${numeric[1]}-${String(numeric[2]).padStart(2, '0')}-${String(numeric[3]).padStart(2, '0')}`;
  const full = String(text).match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i);
  if (full) return `${full[3]}-${String(MONTHS[full[1].toLowerCase()]).padStart(2, '0')}-${String(full[2]).padStart(2, '0')}`;
  const monthYear = String(text).match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
  if (monthYear) return `${monthYear[2]}-${String(MONTHS[monthYear[1].toLowerCase()]).padStart(2, '0')}-01`;
  const year = String(text).match(/\b(20\d{2})\b/);
  return year ? `${year[1]}-01-01` : null;
}

function nearestMetric(text, amountStart, amountEnd) {
  const before = text.slice(Math.max(0, amountStart - 55), amountStart).toLowerCase();
  const after = text.slice(amountEnd, amountEnd + 65).toLowerCase();
  if (/^\s*(?:post-money(?:\s+valuation)?|valuation)\b/.test(after) || /(?:valued\s+at|valuing.{0,30}\s+at|valuation(?:\s+of|\s+at)?|worth)\s*$/.test(before)) {
    return {label: 'Post-money valuation', metricId: 'post-money-valuation', distance: 0};
  }
  if (/^\s*(?:in\s+)?(?:[a-z0-9.-]+\s+){0,4}(?:series\s+[a-z]\s+)?(?:funding|financing|investment)\b/.test(after)
    || /(?:raised|raises)\D*$/.test(before)) {
    return {label: 'Funding raised', metricId: 'funding-raised', distance: 0};
  }
  if (/^\s*(?:[a-z0-9.-]+\s+){0,3}(?:arr|annual recurring revenue|annualized revenue|revenue|run-rate revenue)\b/.test(after)
    || /(?:revenue|annualized|run-rate|\barr)\D*$/.test(before)) {
    return {label: 'Revenue', metricId: 'revenue', distance: 0};
  }
  const candidates = [
    {label: 'Post-money valuation', metricId: 'post-money-valuation', words: /valuation|valued|post-money|worth/gi},
    {label: 'Revenue', metricId: 'revenue', words: /revenue|annual recurring revenue|annualized|run-rate|\barr\b/gi},
    {label: 'Funding raised', metricId: 'funding-raised', words: /funding|raised|raises|investment|financing|series\s+[a-z]/gi},
    {label: 'Customers', metricId: 'customers', words: /customers|clients|accounts/gi},
    {label: 'Employees', metricId: 'employees', words: /employees|headcount|staff/gi}
  ];
  let best = null;
  for (const candidate of candidates) {
    for (const match of text.matchAll(candidate.words)) {
      const distance = Math.abs(match.index - amountStart);
      if (distance <= 90 && (!best || distance < best.distance)) best = {...candidate, distance};
    }
  }
  return best;
}

function amountClaims(result, company, retrievedAt, source) {
  const text = `${result.title}. ${result.snippet}`;
  const claims = [];
  const seen = new Set();
  for (const match of text.matchAll(/\$\s*([\d,.]+)\s*(trillion|billion|million|[tbm])\b/gi)) {
    const nearby = text.slice(Math.max(0, match.index - 90), match.index + match[0].length + 90);
    const sentenceStart = Math.max(text.lastIndexOf('. ', match.index), text.lastIndexOf('! ', match.index), text.lastIndexOf('? ', match.index));
    const subjectText = text.slice(sentenceStart + 1, match.index);
    const targetToken = String(company).toLowerCase().match(/[a-z0-9]{3,}/)?.[0] || '';
    const targetSubjectIndex = subjectText.toLowerCase().lastIndexOf(targetToken);
    const otherSubjectIndex = Math.max(...[...subjectText.matchAll(/\b(OpenAI|Google|Microsoft|Amazon|Meta|Apple|SpaceX|Nvidia|Tesla)\b/gi)]
      .filter(item => companyKey(item[0]) !== companyKey(company)).map(item => item.index), -1);
    if (otherSubjectIndex > targetSubjectIndex) continue;
    const targetPositions = [...nearby.toLowerCase().matchAll(new RegExp(companyKey(company), 'g'))].map(item => item.index);
    const localAmount = Math.min(90, match.index);
    const directionalDistance = index => index <= localAmount ? localAmount - index : index - localAmount + 50;
    const targetDistance = Math.min(...targetPositions.map(directionalDistance), Infinity);
    const otherDistance = Math.min(...[...nearby.matchAll(/\b(OpenAI|Google|Microsoft|Amazon|Meta|Apple|SpaceX|Nvidia|Tesla)\b/gi)]
      .filter(item => companyKey(item[0]) !== companyKey(company)).map(item => directionalDistance(item.index)), Infinity);
    if (otherDistance < targetDistance) continue;
    let metric = nearestMetric(text, match.index, match.index + match[0].length);
    if (!metric) continue;
    if (metric.label === 'Revenue' && /annualized|run[- ]rate|\barr\b/i.test(nearby)) {
      metric = {label: 'Annualized revenue run rate', metricId: 'annualized-revenue-run-rate'};
    }
    const value = Number(match[1].replaceAll(',', '')) * SCALE[match[2].toLowerCase()];
    if (!Number.isFinite(value) || value <= 0) continue;
    const key = `${metric.metricId}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claims.push({
      id: `search-${crypto.createHash('sha1').update(`${result.url}:${key}`).digest('hex').slice(0, 14)}`,
      companyId: companyKey(company), metricId: metric.metricId, label: metric.label, value, unit: 'USD', currency: 'USD',
      periodStart: null, periodEnd: publicationDate(`${result.url} ${text}`), form: null, filingDate: null, accession: null,
      sourceUrl: result.url, sourceTitle: result.title, sourceType: source.type, retrievedAt,
      location: 'Search result title and excerpt', excerpt: result.snippet || result.title,
      confidence: Math.max(0.45, source.confidence - 0.08), provenance: 'Externally sourced', usedInModel: ['Revenue', 'Post-money valuation'].includes(metric.label)
    });
  }
  const valuationValues = new Set(claims.filter(claim => claim.metricId === 'post-money-valuation').map(claim => claim.value));
  return claims.filter(claim => claim.metricId !== 'funding-raised' || !valuationValues.has(claim.value));
}

function findingClaim(result, company, retrievedAt, source) {
  return {
    id: `finding-${crypto.createHash('sha1').update(result.url).digest('hex').slice(0, 14)}`,
    companyId: companyKey(company), metricId: 'research-finding', label: 'Research finding',
    value: result.snippet || result.title, unit: 'text', currency: null, periodStart: null,
    periodEnd: publicationDate(`${result.url} ${result.title} ${result.snippet}`), form: null, filingDate: null, accession: null,
    sourceUrl: result.url, sourceTitle: result.title, sourceType: source.type, retrievedAt,
    location: 'Search result excerpt', excerpt: result.snippet || result.title,
    confidence: source.confidence, provenance: 'Externally sourced', usedInModel: false
  };
}

async function search(query, fetcher) {
  try {
    const url = `${SEARCH}?q=${encodeURIComponent(query)}`;
    const response = await fetcher(url, {headers: {'User-Agent': 'Mozilla/5.0 Groundline research/0.3', Accept: 'text/html'}});
    if (!response.ok || typeof response.text !== 'function') return [];
    return parseSearchResults(await response.text());
  } catch { return []; }
}

export async function collectPrivateCompanyResearch(identity, {fetcher = fetch, now = new Date(), website = '', context = ''} = {}) {
  const name = identity.legalName;
  let officialDomain = '';
  try { officialDomain = new URL(website || identity.sourceUrl || '').hostname.replace(/^www\./, ''); } catch {}
  if (officialDomain.endsWith('wikipedia.org')) officialDomain = '';
  const queries = [
    `"${name}" funding valuation revenue`,
    `"${name}" latest annualized revenue run rate 2026`,
    `"${name}" customers employees market share`,
    `"${name}" latest funding round valuation`,
    officialDomain ? `site:${officialDomain} funding valuation revenue` : ''
  ].filter(Boolean);
  const batches = await Promise.all(queries.map(query => search(query, fetcher)));
  const key = companyKey(name);
  const seen = new Set();
  const results = batches.flat().filter(result => {
    const relevant = companyKey(`${result.title} ${result.snippet}`).includes(key);
    if (!relevant || seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  }).map((result, index) => ({...result, index, source: sourceProfile(result.url, officialDomain, name)}))
    .sort((a, b) => b.source.confidence - a.source.confidence || a.index - b.index)
    .slice(0, 12);
  const retrievedAt = now.toISOString();
  const claims = results.flatMap(result => [
    findingClaim(result, name, retrievedAt, result.source),
    ...amountClaims(result, name, retrievedAt, result.source)
  ]);
  return {
    claims,
    queries,
    sourceCount: results.length,
    financialClaimCount: claims.filter(claim => claim.unit === 'USD').length
  };
}
