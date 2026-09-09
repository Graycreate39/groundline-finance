import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {researchPrivateCompany} from '../server/providers/public-web.mjs';
import {parseSearchResults} from '../server/providers/web-search.mjs';
import {LocalStore} from '../server/store.mjs';
import {generateInitialModel} from '../server/model.mjs';

test('private-company research keeps public evidence distinct from financial facts', async () => {
  const fetcher = async url => ({
    ok: true,
    json: async () => String(url).includes('page/summary')
      ? {title: 'Stripe, Inc.', extract: 'Stripe is an Irish-American financial services company.', content_urls: {desktop: {page: 'https://en.wikipedia.org/wiki/Stripe,_Inc.'}}}
      : {query: {search: [{title: 'Stripe, Inc.'}]}}
  });
  const result = await researchPrivateCompany('Stripe', {fetcher, now: new Date('2026-09-07T12:00:00Z')});
  assert.equal(result.identity.legalName, 'Stripe, Inc.');
  assert.equal(result.evidence.claims[0].provenance, 'Externally sourced');
  assert(result.plan.some(item => item.id === 'financials' && item.status === 'blocked'));
  assert(!result.evidence.claims.some(claim => claim.label.toLowerCase().includes('revenue')));
  const model = generateInitialModel(result);
  assert.equal(model.status, 'estimated');
  assert(model.outputs.some(output => output.id === 'market-cap' && output.low > 0 && output.high > output.low));
  assert(model.outputs.every(output => output.provenance === 'Model-estimated'));
});

test('official website and distinguishing context prevent a similarly named company match', async () => {
  const html = `<!doctype html><html><head>
    <meta property="og:site_name" content="Farm.One">
    <meta name="description" content="The neighborhood vertical farm at 625 Bergen Street in Brooklyn, NYC, with a brewery and taproom.">
    <title>Farm.One</title>
  </head></html>`;
  const calls = [];
  const fetcher = async url => {
    calls.push(String(url));
    return {ok: true, text: async () => html};
  };
  const result = await researchPrivateCompany('farm.one', {
    website: 'https://farm.one/',
    context: 'Brooklyn, NY · vertical farm and taproom',
    fetcher,
    now: new Date('2026-09-08T12:00:00Z')
  });
  assert.equal(result.identity.legalName, 'Farm.One');
  assert.equal(result.identity.location, 'Brooklyn, New York, United States');
  assert.equal(result.identity.sector, 'Indoor agriculture, food & hospitality');
  assert.equal(result.identity.sourceUrl, 'https://farm.one/');
  assert.equal(result.evidence.claims[0].sourceType, 'Official website');
  assert(result.evidence.claims.some(claim => claim.provenance === 'User-entered'));
  assert.equal(calls[0], 'https://farm.one/');
  assert(calls.slice(1).some(url => url === 'https://farm.one/'));
  assert(calls.slice(1).some(url => url.startsWith('https://html.duckduckgo.com/html/')));
  const model = generateInitialModel(result);
  assert.equal(model.assumptions[0].value, 'single-site indoor farm, taproom, events, and restaurant supply');
  assert.equal(model.outputs.find(output => output.id === 'base-revenue').value, 1_200_000);
  assert.equal(model.assumptions.length, 4);
  assert(model.outputs.find(output => output.id === 'base-revenue').formula.includes('$480k restaurant produce'));
});

test('official-site pages add company-specific evidence when search results are empty', async () => {
  const home = `<html><head><meta property="og:site_name" content="Signal Forge"><meta name="description" content="Signal Forge builds inspection sensors in Pittsburgh."></head><body>
    <a href="/about">About</a><a href="/products">Products</a><a href="https://outside.example/news">Outside</a>
  </body></html>`;
  const pages = {
    'https://signalforge.example/about': '<html><title>About Signal Forge</title><h1>Built in Pittsburgh</h1><p>Our 42-person team designs industrial sensors for steel mills and rail operators.</p></html>',
    'https://signalforge.example/products': '<html><title>Products</title><h1>Inspection systems</h1><p>Two installed product lines monitor high-temperature equipment for industrial customers.</p></html>'
  };
  const fetcher = async url => {
    const value = String(url);
    if (value.startsWith('https://html.duckduckgo.com')) return {ok: true, text: async () => '<html></html>'};
    return {ok: true, text: async () => pages[value] || home};
  };
  const result = await researchPrivateCompany('Signal Forge', {website: 'https://signalforge.example/', fetcher, now: new Date('2026-09-09T12:00:00Z')});
  const findings = result.evidence.claims.filter(claim => claim.metricId === 'research-finding');
  assert.equal(findings.length, 2);
  assert(findings.some(claim => claim.excerpt.includes('42-person team')));
  assert(findings.every(claim => claim.sourceType === 'Company announcement'));
  assert(result.evidence.claims.some(claim => claim.metricId === 'employees' && claim.value === 42 && claim.usedInModel));
  assert(result.plan.some(item => item.id === 'public' && item.status === 'complete'));
  const model = generateInitialModel(result);
  const revenue = model.outputs.find(output => output.id === 'base-revenue');
  assert.equal(revenue.value, 42 * 260_000);
  assert(revenue.formula.includes('42 employees'));
  assert.notEqual(revenue.value, 50_000_000);
});

test('multi-source search collects current private-company valuation and revenue evidence', async () => {
  const searchHtml = `<html><body>
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.anthropic.com%2Fnews%2Fseries-h">Anthropic raises $65 billion in Series H funding at $965 billion post-money valuation</a>
    <a class="result__snippet">On May 28, 2026, Anthropic announced its latest financing and annualized revenue of $47 billion.</a>
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.axios.com%2F2026%2F08%2F17%2Fanthropic-revenue">Anthropic revenue run rate exceeds $65 billion</a>
    <a class="result__snippet">On August 17, 2026, Anthropic's annualized revenue run rate surpassed $65 billion.</a>
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.cnbc.com%2F2026%2F02%2F12%2Fanthropic-funding">Anthropic closes $30 billion funding round</a>
    <a class="result__snippet">After OpenAI raised over $40 billion, Anthropic followed with a $30 billion raise.</a>
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fanthropic-series-g">Anthropic Raises $30Bn, Hits $380Bn Valuation as Claude Revenue Reaches $14Bn Run Rate</a>
    <a class="result__snippet">Anthropic raises $30 billion in Series G funding at a $380 billion valuation as Claude reaches a $14 billion revenue run rate.</a>
  </body></html>`;
  assert.equal(parseSearchResults(searchHtml).length, 4);
  const fetcher = async url => {
    const value = String(url);
    if (value.includes('w/api.php')) return {ok: true, json: async () => ({query: {search: [{title: 'Anthropic'}]}})};
    if (value.includes('page/summary')) return {ok: true, json: async () => ({
      title: 'Anthropic',
      extract: 'Anthropic is an American artificial intelligence company headquartered in San Francisco.',
      content_urls: {desktop: {page: 'https://en.wikipedia.org/wiki/Anthropic'}}
    })};
    return {ok: true, text: async () => searchHtml};
  };
  const result = await researchPrivateCompany('Anthropic', {fetcher, now: new Date('2026-09-08T12:00:00Z')});
  assert.equal(result.evidence.claims.filter(claim => claim.metricId === 'research-finding').length, 4);
  assert(result.evidence.claims.some(claim => claim.label === 'Post-money valuation' && claim.value === 965e9));
  assert(result.evidence.claims.some(claim => claim.label === 'Annualized revenue run rate' && claim.value === 65e9));
  assert(!result.evidence.claims.some(claim => claim.label === 'Funding raised' && claim.value === 40e9));
  assert(!result.evidence.claims.some(claim => claim.label.includes('Revenue') && claim.value === 30e9));
  assert(result.evidence.claims.some(claim => claim.label === 'Annualized revenue run rate' && claim.value === 14e9));
  const model = generateInitialModel(result);
  const revenueOutput = model.outputs.find(output => output.id === 'base-revenue');
  assert.equal(revenueOutput.value, 65e9);
  assert(revenueOutput.low < revenueOutput.value && revenueOutput.high > revenueOutput.value);
  assert.equal(model.outputs.find(output => output.id === 'market-cap').value, 965e9);
  assert.equal(model.assumptions.length, 1);
  assert(model.assumptions[0].rationale.includes('Company-specific revenue'));
});

test('monthly private-company revenue is annualized and preferred over a sector bucket', async () => {
  const searchHtml = `<html><body>
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbrooklyn.news12.com%2Ffarm-one">Farm One grows hundreds of plants for restaurants across Brooklyn</a>
    <a class="result__snippet">Farm One has transformed a warehouse into a thriving business generating $100,000 in monthly revenue.</a>
    <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fweek-in-agtech">ClimateAI raises $22 million, Farm.One reopens</a>
    <a class="result__snippet">ClimateAI landed $22 million in funding while Farm.One secured an undisclosed investment and reopened its Brooklyn farm.</a>
  </body></html>`;
  const websiteHtml = `<html><head><meta property="og:site_name" content="Farm.One"><meta name="description" content="The neighborhood farm at 625 Bergen Street in Brooklyn. We grow microgreens for chefs and operate a brewery and taproom."></head></html>`;
  const fetcher = async url => String(url).startsWith('https://farm.one')
    ? {ok: true, text: async () => websiteHtml}
    : {ok: true, text: async () => searchHtml};
  const result = await researchPrivateCompany('Farm.One', {website: 'https://farm.one/', fetcher, now: new Date('2026-09-08T12:00:00Z')});
  const revenue = result.evidence.claims.find(claim => claim.metricId === 'annualized-revenue-run-rate');
  assert.equal(revenue.value, 1_200_000);
  assert.equal(revenue.location, 'Monthly revenue × 12');
  assert(!result.evidence.claims.some(claim => claim.metricId === 'funding-raised' && claim.value === 22_000_000));
  const model = generateInitialModel(result);
  const revenueOutput = model.outputs.find(output => output.id === 'base-revenue');
  assert.equal(revenueOutput.value, 1_200_000);
  assert(revenueOutput.low < revenueOutput.value && revenueOutput.high > revenueOutput.value);
  const equity = model.outputs.find(output => output.id === 'market-cap');
  assert.equal(equity.value, revenueOutput.value * 1.4);
  assert(equity.low < revenueOutput.low * 1.4 && equity.high > revenueOutput.high * 1.4);
  assert.equal(model.outputs.find(output => output.id === 'cash').value, revenueOutput.value * 0.2);
  assert.equal(model.assumptions.length, 1);
  assert.equal(model.outputs.find(output => output.id === 'base-revenue').provenance, 'Externally sourced');
});

test('ambiguous public search results are rejected rather than silently substituted', async () => {
  const fetcher = async () => ({
    ok: true,
    json: async () => ({query: {search: [{title: 'Kings County Cemetery (Brooklyn)'}]}})
  });
  await assert.rejects(
    () => researchPrivateCompany('farm.one', {fetcher}),
    error => error.code === 'IDENTITY_NOT_VERIFIED' && error.message.includes('could not verify')
  );
});

test('manual claims persist with user-entered provenance and reject non-finite values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'groundline-store-'));
  const store = new LocalStore(path.join(dir, 'data.json'));
  const workspace = store.saveResearch({identity: {legalName: 'Private Co', confidence: 0.5}, evidence: {provider: 'manual', claims: []}, plan: [], model: {outputs: [], gaps: []}}, 'operating-model');
  const updated = store.addManualClaim(workspace.id, {label: 'Revenue', value: '1250000', unit: 'USD', rationale: 'Management report', periodEnd: '2026-06-30'});
  assert.equal(updated.evidence.claims[0].provenance, 'User-entered');
  assert.equal(updated.evidence.claims[0].value, 1250000);
  assert.equal(updated.model.outputs.find(output => output.id === 'base-revenue').provenance, 'User-entered');
  assert.equal(updated.model.outputs.find(output => output.id === 'base-revenue').value, 1250000);
  assert.throws(() => store.addManualClaim(workspace.id, {label: 'Bad', value: 'NaN', rationale: 'None'}), /finite/);
  fs.rmSync(dir, {recursive: true, force: true});
});
