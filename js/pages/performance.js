import { state, activeHoldings, previousSnapshot } from '../store.js';
import { html, fmt, fmtDate, fmtMonth, pct, signed, signedPct, sum, yearsSince, estimateXIRR, parseISO, todayISO, $ } from '../util.js';
import { pageHead, kpi, classBadge, ownerBadge, gainText, seg, empty, icon } from '../ui.js';
import { line, bars } from '../charts.js';

const PERIODS = [['6m', '6M'], ['1y', '1Y'], ['2y', '2Y'], ['all', 'All']];
let period = 'all', root_ = null;

function windowStart() {
  const d = new Date();
  if (period === '6m') d.setMonth(d.getMonth() - 6);
  else if (period === '1y') d.setFullYear(d.getFullYear() - 1);
  else if (period === '2y') d.setFullYear(d.getFullYear() - 2);
  else return '0000-00-00';
  return d.toISOString().slice(0, 10);
}

export function render(root) {
  root_ = root;
  const items = activeHoldings().filter(h => h.cost > 0);
  const cost = sum(items, h => h.cost), value = sum(items, h => h.value), gain = value - cost;
  const xirr = estimateXIRR(items);
  const classes = state.byClass.map(c => {
    const its = c.items.filter(h => h.value > 0 && h.cost > 0);
    const cv = sum(its, h => h.value), cc = sum(its, h => h.cost);
    return { ...c, value: cv, cost: cc, gain: cv - cc, xirr: estimateXIRR(its) };
  }).filter(c => c.cost > 0).sort((a, b) => b.gain - a.gain);

  root.innerHTML = html`
    ${pageHead('Performance', 'Portfolio value over time, and unrealised returns against recorded cost')}
    <div class="card" style="margin-bottom:var(--gap)">
      <div class="card-head"><h3>Net worth over time</h3><div class="actions" id="perfSeg">${seg(PERIODS, period, 'period')}</div></div>
      <div id="perfHistory"></div>
    </div>

    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">${icon('trend')} Unrealised gain</span>
        <span class="hero-value ${gain >= 0 ? 'up' : 'down'}">${signed(gain)}</span>
        <div class="hero-sub"><span>${signedPct(gain / cost)} absolute on ${fmt(cost)} recorded cost</span><span class="sep">·</span><span class="muted">${items.length} positions with a cost basis</span></div>
        <div class="hero-meta">
          <div><span>Current value</span><b>${fmt(value)}</b></div>
          <div><span>Est. XIRR</span><b class="${xirr >= 0 ? 'up' : 'down'}">${xirr != null ? `${signedPct(xirr)} p.a.` : '—'}</b></div>
          <div><span>Best class</span><b>${classes[0] ? `${classes[0].short} ${signed(classes[0].gain)}` : '—'}</b></div>
          <div><span>Weakest class</span><b>${classes.length ? `${classes[classes.length - 1].short} ${signed(classes[classes.length - 1].gain)}` : '—'}</b></div>
        </div>
      </div>
      <div class="card"><div class="card-head"><h3>Gain by asset class</h3></div><div class="chart" style="height:220px"><canvas id="perfClass" role="img" aria-label="Unrealised gain by asset class"></canvas></div></div>
    </div>

    <div class="alert info">${icon('info')}<div><b>Valuation change ≠ return.</b> The history above tracks portfolio value, which includes new money and withdrawals. The gains below compare current value to recorded purchase cost. XIRR is approximated from each holding's weighted holding period; SIPs and staggered purchases will differ. No benchmark comparison is shown because no benchmark series is stored.</div></div>

    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Return by asset class</h3><span class="muted">absolute · est. XIRR</span></div><div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>Class</th><th class="right">Cost</th><th class="right">Value</th><th class="right">Gain</th><th class="right">XIRR</th></tr></thead>
        <tbody>${classes.map(c => html`<tr><td>${classBadge(c.key)}</td><td class="right muted">${fmt(c.cost)}</td><td class="right">${fmt(c.value)}</td><td class="right">${gainText(c.gain, c.cost)}</td><td class="right ${c.xirr == null ? 'muted' : c.xirr >= 0 ? 'up' : 'down'}">${c.xirr == null ? '—' : signedPct(c.xirr)}</td></tr>`)}</tbody>
      </table></div></div>
      <div class="card"><div class="card-head"><h3>Snapshot history</h3><span class="muted">${state.snapshots.length} dated values</span></div><div class="table-wrap"><table class="tbl compact">
        <thead><tr><th>Date</th><th class="right">Net worth</th><th class="right">Change</th><th class="right">Since first</th></tr></thead>
        <tbody>${[...state.snapshots].reverse().map((s, i, arr) => { const p = arr[i + 1]; const d = p ? (s.value - p.value) / p.value : null; const first = state.snapshots[0];
          return html`<tr><td class="main-cell">${fmtDate(s.date)}</td><td class="right">${fmt(s.value)}</td><td class="right ${d == null ? 'muted' : d >= 0 ? 'up' : 'down'}">${d == null ? '—' : signedPct(d)}</td><td class="right muted">${signedPct(s.value / first.value - 1, 0)}</td></tr>`; })}</tbody>
      </table></div></div>
    </div>

    <div class="card"><div class="card-head"><h3>Holding-level returns</h3><span class="muted">sorted by gain</span></div><div class="table-wrap"><table class="tbl compact">
      <thead><tr><th>Holding</th><th>Type</th><th>Owner</th><th class="right">Cost</th><th class="right">Value</th><th class="right">Gain</th><th class="right">Held</th></tr></thead>
      <tbody>${[...items].sort((a, b) => (b.value - b.cost) - (a.value - a.cost)).map(h => html`<tr>
        <td><span class="main-cell">${h.name}</span><span class="sub">${h.account}</span></td><td>${classBadge(h.cls)}</td><td>${ownerBadge(h.owner)}</td>
        <td class="right muted">${fmt(h.cost)}</td><td class="right main-cell">${fmt(h.value)}</td><td class="right">${gainText(h.value - h.cost, h.cost)}</td><td class="right muted">${yearsSince(h.since).toFixed(1)} y</td></tr>`)}</tbody>
    </table></div></div>`;

  renderHistory();
  bars($('#perfClass', root), { labels: classes.map(c => c.short), data: classes.map(c => c.gain), colors: classes.map(c => c.gain >= 0 ? '#3dd68c' : '#ff6b75'), horizontal: true, tip: c => signed(c.raw) });
}

function renderHistory() {
  const el = $('#perfHistory', root_);
  const start = windowStart();
  const snaps = state.snapshots.filter(s => s.date >= start);
  if (snaps.length < 2) { el.innerHTML = empty(`Only ${snaps.length} snapshot${snaps.length === 1 ? '' : 's'} in this window. Choose a longer period or save more valuations.`, 'Not enough history'); return; }
  const first = snaps[0], last = snaps[snaps.length - 1];
  const d = last.value - first.value;
  const years = (parseISO(last.date) - parseISO(first.date)) / 31557600000;
  const cagr = years > 0.5 ? Math.pow(last.value / first.value, 1 / years) - 1 : null;
  el.innerHTML = html`
    <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:12px">
      ${kpi('Start', fmt(first.value), '', fmtDate(first.date))}
      ${kpi('Latest', fmt(last.value), '', fmtDate(last.date))}
      ${kpi('Change', signed(d), d >= 0 ? 'up' : 'down', signedPct(d / first.value))}
      ${kpi('Annualised', cagr != null ? signedPct(cagr) : '—', cagr == null ? 'muted' : cagr >= 0 ? 'up' : 'down', cagr != null ? `${years.toFixed(1)} years` : 'Window under 6 months')}
    </div>
    <div class="chart lg"><canvas id="perfTrend" role="img" aria-label="Net worth over time"></canvas></div>`;
  line($('#perfTrend', root_), { labels: snaps.map(s => fmtMonth(s.date)), data: snaps.map(s => s.value), color: '#e5bd67' });
}

export function onAction(name, arg) {
  if (name !== 'period') return false;
  period = arg;
  root_.querySelectorAll('[data-action="period"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.arg === arg)));
  renderHistory();
  return true;
}
