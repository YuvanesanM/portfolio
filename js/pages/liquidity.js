import { state, liquidityDetail, sgbHoldings } from '../store.js';
import { html, fmt, fmtDate, pct, sum, daysBetween, todayISO, $ } from '../util.js';
import { pageHead, stat, classBadge, allocRows, icon } from '../ui.js';
import { doughnut } from '../charts.js';

export function render(root) {
  const buckets = liquidityDetail();
  const sgbs = sgbHoldings().sort((a, b) => a.maturity < b.maturity ? -1 : 1);
  const today = todayISO();
  root.innerHTML = html`
    ${pageHead('Liquidity', 'How quickly capital can be accessed, bucketed by asset class')}
    <div class="stats">${buckets.map(b => stat({ label: b.label, value: fmt(b.value), color: b.color, iconName: 'droplet', sub: `${pct(b.pct)} · ${b.classes.map(c => c.short).join(', ') || 'none'}` }))}</div>
    <div class="grid cols-2-3">
      <div class="card"><div class="card-head"><h3>Split</h3></div>
        <div class="chart donut donut-wrap"><canvas id="liqDonut" role="img" aria-label="Liquidity split"></canvas><div class="donut-center"><b>${fmt(state.total)}</b><span>net worth</span></div></div>
        <div class="stack-bar" style="margin-top:14px">${buckets.map(b => html`<i style="width:${(b.pct * 100).toFixed(2)}%;background:${b.color}" title="${b.label} ${pct(b.pct)}"></i>`)}</div>
        <div class="note">Each asset class sits in exactly one bucket, so the three totals add up to net worth. The bucket is a property of the class (data.js → ASSET_CLASSES.liquidity), not of individual holdings.</div></div>
      <div class="card"><div class="card-head"><h3>What is in each bucket</h3></div>
        ${buckets.map(b => html`<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><b style="color:${b.color}">${b.label}</b><span class="muted small">${b.desc}</span></div>
          ${b.classes.length ? allocRows(b.classes.map(c => ({ key: c.key, name: c.label, value: c.value, color: c.color })), { total: b.value, action: 'gotoClass' }) : html`<div class="muted small">Nothing in this bucket.</div>`}</div>`)}</div>
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Known maturities</h3><span class="muted">from recorded dates only</span></div>
        <div class="table-wrap"><table class="tbl compact"><thead><tr><th>Holding</th><th>Matures</th><th class="right">In</th><th class="right">Value</th></tr></thead>
        <tbody>${sgbs.map(h => { const dd = daysBetween(today, h.maturity); return html`<tr><td><span class="main-cell">${h.name}</span><span class="sub">${h.qty} g · tax free at maturity</span></td><td>${fmtDate(h.maturity)}</td><td class="right ${dd < 365 ? 'gold' : 'muted'}">${dd > 0 ? `${(dd / 365.25).toFixed(1)} y` : 'Matured'}</td><td class="right">${fmt(h.value)}</td></tr>`; })}</tbody>
        <tfoot><tr><td colspan="3">${sgbs.length} tranches</td><td class="right">${fmt(sum(sgbs, h => h.value))}</td></tr></tfoot></table></div></div>
      <div class="card"><div class="card-head"><h3>Not recorded</h3></div>
        <div class="kv">
          <div><span>Fixed deposits</span><b>Maturity dates not stored</b></div>
          <div><span>PMS / AIF</span><b>Lock-in and exit terms not stored</b></div>
          <div><span>SSY accounts</span><b>Maturity follows the child's age; not stored</b></div>
          <div><span>Unlisted shares</span><b>Buyer-dependent; no exit window</b></div>
          <div><span>Insurance / NPS</span><b>Policy and retirement terms not stored</b></div>
        </div>
        <div class="note">${icon('info')} These are shown as unknown rather than guessed. Add a <code>maturity</code> field to a holding in data.js to have it appear in the maturity table.</div></div>
    </div>`;
  doughnut($('#liqDonut', root), { labels: buckets.map(b => b.label), data: buckets.map(b => b.value), colors: buckets.map(b => b.color), total: state.total, legend: true, cutout: '68%' });
}

export function onAction(name, arg) {
  if (name === 'gotoClass') { location.hash = arg === 'mf' ? 'mf' : `assets/${arg}`; return true; }
  return false;
}
