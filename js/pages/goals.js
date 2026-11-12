import { state } from '../store.js';
import { TARGET_NET_WORTH } from '../data.js';
import { html, fmt, fmtDate, pct, signedPct, parseISO } from '../util.js';
import { kpi, pageHead, icon } from '../ui.js';

const MILESTONES = [5, 6, 7, 8, 10, 15, 20, 25, 50, 100].map(cr => ({ label: `₹${cr} Cr`, target: cr * 1e7 }));
const yearsTo = (target, rate) => Math.log(target / state.total) / Math.log(1 + rate);

export function render(root) {
  const progress = Math.min(1, state.total / TARGET_NET_WORTH);
  const snaps = state.snapshots, first = snaps[0], last = snaps[snaps.length - 1];
  const years = first && last ? (parseISO(last.date) - parseISO(first.date)) / 31557600000 : 0;
  const cagr = years > 0.5 && first.value > 0 ? Math.pow(last.value / first.value, 1 / years) - 1 : null;
  const reached = MILESTONES.filter(m => state.total >= m.target).length;
  root.innerHTML = html`
    ${pageHead('Goals', `Progress towards a ${fmt(TARGET_NET_WORTH)} net worth target`)}
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">${icon('target')} Target progress</span>
        <span class="hero-value">${pct(progress, 0)}</span>
        <div class="hero-sub"><span>${fmt(state.total)} of ${fmt(TARGET_NET_WORTH)}</span><span class="sep">·</span><span class="muted">${fmt(TARGET_NET_WORTH - state.total)} to go</span></div>
        <div class="bar" style="margin-top:6px"><i style="width:${(progress * 100).toFixed(1)}%"></i></div>
        <div class="hero-meta">
          <div><span>Milestones reached</span><b>${reached} of ${MILESTONES.length}</b></div>
          <div><span>Observed growth</span><b>${cagr != null ? `${signedPct(cagr)} p.a.` : '—'}</b></div>
          <div><span>Since</span><b>${first ? fmtDate(first.date) : '—'}</b></div>
        </div>
      </div>
      <div class="card hero-side">
        ${kpi('At 12% a year', `~${yearsTo(TARGET_NET_WORTH, 0.12).toFixed(1)} yrs`, '', 'Illustrative, compounding from today')}
        ${kpi('At 15% a year', `~${yearsTo(TARGET_NET_WORTH, 0.15).toFixed(1)} yrs`, '', 'Illustrative, compounding from today')}
        ${kpi('4% withdrawal', `${fmt(state.total * 0.04 / 12)}/mo`, '', 'If drawn from current value')}
        ${kpi('At observed rate', cagr != null && cagr > 0 ? `~${yearsTo(TARGET_NET_WORTH, cagr).toFixed(1)} yrs` : '—', '', cagr != null ? `${signedPct(cagr)} from snapshot history` : 'Needs 6+ months of history')}
      </div>
    </div>
    <div class="card"><div class="card-head"><h3>Milestones</h3><span class="muted">years to reach at 12% · 15%</span></div>
      ${MILESTONES.map(m => {
        const p = Math.min(1, state.total / m.target), done = state.total >= m.target;
        return html`<div class="milestone"><span class="lbl">${m.label}</span>
          <div><div class="meta"><span>${fmt(m.target)}</span><span>${done ? html`<span class="up">Reached</span>` : `~${yearsTo(m.target, 0.12).toFixed(1)} · ~${yearsTo(m.target, 0.15).toFixed(1)} yrs`}</span></div><div class="bar thin"><i style="width:${(p * 100).toFixed(1)}%"></i></div></div>
          <span class="right muted">${pct(p, 0)}</span></div>`;
      })}
      <div class="note">Growth rates are illustrative scenarios, not forecasts. The observed rate is the annualised change in portfolio value across snapshots and includes contributions.</div>
    </div>`;
}
