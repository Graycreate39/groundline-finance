const app = document.querySelector('#app');

const state = {
  api: 'checking', workspace: null, workspaces: [], busy: false,
  error: '', notice: '', companyType: 'public'
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
})[char]);

const formatValue = claim => {
  if (typeof claim.value !== 'number' || !Number.isFinite(claim.value)) return escapeHtml(claim.value || '—');
  if (claim.unit === 'USD') return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: claim.currency || 'USD', notation: 'compact', maximumFractionDigits: 2
  }).format(claim.value);
  if (claim.unit === 'percent') return `${(claim.value * 100).toFixed(1)}%`;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(claim.value);
};

const formatRange = output => {
  if (!Number.isFinite(output.low) || !Number.isFinite(output.high) || output.low === output.high) return formatValue(output);
  return `${formatValue({...output, value: output.low})}–${formatValue({...output, value: output.high})}`;
};

const statusLabel = status => ({ complete: 'Collected', ready: 'Ready', blocked: 'Missing' })[status] || status;
const provenanceClass = value => String(value || '').toLowerCase().replace(/[^a-z]+/g, '-');

function chrome() {
  const apiLabel = state.api === 'online' ? 'Local research engine connected' : state.api === 'offline' ? 'Preview only · local engine offline' : 'Checking local engine';
  return `<header class="masthead">
    <button class="wordmark" data-action="home" aria-label="Groundline home"><span>G</span>Groundline</button>
    <p>Evidence before estimates.</p>
    <div class="engine-state ${state.api}"><i></i>${apiLabel}</div>
  </header>`;
}

function landing() {
  return `<main id="main">
    <section class="research-hero">
      <div class="hero-copy">
        <p class="overline">Company research workspace</p>
        <h1>Start with a<br>real company.</h1>
        <p class="lede">Groundline collects available evidence, marks what is missing, and builds a financial model whose numbers can be traced back to their sources.</p>
        ${researchForm()}
      </div>
      <figure class="research-image">
        <img src="./assets/research-desk.jpg" alt="Annual reports, financial charts, and analyst notes arranged on a research desk">
        <figcaption>Every conclusion begins with inspectable evidence.</figcaption>
      </figure>
    </section>
    <section class="process" aria-label="Research process">
      <article><span>01</span><h2>Resolve</h2><p>Match the legal entity, ticker, exchange, country, and sector. Ambiguity remains visible.</p></article>
      <article><span>02</span><h2>Collect</h2><p>Gather official filings and public evidence. Record source, period, retrieval time, and confidence.</p></article>
      <article><span>03</span><h2>Underwrite</h2><p>Separate reported facts from estimates, expose gaps, then generate deterministic outputs.</p></article>
    </section>
    ${workspaceHistory()}
  </main>`;
}

function researchForm() {
  const offline = state.api === 'offline';
  return `<form id="research-form" class="research-form">
    <fieldset class="kind-switch"><legend>Company type</legend>
      <label><input type="radio" name="companyType" value="public" ${state.companyType === 'public' ? 'checked' : ''}><span>Public</span></label>
      <label><input type="radio" name="companyType" value="private" ${state.companyType === 'private' ? 'checked' : ''}><span>Private</span></label>
    </fieldset>
    <label class="query-label"><span>Company name or ticker</span><input name="query" required autocomplete="organization" placeholder="Apple or AAPL"></label>
    <label><span>Analysis objective</span><select name="objective">
      <option value="operating-model">Operating model</option><option value="valuation">Valuation</option>
      <option value="comparables">Comparable companies</option><option value="financing">Financing analysis</option>
      <option value="strategic-decision">Strategic decision</option>
    </select></label>
    <label class="website-field"><span>Official website <small>optional, useful for private companies</small></span><input name="website" type="url" placeholder="https://company.com"></label>
    <button class="primary" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Collecting evidence…' : 'Research company'}</button>
    <div class="form-message-slot">${state.error ? `<p class="form-message error" role="alert">${escapeHtml(state.error)}</p>` : offline ? `<p class="form-message warning">The published site is a safe preview. Run <code>npm run dev</code> locally to use live research and keep credentials server-side.</p>` : ''}</div>
  </form>`;
}

function workspaceHistory() {
  if (!state.workspaces.length) return `<section class="empty-ledger"><span>Research ledger</span><p>No company is preloaded. Your completed local research will appear here.</p></section>`;
  return `<section class="history"><div><p class="overline">Local research ledger</p><h2>Recent companies</h2></div><div>${state.workspaces.map(workspace => `<button data-workspace="${escapeHtml(workspace.id)}"><b>${escapeHtml(workspace.identity?.legalName)}</b><span>${escapeHtml(workspace.identity?.ticker || 'Private')} · ${workspace.claimCount || 0} claims</span><time>${new Date(workspace.updatedAt).toLocaleString()}</time></button>`).join('')}</div></section>`;
}

function workspaceView() {
  const w = state.workspace;
  const claims = w.evidence?.claims || [], outputs = w.model?.outputs || [], gaps = w.model?.gaps || [];
  const reported = claims.filter(x => x.provenance === 'Reported').length;
  const sourced = claims.filter(x => x.provenance === 'Externally sourced').length;
  const manual = claims.filter(x => x.provenance === 'User-entered').length;
  const current = w.evidence?.retrievedAt || w.updatedAt;
  return `<main id="main" class="workspace">
    <nav class="backline"><button data-action="home">← Research another company</button><span>Current as of ${new Date(current).toLocaleString()}</span></nav>
    <section class="identity">
      <div><p class="overline">${escapeHtml(w.kind === 'live-research' ? 'Resolved company' : 'Private-company workspace')}</p><h1>${escapeHtml(w.identity.legalName)}</h1><p>${[w.identity.ticker, w.identity.exchange, w.identity.country, w.identity.sector].filter(Boolean).map(escapeHtml).join(' · ')}</p></div>
      <div class="confidence"><span>Identity confidence</span><strong>${Math.round((w.identity.confidence || 0) * 100)}%</strong></div>
    </section>
    ${state.notice ? `<p class="notice" role="status">${escapeHtml(state.notice)}</p>` : ''}
    <section class="coverage-strip">
      <article><span>Reported</span><strong>${reported}</strong><small>Company disclosures</small></article>
      <article><span>Externally sourced</span><strong>${sourced}</strong><small>Public evidence</small></article>
      <article><span>User-entered</span><strong>${manual}</strong><small>Manual evidence</small></article>
      <article><span>Material gaps</span><strong>${gaps.filter(x => x.material).length}</strong><small>Still unresolved</small></article>
    </section>
    <div class="workspace-grid">
      <section class="sheet plan-sheet"><div class="section-head"><div><p class="overline">Research plan</p><h2>Coverage before conclusions</h2></div><span>${escapeHtml(w.objective || 'valuation')}</span></div>
        <ol class="plan">${(w.plan || []).map(item => `<li class="${escapeHtml(item.status)}"><i></i><div><b>${escapeHtml(item.label)}</b>${item.reason ? `<p>${escapeHtml(item.reason)}</p>` : ''}${item.nextAction ? `<small>${escapeHtml(item.nextAction)}</small>` : ''}</div><span>${escapeHtml(statusLabel(item.status))}</span></li>`).join('')}</ol>
      </section>
      <section class="sheet model-sheet"><div class="section-head"><div><p class="overline">Initial model</p><h2>Traceable outputs</h2></div><span>${escapeHtml(w.model?.status || 'incomplete')}</span></div>
        ${outputs.length ? outputs.map(output => `<article class="output"><div><span>${escapeHtml(output.label)}</span><strong>${formatValue(output)}</strong>${Number.isFinite(output.confidence) ? `<small>${Number.isFinite(output.low) && output.low !== output.high ? `Expected range ${formatRange(output)} · ` : ''}${Math.round(output.confidence * 100)}% confidence</small>` : ''}</div><div><span class="provenance ${provenanceClass(output.provenance)}">${escapeHtml(output.provenance)}</span><small>${escapeHtml(output.formula)}</small></div></article>`).join('') : `<p class="empty">Groundline could not create even a broad numerical range from the available identity evidence.</p>`}
      </section>
    </div>
    <section class="sheet evidence-sheet"><div class="section-head"><div><p class="overline">Evidence register</p><h2>${claims.length} normalized claims</h2></div><span>Click a source to inspect it</span></div>
      ${claims.length ? `<div class="table-wrap"><table><thead><tr><th>Claim</th><th>Value</th><th>Period</th><th>Provenance</th><th>Source</th><th>Confidence</th></tr></thead><tbody>${claims.map(claim => `<tr><td><b>${escapeHtml(claim.label)}</b><small>${escapeHtml(claim.location || '')}</small></td><td>${formatValue(claim)}</td><td>${escapeHtml(claim.periodEnd || 'Current')}</td><td><span class="provenance ${provenanceClass(claim.provenance)}">${escapeHtml(claim.provenance)}</span></td><td>${claim.sourceUrl ? `<a href="${escapeHtml(claim.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(claim.sourceTitle || 'Open source')} ↗</a>` : escapeHtml(claim.sourceTitle || 'Manual entry')}</td><td>${Math.round((claim.confidence || 0) * 100)}%</td></tr>`).join('')}</tbody></table></div>` : `<p class="empty">No evidence was collected. This workspace remains incomplete.</p>`}
    </section>
    <div class="workspace-grid lower">
      <section class="sheet gap-sheet"><div class="section-head"><div><p class="overline">Material gaps</p><h2>What is still missing</h2></div></div>${gaps.length ? gaps.map(gap => `<article><i>!</i><div><b>${escapeHtml(gap.metric)}</b><p>${escapeHtml(gap.reason)}</p><small>${escapeHtml(gap.nextAction)}</small></div></article>`).join('') : '<p class="empty">No material gaps identified.</p>'}</section>
      <section class="sheet manual-sheet"><div class="section-head"><div><p class="overline">Manual evidence</p><h2>Add what you know</h2></div><span>Always labeled</span></div>${manualClaimForm()}</section>
    </div>
  </main>`;
}

function manualClaimForm() {
  return `<form id="manual-claim-form">
    <label><span>Metric</span><input name="label" required placeholder="Monthly recurring revenue"></label>
    <div class="form-row"><label><span>Value</span><input name="value" required type="number" step="any"></label><label><span>Unit</span><select name="unit"><option value="USD">USD</option><option value="percent">Percent</option><option value="count">Count</option></select></label></div>
    <label><span>Reporting period</span><input name="periodEnd" type="date"></label>
    <label><span>Source or rationale</span><textarea name="rationale" required placeholder="Board report dated…, management-provided figure, or calculation method"></textarea></label>
    <button class="secondary" type="submit">Add user-entered claim</button>
  </form>`;
}

function render() { app.innerHTML = chrome() + (state.workspace ? workspaceView() : landing()); bind(); }

function bind() {
  document.querySelectorAll('[data-action="home"]').forEach(button => button.addEventListener('click', () => { state.workspace = null; state.error = ''; state.notice = ''; history.replaceState(null, '', location.pathname); render(); }));
  document.querySelectorAll('input[name="companyType"]').forEach(input => input.addEventListener('change', () => { state.companyType = input.value; }));
  document.querySelectorAll('[data-workspace]').forEach(button => button.addEventListener('click', async () => {
    try { const result = await fetchJson(`/api/workspaces/${encodeURIComponent(button.dataset.workspace)}`); if (result?.workspace) { state.workspace = result.workspace; render(); } } catch (error) { state.error = error.message; render(); }
  }));
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
    const result = await fetchJson('/api/research', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    state.workspace = result.workspace; state.notice = 'Research saved locally. No unsupported values were substituted.';
    history.replaceState(null, '', `?workspace=${encodeURIComponent(result.workspace.id)}`);
  } catch (error) { state.error = error.message; }
  state.busy = false; render();
}

async function addManualClaim(event) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await fetchJson(`/api/workspaces/${encodeURIComponent(state.workspace.id)}/claims`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    state.workspace = result.workspace; state.notice = 'Manual claim added and labeled User-entered.'; render();
  } catch (error) { state.notice = error.message; render(); }
}

async function boot() {
  try { await fetchJson('/api/health'); state.api = 'online'; const result = await fetchJson('/api/workspaces'); state.workspaces = result.workspaces || []; const requested = new URLSearchParams(location.search).get('workspace'); if(requested){const saved=await fetchJson(`/api/workspaces/${encodeURIComponent(requested)}`);state.workspace=saved.workspace;} }
  catch { state.api = 'offline'; }
  render();
}

render();
boot();
