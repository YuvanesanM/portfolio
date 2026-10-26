import { state, mfTotals } from '../store.js';
import { MF_SCHEMES, MF_HOUSE_COLORS, MF_CAT_COLORS, CAS_AS_OF } from '../data.js';
import { html, fmt, fmtDate, pct, signed, signedPct, sum, groupBy, $ } from '../util.js';
import { stat, kpi, allocRows, donutCard, ownerBadge, sortableTh, gainText, pageHead } from '../ui.js';
import { doughnut, bars } from '../charts.js';

const filters = { house: 'All', owner: 'All', sort: { key: 'value', asc: false } };
let currentRoot = null;

export function render(root) {
  currentRoot = root;
  const total = sum(MF_SCHEMES, s => s.value), cost = sum(MF_SCHEMES, s => s.cost), gain = total - cost;
  const t = mfTotals();
  const houses = [...groupBy(MF_SCHEMES, s => s.house)].map(([name, items]) => ({ name, value: sum(items, s => s.value), color: MF_HOUSE_COLORS[name] || '#999' })).sort((a, b) => b.value - a.value);
  const cats = [...groupBy(MF_SCHEMES, s => s.cat)].map(([name, items]) => ({ name, value: sum(items, s => s.value), color: MF_CAT_COLORS[name] || '#999' })).sort((a, b) => b.value - a.value);
  const largest = [...MF_SCHEMES].sort((a, b) => b.value - a.value)[0];

  root.innerHTML = html`
    ${pageHead('Mutual Funds', `${MF_SCHEMES.length} schemes · ${houses.length} fund houses · CAS as of ${fmtDate(CAS_AS_OF)}`)}
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">Mutual fund portfolio</span>
        <span class="hero-value">${fmt(total)}</span>
        <div class="hero-sub"><span>${pct(total / state.total)} of net worth</span><span class="${gain >= 0 ? 'up' : 'down'}">${signed(gain)} (${signedPct(gain / cost)})</span></div>
      </div>
      <div class="card hero-side">
        ${kpi('Cost basis', fmt(cost))}
        ${kpi('Unrealised gain', signed(gain), gain >= 0 ? 'up' : 'down')}
        ${kpi('Yuvan', fmt(t.Yuvan.value))}
        ${kpi('Ramyaa', fmt(t.Ramyaa.value))}
      </div>
    </div>
    <div class="stats">
      ${stat({ label: "Yuvan's schemes", value: String(t.Yuvan.count), sub: `${fmt(t.Yuvan.value)} · ${pct(t.Yuvan.value / total)}` })}
      ${stat({ label: "Ramyaa's schemes", value: String(t.Ramyaa.count), sub: `${fmt(t.Ramyaa.value)} · ${pct(t.Ramyaa.value / total)}` })}
      ${stat({ label: 'Largest holding', value: fmt(largest.value), sub: `${largest.house} ${largest.scheme}` })}
      ${stat({ label: 'Categories', value: String(cats.length), sub: `Top: ${cats[0].name} ${pct(cats[0].value / total)}` })}
    </div>
    <div class="grid cols-3">
      <div class="card"><div class="card-head"><h3>By fund house</h3></div><div class="chart"><canvas id="mfHouses"></canvas></div></div>
      ${donutCard('By category', 'mfCats', String(cats.length), 'categories')}
      <div class="card"><div class="card-head"><h3>Category split</h3></div>${allocRows(cats.slice(0, 8), { total })}</div>
    </div>
    <div class="card">
      <div class="card-head"><h3>All schemes</h3>
        <div class="pills">${['All', 'Yuvan', 'Ramyaa'].map(o => html`<button class="pill" data-action="mfOwner" data-arg="${o}" aria-pressed="${filters.owner === o}">${o}</button>`)}</div>
      </div>
      <div class="pills" style="margin-bottom:14px">${['All', ...houses.map(h => h.name)].map(h => html`<button class="pill" data-action="mfHouse" data-arg="${h}" aria-pressed="${filters.house === h}">${h}</button>`)}</div>
      <div class="table-wrap" id="mfTable"></div>
    </div>`;

  bars(root.querySelector('#mfHouses'), { labels: houses.map(h => h.name), data: houses.map(h => h.value), colors: houses.map(h => h.color), horizontal: true, tip: c => `${fmt(c.raw)} · ${pct(c.raw / total)}` });
  doughnut(root.querySelector('#mfCats'), { labels: cats.map(c => c.name), data: cats.map(c => c.value), colors: cats.map(c => c.color), total });
  renderTable();
}

function renderTable() {
  const total = sum(MF_SCHEMES, s => s.value);
  const { key, asc } = filters.sort;
  const val = s => key === 'scheme' ? `${s.house} ${s.scheme}` : key === 'cat' ? s.cat : key === 'cost' ? s.cost : key === 'gain' ? s.value - s.cost : key === 'ret' ? (s.value - s.cost) / s.cost : s.value;
  const rows = MF_SCHEMES
    .filter(s => (filters.house === 'All' || s.house === filters.house) && (filters.owner === 'All' || s.owner === filters.owner))
    .sort((a, b) => { const x = val(a), y = val(b); const c = typeof x === 'string' ? x.localeCompare(y) : x - y; return asc ? c : -c; });
  const subTotal = sum(rows, s => s.value), subCost = sum(rows, s => s.cost);
  $('#mfTable', currentRoot).innerHTML = html`<table class="tbl compact">
    <thead><tr><th>#</th>${sortableTh('Scheme', 'scheme', filters.sort)}<th>Owner</th>${sortableTh('Category', 'cat', filters.sort)}${sortableTh('Cost', 'cost', filters.sort, 'right')}${sortableTh('Value', 'value', filters.sort, 'right')}${sortableTh('Gain', 'gain', filters.sort, 'right')}<th class="right">Of MF</th></tr></thead>
    <tbody>${rows.map((s, i) => html`<tr>
      <td class="muted">${i + 1}</td>
      <td><span class="main-cell">${s.house} ${s.scheme}</span><span class="sub">${s.reg}${s.units ? ` · ${s.units} units` : ''}</span></td>
      <td>${ownerBadge(s.owner)}</td>
      <td><span class="badge"><i class="dot" style="background:${MF_CAT_COLORS[s.cat] || '#999'}"></i>${s.cat}</span></td>
      <td class="right muted">${fmt(s.cost)}</td>
      <td class="right main-cell">${fmt(s.value)}</td>
      <td class="right">${gainText(s.value - s.cost, s.cost)}</td>
      <td class="right muted">${pct(s.value / total)}</td>
    </tr>`)}</tbody>
    <tfoot><tr><td></td><td>${rows.length} schemes</td><td></td><td></td><td class="right">${fmt(subCost)}</td><td class="right">${fmt(subTotal)}</td><td class="right">${gainText(subTotal - subCost, subCost)}</td><td class="right">${pct(subTotal / total)}</td></tr></tfoot>
  </table>`;
}

export function onAction(name, arg) {
  if (name === 'mfOwner') filters.owner = arg;
  else if (name === 'mfHouse') filters.house = arg;
  else if (name === 'sort') { if (filters.sort.key === arg) filters.sort.asc = !filters.sort.asc; else filters.sort = { key: arg, asc: arg === 'scheme' || arg === 'cat' }; renderTable(); return true; }
  else return false;
  currentRoot.querySelectorAll('[data-action="mfOwner"],[data-action="mfHouse"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.arg === (b.dataset.action === 'mfOwner' ? filters.owner : filters.house))));
  renderTable();
  return true;
}
