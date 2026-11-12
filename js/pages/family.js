import { state } from '../store.js';
import { OWNERS, MF_SCHEMES } from '../data.js';
import { html, fmt, pct, sum, groupBy } from '../util.js';
import { stat, allocRows, donutCard, classBadge, ownerBadge, pageHead } from '../ui.js';
import { doughnut } from '../charts.js';

export function render(root) {
  // Split the two MF rows into per-owner scheme totals so the family view matches CAS ownership.
  const rows = state.holdings.filter(h => h.value > 0 && !h.mf).map(h => ({ owner: h.owner, name: h.name, account: h.account, cls: h.cls, value: h.value }));
  for (const [owner, items] of groupBy(MF_SCHEMES, s => s.owner)) {
    rows.push({ owner, name: 'Mutual funds', account: `${items.length} schemes`, cls: 'mf', value: sum(items, s => s.value) });
  }
  const members = Object.keys(OWNERS).map(name => ({ name, color: OWNERS[name].color, note: OWNERS[name].note, value: sum(rows.filter(r => r.owner === name), r => r.value) }));
  const grand = sum(members, m => m.value);

  root.innerHTML = html`
    ${pageHead('Family', 'Wealth by member, with mutual funds split by folio owner')}
    <div class="stats">
      ${members.map(m => stat({ label: m.name, value: fmt(m.value), color: m.color, iconName: 'users', sub: `${pct(m.value / grand)} of family${m.note ? ` · ${m.note}` : ''}` }))}
    </div>
    <div class="grid cols-2">
      ${donutCard('Family split', 'famDonut', fmt(grand), 'combined')}
      <div class="card"><div class="card-head"><h3>By member</h3></div>${allocRows(members, { total: grand })}</div>
    </div>
    <div class="card"><div class="card-head"><h3>Holdings by owner</h3></div><div class="table-wrap"><table class="tbl">
      <thead><tr><th>Owner</th><th>Holding</th><th>Type</th><th class="right">Value</th><th class="right">Of owner</th><th class="right">Of family</th></tr></thead>
      <tbody>${rows.sort((a, b) => a.owner === b.owner ? b.value - a.value : members.findIndex(m => m.name === a.owner) - members.findIndex(m => m.name === b.owner)).map(r => {
        const ownerTotal = members.find(m => m.name === r.owner)?.value || 1;
        return html`<tr><td>${ownerBadge(r.owner)}</td><td><span class="main-cell">${r.name}</span><span class="sub">${r.account}</span></td><td>${classBadge(r.cls)}</td><td class="right main-cell">${fmt(r.value)}</td><td class="right muted">${pct(r.value / ownerTotal)}</td><td class="right muted">${pct(r.value / grand, 2)}</td></tr>`;
      })}</tbody>
    </table></div></div>`;

  doughnut(root.querySelector('#famDonut'), { labels: members.map(m => m.name), data: members.map(m => m.value), colors: members.map(m => m.color), total: grand, legend: true });
}
