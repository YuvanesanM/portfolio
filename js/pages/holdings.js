import { state, sgbHoldings } from '../store.js';
import { ASSET_CLASSES, OWNERS } from '../data.js';
import { html, raw, fmt, fmtDate, pct, signed, sum, daysBetween, yearsSince, groupBy, $ } from '../util.js';
import { pageHead, subtabs, stat, classBadge, ownerBadge, gainText, allocRows, donutCard, empty, sortableTh, icon, kpi } from '../ui.js';
import { doughnut } from '../charts.js';

const filters = { q: '', owner: 'All', cls: 'All', sort: { key: 'value', asc: false } };
let currentRoot = null;

const TABS = [['all', 'All holdings'], ['fd', 'Fixed deposits'], ['sgb', 'Sovereign gold']];

export function render(root, { sub = 'all', query = {} } = {}) {
  currentRoot = root;
  Object.assign(filters, { cls: query.cls || 'All', owner: 'All', q: '' });
  root.innerHTML = html`
    ${pageHead('Holdings', `${state.holdings.filter(h => h.value > 0).length} positions across ${state.byClass.length} asset classes`, subtabs(TABS, sub, 'holdings'))}
    <div id="holdingsBody"></div>`;
  const body = root.querySelector('#holdingsBody');
  if (sub === 'fd') renderFD(body);
  else if (sub === 'sgb') renderSGB(body);
  else renderAll(body);
}

// ── All holdings ──────────────────────────────────────────────────────
function filtered() {
  const q = filters.q.trim().toLowerCase();
  let rows = state.holdings.filter(h =>
    (filters.owner === 'All' || h.owner === filters.owner) &&
    (filters.cls === 'All' || h.cls === filters.cls) &&
    (!q || `${h.name} ${h.account} ${ASSET_CLASSES[h.cls].label} ${h.owner} ${state.notes[h.id] || ''}`.toLowerCase().includes(q)));
  const { key, asc } = filters.sort;
  const val = h => key === 'gain' ? (h.cost ? h.value - h.cost : -Infinity) : key === 'name' ? h.name : key === 'cls' ? ASSET_CLASSES[h.cls].label : key === 'cost' ? h.cost : h.value;
  rows.sort((a, b) => { const x = val(a), y = val(b); const c = typeof x === 'string' ? x.localeCompare(y) : x - y; return asc ? c : -c; });
  return rows;
}

function renderAll(body) {
  const owners = ['All', ...Object.keys(OWNERS)];
  const classes = ['All', ...state.byClass.map(c => c.key)];
  body.innerHTML = html`
    <div class="card">
      <div class="toolbar">
        <div class="search" style="flex:1;min-width:180px;max-width:280px">${icon('search')}<input class="input" data-input="search" placeholder="Search holdings" value="${filters.q}"></div>
        <div class="pills" role="group" aria-label="Owner">${owners.map(o => html`<button class="pill" data-action="owner" data-arg="${o}" aria-pressed="${filters.owner === o}">${o}</button>`)}</div>
      </div>
      <div class="pills" role="group" aria-label="Asset class" style="margin-bottom:14px">${classes.map(c => html`<button class="pill" data-action="cls" data-arg="${c}" aria-pressed="${filters.cls === c}">${c === 'All' ? 'All types' : ASSET_CLASSES[c].short}</button>`)}</div>
      <div class="table-wrap" id="holdingsTable"></div>
    </div>`;
  renderTable();
}

function renderTable() {
  const rows = filtered();
  const total = sum(rows, h => h.value);
  const cost = sum(rows.filter(h => h.value > 0), h => h.cost);
  const s = filters.sort;
  $('#holdingsTable', currentRoot).innerHTML = rows.length ? html`
    <table class="tbl">
      <thead><tr>
        ${sortableTh('Holding', 'name', s)}${sortableTh('Type', 'cls', s)}<th>Owner</th>
        ${sortableTh('Cost', 'cost', s, 'right')}${sortableTh('Value', 'value', s, 'right')}${sortableTh('Gain', 'gain', s, 'right')}<th class="right">Weight</th>
      </tr></thead>
      <tbody>${rows.map(h => html`<tr>
        <td><span class="main-cell">${h.name}</span><span class="sub">${h.account}${h.qty ? ` · ${h.qty.toLocaleString('en-IN')} ${h.unit === 'g' ? 'g' : 'units'}${h.price != null ? ` @ ₹${h.price.toLocaleString('en-IN')}` : ''}` : ''}${h.mf ? ` · ${h.schemes} schemes` : ''}</span>
            ${state.notes[h.id] ? html`<span class="sub note-cell">${state.notes[h.id]}</span>` : ''}${h.overridden ? html`<span class="sub">Manual override · ${fmtDate(h.overridden)}</span>` : ''}</td>
        <td>${classBadge(h.cls)}</td>
        <td>${ownerBadge(h.owner)}</td>
        <td class="right muted">${h.cost ? fmt(h.cost) : '—'}</td>
        <td class="right main-cell">${h.value > 0 ? fmt(h.value) : html`<span class="muted">—</span>`}</td>
        <td class="right">${h.value > 0 ? gainText(h.value - h.cost, h.cost) : html`<span class="muted">—</span>`}</td>
        <td class="right muted">${h.value > 0 ? pct(h.value / state.total, 2) : '—'}</td>
      </tr>`)}</tbody>
      <tfoot><tr><td colspan="3">${rows.length} holding${rows.length === 1 ? '' : 's'}</td><td class="right">${fmt(cost)}</td><td class="right">${fmt(total)}</td><td class="right">${gainText(total - cost, cost)}</td><td class="right">${pct(total / state.total)}</td></tr></tfoot>
    </table>` : empty('No holdings match these filters.');
}

// ── Fixed deposits ────────────────────────────────────────────────────
function renderFD(body) {
  const fds = state.holdings.filter(h => h.cls === 'fd' && h.value > 0).sort((a, b) => b.value - a.value);
  const total = sum(fds, h => h.value);
  const banks = [...groupBy(fds, h => h.account)].map(([name, items]) => ({ name, value: sum(items, h => h.value) })).sort((a, b) => b.value - a.value);
  const owners = [...groupBy(fds, h => h.owner)].map(([name, items]) => ({ name, value: sum(items, h => h.value), color: OWNERS[name]?.color || '#999' })).sort((a, b) => b.value - a.value);
  const palette = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#14b8a6'];
  body.innerHTML = html`
    <div class="stats">
      ${stat({ label: 'Total deposits', value: fmt(total), sub: `${pct(total / state.total)} of net worth` })}
      ${stat({ label: 'Largest', value: fds[0] ? fmt(fds[0].value) : '—', sub: fds[0] ? `${fds[0].account} · ${fds[0].owner}` : '' })}
      ${stat({ label: 'Deposits', value: String(fds.length), sub: `${banks.length} banks` })}
    </div>
    <div class="grid cols-3-2">
      <div class="card"><div class="card-head"><h3>Deposits</h3></div><div class="table-wrap"><table class="tbl">
        <thead><tr><th>Bank</th><th>Holder</th><th class="right">Value</th><th class="right">Share</th><th class="right">Of net worth</th></tr></thead>
        <tbody>${fds.map(h => html`<tr><td class="main-cell">${h.account}</td><td>${ownerBadge(h.owner)}</td><td class="right main-cell">${fmt(h.value)}</td><td class="right muted">${pct(h.value / total)}</td><td class="right muted">${pct(h.value / state.total, 2)}</td></tr>`)}</tbody>
      </table></div></div>
      <div>
        ${donutCard('By bank', 'fdDonut', fmt(total), `${banks.length} banks`)}
        <div class="card" style="margin-top:var(--gap)"><div class="card-head"><h3>By holder</h3></div>${allocRows(owners, { total })}</div>
      </div>
    </div>`;
  doughnut(body.querySelector('#fdDonut'), { labels: banks.map(b => b.name), data: banks.map(b => b.value), colors: banks.map((_, i) => palette[i % palette.length]), total, legend: true });
}

// ── Sovereign gold bonds ──────────────────────────────────────────────
function renderSGB(body) {
  const sgbs = sgbHoldings().sort((a, b) => a.maturity < b.maturity ? -1 : 1);
  const total = sum(sgbs, h => h.value), cost = sum(sgbs, h => h.cost), grams = sum(sgbs, h => h.qty);
  const price = sgbs[0]?.price || 0;
  const upcoming = sgbs.map(h => ({ ...h, days: daysBetween(new Date().toISOString().slice(0, 10), h.maturity) })).filter(h => h.days > 0 && h.days <= 548);
  const next = upcoming[0];
  body.innerHTML = html`
    <div class="stats">
      ${stat({ label: 'Total value', value: fmt(total), sub: `${sgbs.length} tranches · gold @ ₹${price.toLocaleString('en-IN')}/g` })}
      ${stat({ label: 'Gold held', value: `${grams} g`, sub: 'Sovereign Gold Bonds' })}
      ${stat({ label: 'Cost basis', value: fmt(cost), sub: html`<span class="${total >= cost ? 'up' : 'down'}">${signed(total - cost)} unrealised</span>` })}
      ${stat({ label: 'Tax on maturity', value: '₹0', sub: 'Capital gains exempt at redemption', tone: 'up' })}
    </div>
    ${next ? html`<div class="alert">${icon('bell')}<div><b>${next.qty} g tranche matures on ${fmtDate(next.maturity)}</b> — ${next.days} days away. Worth ${fmt(next.value)}, gain of ${fmt(next.value - next.cost)} is tax free.${upcoming.length > 1 ? ` ${upcoming.length - 1} more tranche${upcoming.length > 2 ? 's' : ''} within 18 months.` : ''}</div></div>` : ''}
    <div class="grid cols-3-2">
      <div class="card"><div class="card-head"><h3>Tranches</h3></div><div class="table-wrap"><table class="tbl">
        <thead><tr><th>Series</th><th class="right">Grams</th><th>Matures</th><th class="right">Cost</th><th class="right">Value</th><th class="right">Gain</th></tr></thead>
        <tbody>${sgbs.map(h => html`<tr><td class="main-cell">${h.name}<span class="sub">Bought ${fmtDate(h.since)}</span></td><td class="right">${h.qty}</td><td>${fmtDate(h.maturity)}</td><td class="right muted">${fmt(h.cost)}</td><td class="right main-cell">${fmt(h.value)}</td><td class="right">${gainText(h.value - h.cost, h.cost)}</td></tr>`)}</tbody>
        <tfoot><tr><td>Total</td><td class="right">${grams}</td><td></td><td class="right">${fmt(cost)}</td><td class="right">${fmt(total)}</td><td class="right">${gainText(total - cost, cost)}</td></tr></tfoot>
      </table></div></div>
      <div class="card"><div class="card-head"><h3>Maturity timeline</h3><span class="muted">8-year tenure</span></div>
        ${sgbs.map(h => {
          const elapsed = Math.max(0, Math.min(1, daysBetween(h.since) / daysBetween(h.since, h.maturity)));
          const left = daysBetween(new Date().toISOString().slice(0, 10), h.maturity);
          return html`<div class="timeline-item ${left < 365 ? 'near' : ''}">
            <div class="top"><b>${h.qty} g · ${fmtDate(h.maturity)}</b><span class="muted">${left > 0 ? `${(left / 365.25).toFixed(1)} yrs left` : 'Matured'}</span></div>
            <div class="bar thin"><i style="width:${(elapsed * 100).toFixed(1)}%"></i></div>
            <div class="meta" style="margin-top:6px"><span>${fmt(h.value)}</span><span class="${h.value >= h.cost ? 'up' : 'down'}">${signed(h.value - h.cost)}</span></div>
          </div>`;
        })}
      </div>
    </div>`;
}

export function onAction(name, arg) {
  if (name === 'owner') { filters.owner = arg; }
  else if (name === 'cls') { filters.cls = arg; }
  else if (name === 'sort') { if (filters.sort.key === arg) filters.sort.asc = !filters.sort.asc; else filters.sort = { key: arg, asc: arg === 'name' || arg === 'cls' }; renderTable(); return true; }
  else return false;
  renderAll($('#holdingsBody', currentRoot));
  return true;
}

export function onInput(name, value) {
  if (name !== 'search') return false;
  filters.q = value;
  renderTable();
  return true;
}
