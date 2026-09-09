const app = document.querySelector('#app');

const state = {
  api: 'checking', workspace: null, workspaces: [], busy: false,
  error: '', notice: '', companyType: 'public', evidenceFilter: 'all', evidenceQuery: ''
};
let evidenceSearchTimer;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const safeUrl = value => {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : '';
  } catch { return ''; }
};

const formatValue = claim => {
  if (typeof claim.value !== 'number' || !Number.isFinite(claim.value)) return escapeHtml(claim.value || '—');
  if (claim.unit === 'USD') return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: claim.currency || 'USD', notation: 'compact', maximumFractionDigits: 2
  }).format(claim.value);
  if (claim.unit === 'percent') return `${(claim.value * 100).toFixed(1)}%`;
  return new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(claim.value);
};

const formatRange = output => {
  if (!Number.isFinite(output.low) || !Number.isFinite(output.high) || output.low === output.high) return formatValue(output);
  return `${formatValue({...output, value: output.low})}–${formatValue({...output, value: output.high})}`;
};

const formatDate = value => {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Current';
  return new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'short', day: 'numeric'}).format(new Date(value));
};

const statusLabel = status => ({complete: 'Collected', ready: 'Ready', blocked: 'Missing'})[status] || status;
const provenanceClass = value => String(value || '').toLowerCase().replace(/[^a-z]+/g, '-');
const confidenceClass = value => value >= 0.75 ? 'high' : value >= 0.45 ? 'medium' : 'low';

function chrome() {
  const apiLabel = state.api === 'online' ? 'Research engine online' : state.api === 'offline' ? 'Preview mode' : 'Checking engine';
  return `<header class="masthead">
    <button class="wordmark" data-action="home" aria-label="Groundline home"><span>G</span><b>Groundline</b></button>
    <div class="masthead-rule"><span>Company intelligence</span><span>Evidence → assumptions → value</span></div>
    <div class="engine-state ${state.api}"><i></i>${apiLabel}</div>
  </header>`;
}

function landing() {
  return `<main id="main" class="landing">
    <section class="research-hero">
      <div class="hero-copy">
        <p class="overline">Independent company research / 01</p>
        <h1>Underwrite the company, not the story.</h1>
        <p class="lede">Enter any public or private company. Groundline identifies the right business, gathers traceable evidence, and shows exactly where a valuation becomes an estimate.</p>
        <div class="method-line" aria-label="Research workflow"><span>Resolve identity</span><i>→</i><span>Collect evidence</span><i>→</i><span>Build value</span></div>
      </div>
      <aside class="research-console" aria-label="Start company research">
        <div class="console-head"><span>New research file</span><span>${new Date().getFullYear()}</span></div>
        ${researchForm()}
      </aside>
    </section>
    <section class="workbench-intro">
      <figure class="research-image">
        <img src="./assets/research-desk.jpg" alt="Annual reports, financial charts, and analyst notes arranged on a research desk">
        <figcaption><span>01</span> Evidence is stored beside the conclusion it supports.</figcaption>
      </figure>
      <div class="process" aria-label="Research process">
        <article><span>01 / Resolve</span><h2>Correct entity first.</h2><p>Names, websites, location, legal identity, and sector are checked before financial data enters the model.</p></article>
        <article><span>02 / Collect</span><h2>Keep the source attached.</h2><p>Claims retain provenance, period, retrieval time, confidence, and a direct source link.</p></article>
        <article><span>03 / Underwrite</span><h2>Expose the judgment.</h2><p>Reported facts and outside estimates stay separate from assumptions and deterministic calculations.</p></article>
      </div>
    </section>
    ${workspaceHistory()}
  </main>`;
}

function researchForm() {
  const offline = state.api === 'offline';
  const privateMode = state.companyType === 'private';
  return `<form id="research-form" class="research-form">
    <fieldset class="kind-switch"><legend>Company type</legend>
      <label><input type="radio" name="companyType" value="public" ${!privateMode ? 'checked' : ''}><span>Public company</span></label>
      <label><input type="radio" name="companyType" value="private" ${privateMode ? 'checked' : ''}><span>Private company</span></label>
    </fieldset>
    <label class="query-label"><span>Company name or ticker</span><input name="query" required autocomplete="organization" placeholder="Apple, AAPL, Anthropic, Farm.One"></label>
    <label><span>Analysis objective</span><select name="objective">
      <option value="operating-model">Operating model</option><option value="valuation">Valuation</option>
      <option value="comparables">Comparable companies</option><option value="financing">Financing analysis</option>
      <option value="strategic-decision">Strategic decision</option>
    </select></label>
    <div class="private-fields ${privateMode ? '' : 'is-hidden'}" aria-hidden="${privateMode ? 'false' : 'true'}">
      <label><span>Official website <small>prevents a wrong-company match</small></span><input name="website" type="url" placeholder="https://company.com" ${privateMode ? '' : 'disabled'}></label>
      <label><span>Location or identifying details</span><textarea name="context" placeholder="Brooklyn, NY · vertical farm and taproom" ${privateMode ? '' : 'disabled'}></textarea></label>
    </div>
    <button class="primary" type="submit" ${state.busy || offline ? 'disabled' : ''}><span>${state.busy ? 'Researching…' : 'Open research file'}</span><b aria-hidden="true">↗</b></button>
    ${state.busy ? '<div class="research-progress" role="status"><i></i><span>Resolving identity and collecting public evidence. This can take a moment.</span></div>' : ''}
    <div class="form-message-slot">${state.error ? `<p class="form-message error" role="alert">${escapeHtml(state.error)}</p>` : offline ? `<p class="form-message warning">The published site is an interface preview. Run <code>npm run dev</code> locally for live research.</p>` : ''}</div>
  </form>`;
}

function workspaceHistory() {
  if (!state.workspaces.length) return `<section class="empty-ledger"><span>Local research ledger</span><p>No saved companies yet. Completed research stays on this machine.</p></section>`;
  return `<section class="history"><div class="history-intro"><p class="overline">Local research ledger</p><h2>Continue a file</h2><p>Saved evidence and assumptions remain available between sessions.</p></div><div class="history-list">${state.workspaces.map((workspace, index) => `<button data-workspace="${escapeHtml(workspace.id)}"><span class="history-index">${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(workspace.identity?.legalName)}</b><span>${escapeHtml(workspace.identity?.ticker || 'Private')} · ${workspace.claimCount || 0} claims</span><time>${formatDate(workspace.updatedAt)}</time><i>↗</i></button>`).join('')}</div></section>`;
}

function workspaceNav() {
  return `<nav class="workspace-nav" aria-label="Workspace sections">
    <a href="#overview">Overview</a><a href="#evidence">Evidence</a><a href="#assumptions">Assumptions</a><a href="#gaps">Gaps</a><a href="#manual">Add evidence</a>
  </nav>`;
}

function workspaceView() {
  const w = state.workspace;
  const claims = w.evidence?.claims || [], outputs = w.model?.outputs || [], gaps = w.model?.gaps || [], assumptions = w.model?.assumptions || [];
  const reported = claims.filter(x => x.provenance === 'Reported').length;
  const sourced = claims.filter(x => x.provenance === 'Externally sourced').length;
  const manual = claims.filter(x => x.provenance === 'User-entered').length;
  const current = w.evidence?.retrievedAt || w.updatedAt;
  const headline = outputs.find(output => output.id === 'market-cap') || outputs[0];
  const supporting = outputs.filter(output => output !== headline);
  const modelEvidenceIds = new Set(outputs.flatMap(output => output.evidenceIds || []));
  return `<main id="main" class="workspace">
    <nav class="backline"><button data-action="home">← New research</button><span>Updated ${formatDate(current)}</span></nav>
    <section class="identity">
      <div><p class="overline">${escapeHtml(w.kind === 'live-research' ? 'Resolved public company' : 'Private-company research')}</p><h1>${escapeHtml(w.identity.legalName)}</h1><p>${[w.identity.ticker, w.identity.exchange, w.identity.location || w.identity.country, w.identity.sector].filter(Boolean).map(escapeHtml).join(' · ')}</p></div>
      <div class="confidence"><span>Identity match</span><strong>${Math.round((w.identity.confidence || 0) * 100)}%</strong><small>${w.identity.sourceUrl ? `<a href="${safeUrl(w.identity.sourceUrl)}" target="_blank" rel="noreferrer">Inspect identity source ↗</a>` : 'No external identity link'}</small></div>
    </section>
    ${workspaceNav()}
    ${state.notice ? `<p class="notice" role="status">${escapeHtml(state.notice)}</p>` : ''}
    <section class="coverage-strip" aria-label="Evidence coverage">
      <article><span>Reported</span><strong>${reported}</strong><small>Company disclosures</small></article>
      <article><span>Outside evidence</span><strong>${sourced}</strong><small>Independent sources</small></article>
      <article><span>User-entered</span><strong>${manual}</strong><small>Manual evidence</small></article>
      <article class="${gaps.some(x => x.material) ? 'attention' : ''}"><span>Material gaps</span><strong>${gaps.filter(x => x.material).length}</strong><small>${gaps.some(x => x.material) ? 'Require judgment' : 'No material gaps'}</small></article>
    </section>
    <section id="overview" class="overview-grid section-anchor">
      <div class="valuation-panel">
        <div class="section-head"><div><p class="overline">Model output / 02</p><h2>${headline ? escapeHtml(headline.label) : 'Model incomplete'}</h2></div><span>${escapeHtml(w.model?.status || 'incomplete')}</span></div>
        ${headline ? `<div class="headline-value"><strong>${formatValue(headline)}</strong><span class="provenance ${provenanceClass(headline.provenance)}">${escapeHtml(headline.provenance)}</span></div>
        <p class="range-line">${headline.low !== headline.high ? `Expected range ${formatRange(headline)} · ` : ''}${Math.round((headline.confidence || 0) * 100)}% confidence</p>
        <p class="formula">${escapeHtml(headline.formula)}</p>` : '<p class="empty">Available evidence does not yet support a numerical output.</p>'}
        <div class="supporting-outputs">${supporting.map(output => `<article><div><span>${escapeHtml(output.label)}</span><strong>${formatValue(output)}</strong></div><div><span class="confidence-dot ${confidenceClass(output.confidence || 0)}"></span><small>${Math.round((output.confidence || 0) * 100)}% confidence</small></div><p>${escapeHtml(output.formula)}</p></article>`).join('')}</div>
      </div>
      <section class="plan-sheet"><div class="section-head"><div><p class="overline">Research file / 01</p><h2>Coverage before conclusions</h2></div><span>${escapeHtml(w.objective || 'valuation')}</span></div>
        <ol class="plan">${(w.plan || []).map((item, index) => `<li class="${escapeHtml(item.status)}"><span class="plan-index">${String(index + 1).padStart(2, '0')}</span><div><b>${escapeHtml(item.label)}</b>${item.reason ? `<p>${escapeHtml(item.reason)}</p>` : ''}${item.nextAction ? `<small>${escapeHtml(item.nextAction)}</small>` : ''}</div><span>${escapeHtml(statusLabel(item.status))}</span></li>`).join('')}</ol>
      </section>
    </section>
    ${evidenceSection(claims, modelEvidenceIds)}
    <section id="assumptions" class="assumption-section section-anchor"><div class="section-head"><div><p class="overline">Model assumptions / 04</p><h2>Judgment ledger</h2></div><span>${assumptions.length} active assumptions</span></div>
      ${assumptions.length ? `<div class="assumption-list">${assumptions.map((assumption, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><b>${escapeHtml(assumption.label)}</b><strong>${escapeHtml(assumption.value)}</strong></div><p>${escapeHtml(assumption.rationale)}</p><small>${Math.round((assumption.confidence || 0) * 100)}% confidence · ${escapeHtml(assumption.provenance)}</small></article>`).join('')}</div>` : '<p class="empty">No model assumptions are stored for this workspace.</p>'}
    </section>
    <div class="decision-grid">
      <section id="gaps" class="gap-sheet section-anchor"><div class="section-head"><div><p class="overline">Open questions / 05</p><h2>What could change the answer</h2></div><span>${gaps.length} items</span></div>${gaps.length ? gaps.map(gap => `<article><i>!</i><div><b>${escapeHtml(gap.metric)}</b><p>${escapeHtml(gap.reason)}</p><small>${escapeHtml(gap.nextAction)}</small></div></article>`).join('') : '<p class="empty">No material gaps identified.</p>'}</section>
      <section id="manual" class="manual-sheet section-anchor"><div class="section-head"><div><p class="overline">Manual evidence / 06</p><h2>Add a known fact</h2></div><span>Always labeled</span></div><p class="section-intro">Use board data, management figures, or your own documented assumption. Groundline keeps it separate from reported evidence.</p>${manualClaimForm()}</section>
    </div>
  </main>`;
}

function evidenceSection(claims, modelEvidenceIds = new Set()) {
  const query = state.evidenceQuery.trim().toLowerCase();
  const visible = claims.filter(claim => {
    const filterMatch = state.evidenceFilter === 'all' || provenanceClass(claim.provenance) === state.evidenceFilter || (state.evidenceFilter === 'model-inputs' && modelEvidenceIds.has(claim.id));
    const queryMatch = !query || [claim.label, claim.value, claim.sourceTitle, claim.sourceType, claim.location, claim.excerpt, claim.provenance].some(value => String(value || '').toLowerCase().includes(query));
    return filterMatch && queryMatch;
  });
  const filters = [
    ['all', 'All'], ['reported', 'Reported'], ['externally-sourced', 'Outside'], ['user-entered', 'User'], ['model-inputs', 'Used in model']
  ];
  return `<section id="evidence" class="evidence-section section-anchor"><div class="section-head"><div><p class="overline">Evidence register / 03</p><h2>${claims.length} traceable claims</h2></div><span>${visible.length} shown</span></div>
    <div class="evidence-tools"><div class="filter-group" aria-label="Filter evidence">${filters.map(([value, label]) => `<button class="${state.evidenceFilter === value ? 'is-active' : ''}" data-evidence-filter="${value}" aria-pressed="${state.evidenceFilter === value}">${label}</button>`).join('')}</div><label><span class="sr-only">Search evidence</span><input id="evidence-query" type="search" value="${escapeHtml(state.evidenceQuery)}" placeholder="Search claims or sources"></label></div>
    ${visible.length ? `<div class="evidence-list">${visible.map(claim => evidenceItem(claim, modelEvidenceIds.has(claim.id))).join('')}</div>` : '<p class="empty evidence-empty">No claims match this view.</p>'}
  </section>`;
}

function evidenceItem(claim, usedInModel) {
  const url = safeUrl(claim.sourceUrl);
  return `<details class="evidence-item"><summary><span class="evidence-metric"><b>${escapeHtml(claim.label)}</b><small>${escapeHtml(claim.location || claim.sourceType || '')}</small></span><strong>${formatValue(claim)}</strong><span>${formatDate(claim.periodEnd)}</span><span class="provenance ${provenanceClass(claim.provenance)}">${escapeHtml(claim.provenance)}</span><span class="evidence-confidence"><i class="confidence-dot ${confidenceClass(claim.confidence || 0)}"></i>${Math.round((claim.confidence || 0) * 100)}%</span></summary><div class="evidence-detail"><p>${escapeHtml(claim.excerpt || 'No supporting excerpt was stored.')}</p><div>${usedInModel ? '<span>Used in active model</span>' : '<span>Context only</span>'}${url ? `<a href="${url}" target="_blank" rel="noreferrer">Open source ↗</a>` : '<span>No external link</span>'}</div></div></details>`;
}

function manualClaimForm() {
  return `<form id="manual-claim-form">
    <label><span>Metric</span><input name="label" required placeholder="Monthly recurring revenue"></label>
    <div class="form-row"><label><span>Value</span><input name="value" required type="number" step="any"></label><label><span>Unit</span><select name="unit"><option value="USD">USD</option><option value="percent">Percent</option><option value="count">Count</option></select></label></div>
    <label><span>Reporting period</span><input name="periodEnd" type="date"></label>
    <label><span>Source or rationale</span><textarea name="rationale" required placeholder="Board report dated…, management figure, or calculation method"></textarea></label>
    <button class="secondary" type="submit"><span>Add evidence</span><b aria-hidden="true">+</b></button>
  </form>`;
}

function render() { app.innerHTML = chrome() + (state.workspace ? workspaceView() : landing()); bind(); }

function bind() {
  document.querySelectorAll('[data-action="home"]').forEach(button => button.addEventListener('click', () => { state.workspace = null; state.error = ''; state.notice = ''; history.replaceState(null, '', location.pathname); render(); }));
  document.querySelectorAll('input[name="companyType"]').forEach(input => input.addEventListener('change', () => {
    state.companyType = input.value;
    const privateFields = document.querySelector('.private-fields');
    privateFields?.classList.toggle('is-hidden', state.companyType !== 'private');
    privateFields?.setAttribute('aria-hidden', String(state.companyType !== 'private'));
    privateFields?.querySelectorAll('input, textarea').forEach(field => { field.disabled = state.companyType !== 'private'; });
  }));
  document.querySelectorAll('[data-workspace]').forEach(button => button.addEventListener('click', async () => {
    try { const result = await fetchJson(`/api/workspaces/${encodeURIComponent(button.dataset.workspace)}`); if (result?.workspace) { state.workspace = result.workspace; history.replaceState(null, '', `?workspace=${encodeURIComponent(result.workspace.id)}`); render(); } } catch (error) { state.error = error.message; render(); }
  }));
  document.querySelectorAll('[data-evidence-filter]').forEach(button => button.addEventListener('click', () => { state.evidenceFilter = button.dataset.evidenceFilter; render(); document.querySelector('#evidence')?.scrollIntoView(); }));
  const evidenceQuery = document.querySelector('#evidence-query'); if (evidenceQuery) evidenceQuery.addEventListener('input', event => {
    const value = event.currentTarget.value;
    clearTimeout(evidenceSearchTimer);
    evidenceSearchTimer = setTimeout(() => {
      state.evidenceQuery = value; render();
      const next = document.querySelector('#evidence-query'); next?.focus(); next?.setSelectionRange(value.length, value.length);
    }, 120);
  });
  const form = document.querySelector('#research-form'); if (form) form.addEventListener('submit', researchCompany);
  const manual = document.querySelector('#manual-claim-form'); if (manual) manual.addEventListener('submit', addManualClaim);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options), type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('The local research engine is not running. Start it with npm run dev.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'The research request could not be completed.');
  return data;
}

async function researchCompany(event) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
  state.busy = true; state.error = ''; render();
  try {
    const result = await fetchJson('/api/research', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)});
    state.workspace = result.workspace; state.notice = 'Research saved locally. Every unsupported value remains visibly estimated.';
    state.workspaces = [result.workspace, ...state.workspaces.filter(item => item.id !== result.workspace.id)];
    history.replaceState(null, '', `?workspace=${encodeURIComponent(result.workspace.id)}`);
  } catch (error) { state.error = error.message; }
  state.busy = false; render();
}

async function addManualClaim(event) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await fetchJson(`/api/workspaces/${encodeURIComponent(state.workspace.id)}/claims`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)});
    state.workspace = result.workspace; state.notice = 'Manual evidence added and labeled User-entered.';
    state.workspaces = [result.workspace, ...state.workspaces.filter(item => item.id !== result.workspace.id)];
    render();
  } catch (error) { state.notice = error.message; render(); }
}

async function boot() {
  try {
    await fetchJson('/api/health'); state.api = 'online';
    const result = await fetchJson('/api/workspaces'); state.workspaces = result.workspaces || [];
    const requested = new URLSearchParams(location.search).get('workspace');
    if (requested) { const saved = await fetchJson(`/api/workspaces/${encodeURIComponent(requested)}`); state.workspace = saved.workspace; }
  } catch { state.api = 'offline'; }
  render();
}

window.addEventListener('popstate', () => { location.reload(); });
render();
boot();
