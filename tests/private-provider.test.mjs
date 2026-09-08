import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {researchPrivateCompany} from '../server/providers/public-web.mjs';
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
  assert(result.plan.some(item => item.id === 'financials' && item.status === 'ready'));
  assert(!result.evidence.claims.some(claim => claim.label.toLowerCase().includes('revenue')));
  const model = generateInitialModel(result);
  assert.equal(model.status, 'estimated');
  assert(model.outputs.some(output => output.id === 'market-cap' && output.low > 0 && output.high > output.low));
  assert(model.outputs.every(output => output.provenance === 'Model-estimated'));
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
