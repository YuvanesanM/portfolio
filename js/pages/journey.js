import { state } from '../store.js';
import { TARGET_NET_WORTH } from '../data.js';
import { html, fmt, fmtDate, fmtMonth, pct, signedPct } from '../util.js';
import { kpi, pageHead } from '../ui.js';
import { line } from '../charts.js';

const MILESTONES = [5, 6, 7, 8, 10, 15, 20, 25, 50, 100].map(cr => ({ label: `₹${cr} Cr`, target: cr * 1e7 }));
const yearsTo = (target, rate) => Math.log(target / state.total) / Math.log(1 + rate);

export function render(root) {
  const progress = Math.min(1, state.total / TARGET_NET_WORTH);
  const snaps = state.snapshots;
  const first = snaps[0], last = snaps[snaps.length - 1];
  const years = first && last ? (new Date(last.date) - new Date(first.date)) / 31557600000 : 0;
  const cagr = years > 0 && first.value > 0 ? Math.pow(last.value / first.value, 1 / years) - 1 : null;

  root.innerHTML = html`
    ${pageHead('Journey', `Progress towards ${fmt(TARGET_NET_WORTH)}`)}
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">Net worth</span>
        <span class="hero-value">${fmt(state.total)}</span>
        <div class="hero-sub"><span>${pct(progress, 0)} of ${fmt(TARGET_NET_WORTH)} target</span>${cagr != null ? html`<span>· ${signedPct(cagr)} CAGR since ${fmtDate(first.date)}</span>` : ''}</div>
        <div class="bar" style="margin-top:6px"><i style="width:${(progress * 100).toFixed(1)}%"></i></div>
      </div>
      <div class="card hero-side">
        ${kpi('At 12% a year', `~${yearsTo(TARGET_NET_WORTH, 0.12).toFixed(1)} yrs`)}
        ${kpi('At 15% a year', `~${yearsTo(TARGET_NET_WORTH, 0.15).toFixed(1)} yrs`)}
        ${kpi('4% withdrawal', `${fmt(state.total * 0.04 / 12)}/mo`)}
        ${kpi('Snapshots', String(snaps.length))}
      </div>
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Milestones</h3><span class="muted">years to reach at 12% · 15%</span></div>
        ${MILESTONES.map(m => {
          const p = Math.min(1, state.total / m.target), done = state.total >= m.target;
          return html`<div class="milestone">
            <span class="lbl">${m.label}</span>
            <div><div class="meta"><span>${fmt(m.target)}</span><span>${done ? html`<span class="up">Reached</span>` : `~${yearsTo(m.target, 0.12).toFixed(1)} · ~${yearsTo(m.target, 0.15).toFixed(1)} yrs`}</span></div><div class="bar thin"><i style="width:${(p * 100).toFixed(1)}%"></i></div></div>
            <span class="right muted">${pct(p, 0)}</span>
          </div>`;
        })}
      </div>
      <div class="card"><div class="card-head"><h3>Growth</h3></div><div class="chart lg"><canvas id="jyTrend"></canvas></div></div>
    </div>
    <div class="card"><div class="card-head"><h3>History</h3><span class="muted">${snaps.length} snapshots</span></div><div class="table-wrap"><table class="tbl compact">
      <thead><tr><th>Date</th><th class="right">Net worth</th><th class="right">Change</th><th class="right">Since start</th></tr></thead>
      <tbody>${[...snaps].reverse().map((s, i, arr) => {
        const prev = arr[i + 1];
        const d = prev ? (s.value - prev.value) / prev.value : null;
        return html`<tr><td class="main-cell">${fmtDate(s.date)}</td><td class="right">${fmt(s.value)}</td><td class="right ${d == null ? 'muted' : d >= 0 ? 'up' : 'down'}">${d == null ? '—' : signedPct(d)}</td><td class="right muted">${first ? signedPct(s.value / first.value - 1, 0) : '—'}</td></tr>`;
      })}</tbody>
    </table></div></div>`;

  line(root.querySelector('#jyTrend'), { labels: snaps.map(s => fmtMonth(s.date)), data: snaps.map(s => s.value), color: '#b8860b' });
}
