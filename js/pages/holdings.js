import { state } from '../store.js';
import { ASSET_CLASSES, OWNERS } from '../data.js';
import { html, fmt, fmtDate, pct, sum, $ } from '../util.js';
import { pageHead, classBadge, ownerBadge, gainText, empty, sortableTh, icon, kpi } from '../ui.js';

const filters = { q: '', owner: 'All', cls: 'All', sort: { key: 'value', asc: false } };
let root_ = null;

export function render(root, { query = {} } = {}) {
  root_ = root;
  Object.assign(filters, { cls: query.cls && ASSET_CLASSES[query.cls] ? query.cls : 'All', owner: query.owner && OWNERS[query.owner] ? query.owner : 'All', q: '' });
  const owners = ['All', ...Object.keys(OWNERS)];
  const classes = ['All', ...state.byClass.map(c => c.key)];
  const active = state.holdings.filter(h => h.value > 0);
  root.innerHTML = html`
    ${pageHead('Portfolio', `${active.length} positions · ${state.byClass.length} asset classes · ${Object.keys(OWNERS).length} owners`)}
    <div class="card">
      <div class="toolbar">
        <div class="search" style="flex:1;min-width:180px;max-width:300px">${icon('search')}<input class="input" data-input="search" placeholder="Search holdings, accounts, notes" value="${filters.q}" aria-label="Search holdings"></div>
        <div class="pills" role="group" aria-label="Owner">${owners.map(o => html`<button class="pill" data-action="owner" data-arg="${o}" aria-pressed="${filters.owner === o}">${o}</button>`)}</div>
      </div>
      <div class="pills" role="group" aria-label="Asset class" style="margin-bottom:14px">${classes.map(c => html`<button class="pill" data-action="cls" data-arg="${c}" aria-pressed="${filters.cls === c}">${c === 'All' ? 'All types' : ASSET_CLASSES[c].short}</button>`)}</div>
      <div class="table-wrap" id="holdingsTable"></div>
    </div>`;
  renderTable();
}

function filtered() {
  const q = filters.q.trim().toLowerCase();
  const rows = state.holdings.filter(h =>
    (filters.owner === 'All' || h.owner === filters.owner) &&
    (filters.cls === 'All' || h.cls === filters.cls) &&
    (!q || `${h.name} ${h.account} ${ASSET_CLASSES[h.cls].label} ${h.owner} ${state.notes[h.id] || ''}`.toLowerCase().includes(q)));
  const { key, asc } = filters.sort;
  const val = h => key === 'gain' ? (h.cost && h.value > 0 ? h.value - h.cost : -Infinity) : key === 'name' ? h.name : key === 'cls' ? ASSET_CLASSES[h.cls].label : key === 'cost' ? h.cost : h.value;
  rows.sort((a, b) => { const x = val(a), y = val(b); const c = typeof x === 'string' ? x.localeCompare(y) : x - y; return asc ? c : -c; });
  return rows;
}

function renderTable() {
  const rows = filtered();
  const total = sum(rows, h => h.value);
  const cost = sum(rows.filter(h => h.value > 0), h => h.cost);
  const s = filters.sort;
  $('#holdingsTable', root_).innerHTML = rows.length ? html`
    <table class="tbl">
      <thead><tr>
        ${sortableTh('Holding', 'name', s)}${sortableTh('Type', 'cls', s)}<th>Owner</th>
        ${sortableTh('Cost', 'cost', s, 'right')}${sortableTh('Value', 'value', s, 'right')}${sortableTh('Gain', 'gain', s, 'right')}<th class="right">Weight</th>
      </tr></thead>
      <tbody>${rows.map(h => html`<tr>
        <td><span class="main-cell">${h.name}</span><span class="sub">${h.account}${h.qty ? ` · ${h.qty.toLocaleString('en-IN')} ${h.unit === 'g' ? 'g' : 'units'}${h.price != null ? ` @ ₹${h.price.toLocaleString('en-IN')}` : ''}` : ''}${h.mf ? ` · ${h.schemes} schemes` : ''}</span>
            ${state.notes[h.id] ? html`<span class="sub note-cell">${state.notes[h.id]}</span>` : ''}${h.overridden ? html`<span class="sub">Manual override · ${fmtDate(h.overridden)}</span>` : ''}${h.value === 0 ? html`<span class="sub">Closed / no value</span>` : ''}</td>
        <td>${classBadge(h.cls)}</td>
        <td>${ownerBadge(h.owner)}</td>
        <td class="right muted">${h.cost ? fmt(h.cost) : '—'}</td>
        <td class="right main-cell">${h.value > 0 ? fmt(h.value) : html`<span class="muted">—</span>`}</td>
        <td class="right">${h.value > 0 && h.cost ? gainText(h.value - h.cost, h.cost) : html`<span class="muted">—</span>`}</td>
        <td class="right muted">${h.value > 0 ? pct(h.value / state.total, 2) : '—'}</td>
      </tr>`)}</tbody>
      <tfoot><tr><td colspan="3">${rows.length} holding${rows.length === 1 ? '' : 's'}</td><td class="right">${fmt(cost)}</td><td class="right">${fmt(total)}</td><td class="right">${gainText(total - cost, cost)}</td><td class="right">${pct(total / state.total)}</td></tr></tfoot>
    </table>` : empty('No holdings match these filters.');
}

export function onAction(name, arg) {
  if (name === 'owner') filters.owner = arg;
  else if (name === 'cls') filters.cls = arg;
  else if (name === 'sort') { if (filters.sort.key === arg) filters.sort.asc = !filters.sort.asc; else filters.sort = { key: arg, asc: arg === 'name' || arg === 'cls' }; renderTable(); return true; }
  else return false;
  root_.querySelectorAll('[data-action="owner"],[data-action="cls"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.arg === (b.dataset.action === 'owner' ? filters.owner : filters.cls))));
  renderTable();
  return true;
}
export function onInput(name, value) {
  if (name !== 'search') return false;
  filters.q = value; renderTable(); return true;
}
