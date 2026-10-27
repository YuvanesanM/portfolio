import { state } from '../store.js';
import { ASSET_CLASSES, DEFAULT_TARGETS } from '../data.js';
import { html, fmt, fmtShort, pct, signed, sum, clamp, $ } from '../util.js';
import { pageHead, kpi, allocRows, classBadge, icon } from '../ui.js';

let targets = { ...DEFAULT_TARGETS };
let sipAmount = 50000;
const TOLERANCE = 5000;
let root_ = null;

export const getTargets = () => ({ ...targets });
export function setTargets(map) {
  for (const key of Object.keys(DEFAULT_TARGETS)) targets[key] = Math.max(0, Math.round(Number(map[key]) || 0));
}

const classState = key => {
  const current = state.classMap[key] || 0, target = targets[key] || 0;
  const targetAmt = target / 100 * state.total, diff = targetAmt - current;
  return { key, current, currentPct: state.total ? current / state.total : 0, target, targetAmt, diff, status: Math.abs(diff) < TOLERANCE ? 'on' : diff > 0 ? 'under' : 'over' };
};
const statusLabel = s => s.status === 'on' ? html`<span class="up">On target</span>` : s.status === 'under' ? html`<span style="color:var(--blue)">Buy ${fmtShort(s.diff)}</span>` : html`<span class="gold">Sell ${fmtShort(-s.diff)}</span>`;

export function render(root) {
  root_ = root;
  root.innerHTML = html`
    ${pageHead('Rebalance', 'Compare current weights with your target allocation', html`<div class="pills">
      <button class="btn small" data-action="matchCurrent">Match current</button>
      <button class="btn small" data-action="resetTargets">Reset defaults</button>
      <button class="btn small btn-primary" data-action="calcActions">Calculate actions</button></div>`)}
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">${icon('scale')} Target allocation</span>
        <span class="hero-value" id="rebTotalPct"></span>
        <div class="hero-sub"><span>Drag sliders to set targets. Blue bar is current weight, gold marks the target.</span></div>
      </div>
      <div class="card hero-side" id="rebCounts"></div>
    </div>
    <div class="card" style="margin-bottom:var(--gap)">
      <div class="card-head"><h3>Targets</h3><span class="muted">tolerance ±${fmt(TOLERANCE)}</span></div>
      ${Object.keys(DEFAULT_TARGETS).map(key => { const c = ASSET_CLASSES[key], s = classState(key);
        return html`<div class="reb-row" data-row="${key}">
          <span class="name"><i class="dot" style="background:${c.color}"></i>${c.label}</span>
          <div class="bars"><div class="bar thin"><i style="width:${(s.currentPct * 100).toFixed(1)}%;background:var(--blue)"></i></div>
            <input class="range" type="range" min="0" max="60" step="1" value="${s.target}" data-input="target" data-arg="${key}" aria-label="${c.label} target percent"></div>
          <span class="cell muted">${pct(s.currentPct)}<small>now</small></span>
          <span class="cell tgt gold">${s.target}%<small>target</small></span>
          <span class="cell act">${statusLabel(s)}</span></div>`; })}
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Actions</h3></div><div id="rebActions"><div class="empty">Set targets, then press “Calculate actions”.</div></div></div>
      <div class="card"><div class="card-head"><h3>Monthly SIP split</h3><span class="muted">towards underweight classes</span></div>
        <div class="field" style="max-width:220px;margin-bottom:12px"><label>Monthly amount (₹)</label><input class="input num" type="number" min="1000" step="1000" value="${sipAmount}" data-input="sip"></div>
        <div id="sipRows"></div></div>
    </div>
    <div class="card"><div class="card-head"><h3>Comparison</h3></div><div class="table-wrap" id="rebTable"></div></div>`;
  refresh();
}

function refresh() {
  const all = Object.keys(DEFAULT_TARGETS).map(classState);
  const totalPct = sum(all, s => s.target);
  const counts = { over: 0, under: 0, on: 0, move: 0 };
  for (const s of all) { counts[s.status]++; if (s.status === 'over') counts.move += -s.diff; }
  const tp = $('#rebTotalPct', root_);
  tp.textContent = `${totalPct}%`; tp.className = `hero-value ${totalPct === 100 ? 'up' : 'down'}`;
  $('#rebCounts', root_).innerHTML = html`${kpi('Overweight', String(counts.over), 'down')}${kpi('Underweight', String(counts.under))}${kpi('On target', String(counts.on), 'up')}${kpi('To move', fmt(counts.move))}`;
  for (const s of all) {
    const row = root_.querySelector(`[data-row="${s.key}"]`);
    if (!row) continue;
    row.querySelector('.tgt').innerHTML = html`${s.target}%<small>target</small>`;
    row.querySelector('.act').innerHTML = statusLabel(s);
  }
  $('#rebTable', root_).innerHTML = html`<table class="tbl compact">
    <thead><tr><th>Class</th><th class="right">Current</th><th class="right">Now</th><th class="right">Target</th><th class="right">Target ₹</th><th class="right">Difference</th></tr></thead>
    <tbody>${all.map(s => html`<tr><td>${classBadge(s.key)}</td><td class="right">${fmt(s.current)}</td><td class="right muted">${pct(s.currentPct)}</td><td class="right gold">${s.target}%</td><td class="right muted">${fmt(s.targetAmt)}</td><td class="right">${s.status === 'on' ? html`<span class="muted">—</span>` : html`<span style="color:${s.diff > 0 ? 'var(--blue)' : 'var(--accent)'}">${signed(s.diff)}</span>`}</td></tr>`)}</tbody>
    <tfoot><tr><td>Total</td><td class="right">${fmt(state.total)}</td><td class="right">100%</td><td class="right ${totalPct === 100 ? 'up' : 'down'}">${totalPct}%</td><td></td><td></td></tr></tfoot></table>`;
  const buys = all.filter(s => s.diff > TOLERANCE && s.target > 0);
  const short = sum(buys, s => s.diff);
  $('#sipRows', root_).innerHTML = buys.length ? allocRows(buys.sort((a, b) => b.diff - a.diff).map(s => ({ name: ASSET_CLASSES[s.key].label, value: Math.round(s.diff / short * sipAmount), color: ASSET_CLASSES[s.key].color })), { total: sipAmount }) : html`<div class="empty">Nothing is underweight — no SIP reallocation needed.</div>`;
}

function renderActions() {
  const all = Object.keys(DEFAULT_TARGETS).map(classState).filter(s => s.status !== 'on').sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const buys = all.filter(s => s.diff > 0), sells = all.filter(s => s.diff < 0);
  const card = s => html`<div class="action-card">
    <span class="tag" style="color:${s.diff > 0 ? 'var(--blue)' : 'var(--accent)'}">${s.diff > 0 ? 'BUY' : 'SELL'} · ${ASSET_CLASSES[s.key].label}</span>
    <div class="amt">${fmt(Math.abs(s.diff))}</div>
    <div class="bar thin"><i style="width:${clamp(s.current / Math.max(s.current, s.targetAmt) * 100, 0, 100).toFixed(1)}%;background:var(--blue)"></i></div>
    <div class="meta"><span>Now ${fmtShort(s.current)} (${pct(s.currentPct)})</span><span>Target ${fmtShort(s.targetAmt)} (${s.target}%)</span></div></div>`;
  $('#rebActions', root_).innerHTML = all.length ? html`
    <div class="summary-bar" style="margin-bottom:12px"><span>Buy <b style="color:var(--blue)">${fmt(sum(buys, s => s.diff))}</b> across ${buys.length}</span><span>Sell <b class="gold">${fmt(-sum(sells, s => s.diff))}</b> across ${sells.length}</span></div>
    <div class="grid cols-2" style="margin:0">${all.map(card)}</div>
    <div class="note">Indicative amounts from target weights. Tax and exit loads apply — check the Tax page before selling.</div>` : html`<div class="empty up">Portfolio is within tolerance of every target.</div>`;
}

export function onAction(name) {
  if (name === 'matchCurrent') {
    let s = 0, largest = null;
    for (const key of Object.keys(DEFAULT_TARGETS)) { targets[key] = Math.round((state.classMap[key] || 0) / state.total * 100); s += targets[key]; if (!largest || (state.classMap[key] || 0) > (state.classMap[largest] || 0)) largest = key; }
    if (largest && s !== 100) targets[largest] += 100 - s;
  } else if (name === 'resetTargets') targets = { ...DEFAULT_TARGETS };
  else if (name === 'calcActions') { renderActions(); return true; }
  else return false;
  render(root_);
  return true;
}
export function onInput(name, value, arg) {
  if (name === 'target') { targets[arg] = Number(value); refresh(); return true; }
  if (name === 'sip') { sipAmount = Math.max(0, Number(value) || 0); refresh(); return true; }
  return false;
}
