import { state, activeHoldings } from '../store.js';
import { ASSET_CLASSES, TAX_RULES, DEFAULT_TARGETS } from '../data.js';
import { html, raw, fmt, fmtShort, fmtDate, pct, signed, signedPct, sum, daysBetween, yearsSince, estimateXIRR, clamp, $ } from '../util.js';
import { pageHead, subtabs, stat, kpi, allocRows, classBadge, ownerBadge, gainText, icon } from '../ui.js';
import { bars } from '../charts.js';

const TABS = [['returns', 'Returns'], ['tax', 'Tax'], ['rebalance', 'Rebalance']];
let currentRoot = null, currentSub = 'returns';

export function render(root, { sub = 'returns' } = {}) {
  currentRoot = root; currentSub = sub;
  root.innerHTML = html`${pageHead('Analysis', 'Returns, tax exposure and target allocation', subtabs(TABS, sub, 'analysis'))}<div id="analysisBody"></div>`;
  const body = root.querySelector('#analysisBody');
  if (sub === 'tax') renderTax(body);
  else if (sub === 'rebalance') renderRebalance(body);
  else renderReturns(body);
}

// ── Returns ───────────────────────────────────────────────────────────
function renderReturns(body) {
  const items = activeHoldings().filter(h => h.cost > 0);
  const cost = sum(items, h => h.cost), value = sum(items, h => h.value), gain = value - cost;
  const xirr = estimateXIRR(items);
  const classes = state.byClass.map(c => {
    const its = c.items.filter(h => h.value > 0 && h.cost > 0);
    const cv = sum(its, h => h.value), cc = sum(its, h => h.cost);
    return { ...c, value: cv, cost: cc, gain: cv - cc, ret: cc ? (cv - cc) / cc : null, xirr: estimateXIRR(its) };
  }).filter(c => c.cost > 0).sort((a, b) => b.gain - a.gain);

  body.innerHTML = html`
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">Unrealised gain</span>
        <span class="hero-value ${gain >= 0 ? 'up' : 'down'}">${signed(gain)}</span>
        <div class="hero-sub"><span>${signedPct(gain / cost)} absolute return on ${fmt(cost)} invested</span></div>
      </div>
      <div class="card hero-side">
        ${kpi('Cost basis', fmt(cost))}
        ${kpi('Current value', fmt(value))}
        ${kpi('Est. XIRR', xirr != null ? `${signedPct(xirr)} p.a.` : '—', xirr >= 0 ? 'up' : 'down')}
        ${kpi('Best class', classes[0] ? `${classes[0].short} ${signed(classes[0].gain, fmtShort)}` : '—', 'up')}
      </div>
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Gain by asset class</h3></div><div class="chart lg"><canvas id="retChart"></canvas></div></div>
      <div class="card"><div class="card-head"><h3>Return by asset class</h3><span class="muted">absolute · est. XIRR</span></div><div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>Class</th><th class="right">Cost</th><th class="right">Gain</th><th class="right">XIRR</th></tr></thead>
        <tbody>${classes.map(c => html`<tr><td>${classBadge(c.key)}</td><td class="right muted">${fmt(c.cost)}</td><td class="right">${gainText(c.gain, c.cost)}</td><td class="right ${c.xirr == null ? 'muted' : c.xirr >= 0 ? 'up' : 'down'}">${c.xirr == null ? '—' : signedPct(c.xirr)}</td></tr>`)}</tbody>
      </table></div><div class="note">XIRR is estimated from the weighted average holding period of each class; SIPs and staggered purchases will differ.</div></div>
    </div>
    <div class="card"><div class="card-head"><h3>Holding-level returns</h3><span class="muted">${items.length} positions with a cost basis</span></div><div class="table-wrap"><table class="tbl compact">
      <thead><tr><th>Holding</th><th>Type</th><th>Owner</th><th class="right">Cost</th><th class="right">Value</th><th class="right">Gain</th><th class="right">Held</th></tr></thead>
      <tbody>${[...items].sort((a, b) => (b.value - b.cost) - (a.value - a.cost)).map(h => html`<tr>
        <td><span class="main-cell">${h.name}</span><span class="sub">${h.account}</span></td><td>${classBadge(h.cls)}</td><td>${ownerBadge(h.owner)}</td>
        <td class="right muted">${fmt(h.cost)}</td><td class="right main-cell">${fmt(h.value)}</td><td class="right">${gainText(h.value - h.cost, h.cost)}</td><td class="right muted">${yearsSince(h.since).toFixed(1)} y</td></tr>`)}</tbody>
    </table></div></div>`;

  bars(body.querySelector('#retChart'), { labels: classes.map(c => c.short), data: classes.map(c => c.gain), colors: classes.map(c => c.gain >= 0 ? '#22c55e' : '#ef4444'), horizontal: true, tip: c => `${signed(c.raw)}` });
}

// ── Tax ───────────────────────────────────────────────────────────────
const LTCG_EXEMPT = 125000;
function taxInfo(h) {
  const gain = h.value - h.cost, days = daysBetween(h.since), pos = Math.max(0, gain);
  switch (ASSET_CLASSES[h.cls].tax) {
    case 'equity':   return days >= 365 ? { label: 'LTCG 12.5%', kind: 'ltcg', est: pos * 0.125, info: '₹1.25L/yr exempt overall' } : { label: 'STCG 20%', kind: 'stcg', est: pos * 0.20, info: 'Held under 1 year' };
    case 'unlisted': return days >= 730 ? { label: 'LTCG 12.5%', kind: 'ltcg', est: pos * 0.125, info: 'Held over 2 years' } : { label: 'Slab rate', kind: 'stcg', est: pos * 0.30, info: 'Held under 2 years' };
    case 'metal':    return days >= 730 ? { label: 'LTCG 12.5%', kind: 'ltcg', est: pos * 0.125, info: 'Held over 2 years' } : { label: 'Slab rate', kind: 'stcg', est: pos * 0.30, info: 'Held under 2 years' };
    case 'sgb':      return { label: 'Tax free', kind: 'free', est: 0, info: 'Exempt at RBI maturity' };
    case 'free':     return { label: 'Exempt', kind: 'free', est: 0, info: h.cls === 'ssy' ? 'EEE under 80C' : 'Subject to policy terms' };
    case 'nps':      return { label: '60% exempt', kind: 'partial', est: 0, info: 'At withdrawal after 60' };
    case 'aif':      return { label: 'Fund level', kind: 'slab', est: pos * 0.125, info: 'Depends on AIF category' };
    case 'crypto':   return { label: '30% flat', kind: 'stcg', est: pos * 0.30, info: 'No set-off of losses' };
    default:         return { label: 'Income slab', kind: 'slab', est: pos * 0.30, info: 'Interest taxed yearly' };
  }
}
const KIND_TONE = { free: 'up', ltcg: '', stcg: 'down', slab: '', partial: '', na: 'muted' };

function renderTax(body) {
  const rows = activeHoldings().filter(h => h.cost > 0).map(h => ({ ...h, gain: h.value - h.cost, tax: taxInfo(h) }));
  const total = sum(rows, r => r.gain);
  const by = kind => rows.filter(r => r.tax.kind === kind);
  const ltcgRaw = sum(by('ltcg'), r => r.tax.est);
  const ltcg = Math.max(0, ltcgRaw - LTCG_EXEMPT * 0.125);
  const stcg = sum([...by('stcg'), ...by('slab')], r => r.tax.est);
  const freeGain = sum([...by('free'), ...by('partial')], r => Math.max(0, r.gain));

  body.innerHTML = html`
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">Estimated tax if everything were sold today</span>
        <span class="hero-value">${fmt(ltcg + stcg)}</span>
        <div class="hero-sub"><span>on ${fmt(total)} unrealised gain · ${pct((ltcg + stcg) / Math.max(1, total))} effective</span></div>
      </div>
      <div class="card hero-side">
        ${kpi('Tax-free gains', fmt(freeGain), 'up')}
        ${kpi('LTCG tax (net of ₹1.25L)', fmt(ltcg))}
        ${kpi('STCG / slab tax', fmt(stcg), 'down')}
        ${kpi('Positions', String(rows.length))}
      </div>
    </div>
    <div class="alert info">${icon('info')}<div>Estimates only, using FY 2026-27 rules on headline rates. Surcharge, cess, indexation history and loss set-offs are ignored — confirm with your CA before acting.</div></div>
    <div class="card" style="margin-bottom:var(--gap)"><div class="card-head"><h3>Per holding</h3></div><div class="table-wrap"><table class="tbl compact">
      <thead><tr><th>Holding</th><th>Owner</th><th>Bought</th><th class="right">Held</th><th class="right">Gain</th><th>Treatment</th><th class="right">Est. tax</th></tr></thead>
      <tbody>${rows.sort((a, b) => b.gain - a.gain).map(r => html`<tr>
        <td><span class="main-cell">${r.name}</span><span class="sub">${ASSET_CLASSES[r.cls].label}</span></td><td>${ownerBadge(r.owner)}</td>
        <td class="muted">${fmtDate(r.since)}</td><td class="right muted">${yearsSince(r.since).toFixed(1)} y</td>
        <td class="right ${r.gain >= 0 ? 'up' : 'down'}">${signed(r.gain)}</td>
        <td><span class="badge ${KIND_TONE[r.tax.kind]}">${r.tax.label}</span><span class="sub">${r.tax.info}</span></td>
        <td class="right ${r.tax.est > 0 ? 'down' : 'muted'}">${r.tax.est > 0 ? fmt(r.tax.est) : '—'}</td></tr>`)}</tbody>
    </table></div></div>
    <div class="card"><div class="card-head"><h3>Rules reference</h3></div><div class="table-wrap"><table class="tbl compact">
      <thead><tr><th>Asset</th><th>Long-term after</th><th>LTCG</th><th>STCG</th><th>Notes</th></tr></thead>
      <tbody>${TAX_RULES.map(r => html`<tr><td class="main-cell">${r.asset}</td><td>${r.period}</td><td>${r.ltcg}</td><td>${r.stcg}</td><td class="muted">${r.note}</td></tr>`)}</tbody>
    </table></div></div>`;
}

// ── Rebalance ─────────────────────────────────────────────────────────
let targets = { ...DEFAULT_TARGETS };
let sipAmount = 50000;
const TOLERANCE = 5000;

const classState = key => {
  const current = state.classMap[key] || 0, target = targets[key] || 0;
  const targetAmt = target / 100 * state.total, diff = targetAmt - current;
  return { key, current, currentPct: state.total ? current / state.total : 0, target, targetAmt, diff, status: Math.abs(diff) < TOLERANCE ? 'on' : diff > 0 ? 'under' : 'over' };
};
const statusLabel = s => s.status === 'on' ? html`<span class="up">On target</span>` : s.status === 'under' ? html`<span style="color:var(--blue)">Buy ${fmtShort(s.diff)}</span>` : html`<span style="color:var(--accent)">Sell ${fmtShort(-s.diff)}</span>`;

function renderRebalance(body) {
  body.innerHTML = html`
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">Target allocation</span>
        <span class="hero-value" id="rebTotalPct"></span>
        <div class="hero-sub"><span>Drag sliders to set targets. Blue bar is current weight, gold is target.</span></div>
      </div>
      <div class="card hero-side" id="rebCounts"></div>
    </div>
    <div class="card" style="margin-bottom:var(--gap)">
      <div class="card-head"><h3>Targets</h3><div class="pills">
        <button class="btn small" data-action="matchCurrent">Match current</button>
        <button class="btn small" data-action="resetTargets">Reset defaults</button>
        <button class="btn small btn-primary" data-action="calcActions">Calculate actions</button></div></div>
      ${Object.keys(DEFAULT_TARGETS).map(key => {
        const c = ASSET_CLASSES[key], s = classState(key);
        return html`<div class="reb-row" data-row="${key}">
          <span class="name"><i class="dot" style="background:${c.color}"></i>${c.label}</span>
          <div class="bars"><div class="bar thin"><i style="width:${(s.currentPct * 100).toFixed(1)}%;background:var(--blue)"></i></div>
            <input class="range" type="range" min="0" max="60" step="1" value="${s.target}" data-input="target" data-arg="${key}" aria-label="${c.label} target"></div>
          <span class="cell muted">${pct(s.currentPct)}<small>now</small></span>
          <span class="cell tgt" style="color:var(--accent)">${s.target}%<small>target</small></span>
          <span class="cell act">${statusLabel(s)}</span>
        </div>`;
      })}
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Actions</h3></div><div id="rebActions"><div class="empty">Set targets, then press “Calculate actions”.</div></div></div>
      <div class="card"><div class="card-head"><h3>Monthly SIP split</h3><span class="muted">towards underweight classes</span></div>
        <div class="field" style="max-width:220px;margin-bottom:12px"><label>Monthly amount (₹)</label><input class="input num" type="number" min="1000" step="1000" value="${sipAmount}" data-input="sip"></div>
        <div id="sipRows"></div></div>
    </div>
    <div class="card"><div class="card-head"><h3>Comparison</h3></div><div class="table-wrap" id="rebTable"></div></div>`;
  refreshRebalance();
}

function refreshRebalance() {
  const body = $('#analysisBody', currentRoot);
  if (!body || currentSub !== 'rebalance') return;
  const all = Object.keys(DEFAULT_TARGETS).map(classState);
  const totalPct = sum(all, s => s.target);
  const counts = { over: 0, under: 0, on: 0, move: 0 };
  for (const s of all) { counts[s.status]++; if (s.status === 'over') counts.move += -s.diff; }
  const tp = $('#rebTotalPct', body);
  tp.textContent = `${totalPct}%`;
  tp.className = `hero-value ${totalPct === 100 ? 'up' : 'down'}`;
  $('#rebCounts', body).innerHTML = html`${kpi('Overweight', String(counts.over), 'down')}${kpi('Underweight', String(counts.under))}${kpi('On target', String(counts.on), 'up')}${kpi('To move', fmt(counts.move))}`;
  for (const s of all) {
    const row = body.querySelector(`[data-row="${s.key}"]`);
    if (!row) continue;
    row.querySelector('.tgt').innerHTML = html`${s.target}%<small>target</small>`;
    row.querySelector('.act').innerHTML = statusLabel(s);
  }
  $('#rebTable', body).innerHTML = html`<table class="tbl compact">
    <thead><tr><th>Class</th><th class="right">Current</th><th class="right">Now</th><th class="right">Target</th><th class="right">Target ₹</th><th class="right">Difference</th></tr></thead>
    <tbody>${all.map(s => html`<tr><td>${classBadge(s.key)}</td><td class="right">${fmt(s.current)}</td><td class="right muted">${pct(s.currentPct)}</td><td class="right" style="color:var(--accent)">${s.target}%</td><td class="right muted">${fmt(s.targetAmt)}</td><td class="right">${s.status === 'on' ? html`<span class="muted">—</span>` : html`<span style="color:${s.diff > 0 ? 'var(--blue)' : 'var(--accent)'}">${signed(s.diff)}</span>`}</td></tr>`)}</tbody>
    <tfoot><tr><td>Total</td><td class="right">${fmt(state.total)}</td><td class="right">100%</td><td class="right ${totalPct === 100 ? 'up' : 'down'}">${totalPct}%</td><td></td><td></td></tr></tfoot></table>`;
  const buys = all.filter(s => s.diff > TOLERANCE && s.target > 0);
  const short = sum(buys, s => s.diff);
  $('#sipRows', body).innerHTML = buys.length ? html`${allocRows(buys.sort((a, b) => b.diff - a.diff).map(s => ({ name: ASSET_CLASSES[s.key].label, value: Math.round(s.diff / short * sipAmount), color: ASSET_CLASSES[s.key].color })), { total: sipAmount })}` : html`<div class="empty">Nothing is underweight — no SIP reallocation needed.</div>`;
}

function renderActions() {
  const body = $('#analysisBody', currentRoot);
  const all = Object.keys(DEFAULT_TARGETS).map(classState).filter(s => s.status !== 'on').sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const buys = all.filter(s => s.diff > 0), sells = all.filter(s => s.diff < 0);
  const card = s => html`<div class="action-card">
    <span class="tag" style="color:${s.diff > 0 ? 'var(--blue)' : 'var(--accent)'}">${s.diff > 0 ? 'BUY' : 'SELL'} · ${ASSET_CLASSES[s.key].label}</span>
    <div class="amt">${fmt(Math.abs(s.diff))}</div>
    <div class="bar thin"><i style="width:${clamp(s.current / Math.max(s.current, s.targetAmt) * 100, 0, 100).toFixed(1)}%;background:var(--blue)"></i></div>
    <div class="meta"><span>Now ${fmtShort(s.current)} (${pct(s.currentPct)})</span><span>Target ${fmtShort(s.targetAmt)} (${s.target}%)</span></div></div>`;
  $('#rebActions', body).innerHTML = all.length ? html`
    <div class="summary-bar" style="margin-bottom:12px"><span>Buy <b style="color:var(--blue)">${fmt(sum(buys, s => s.diff))}</b> across ${buys.length}</span><span>Sell <b style="color:var(--accent)">${fmt(-sum(sells, s => s.diff))}</b> across ${sells.length}</span></div>
    <div class="grid cols-2" style="margin:0">${all.map(card)}</div>
    <div class="note">Indicative amounts from target weights. Tax and exit loads apply — check the Tax tab before selling.</div>` : html`<div class="empty up">Portfolio is within tolerance of every target.</div>`;
}

export function onAction(name) {
  if (currentSub !== 'rebalance') return false;
  if (name === 'matchCurrent') {
    let sum_ = 0, largest = null;
    for (const key of Object.keys(DEFAULT_TARGETS)) { targets[key] = Math.round((state.classMap[key] || 0) / state.total * 100); sum_ += targets[key]; if (!largest || (state.classMap[key] || 0) > (state.classMap[largest] || 0)) largest = key; }
    if (largest && sum_ !== 100) targets[largest] += 100 - sum_;
  } else if (name === 'resetTargets') targets = { ...DEFAULT_TARGETS };
  else if (name === 'calcActions') { renderActions(); return true; }
  else return false;
  renderRebalance($('#analysisBody', currentRoot));
  return true;
}

export function onInput(name, value, arg) {
  if (name === 'target') { targets[arg] = Number(value); refreshRebalance(); return true; }
  if (name === 'sip') { sipAmount = Math.max(0, Number(value) || 0); refreshRebalance(); return true; }
  return false;
}
