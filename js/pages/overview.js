import { state, liquidity, previousSnapshot } from '../store.js';
import { html, fmt, fmtDate, fmtMonth, signed, signedPct, pct, sum } from '../util.js';
import { stat, kpi, allocRows, donutCard, classIcon } from '../ui.js';
import { doughnut, bars, line } from '../charts.js';
import { MF_SCHEMES } from '../data.js';

export function render(root) {
  const prev = previousSnapshot();
  const delta = prev ? state.total - prev.value : null;
  const liq = liquidity();
  const gain = state.total - state.cost;

  root.innerHTML = html`
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">Net worth</span>
        <span class="hero-value">${fmt(state.total)}</span>
        <div class="hero-sub">
          <span>As of ${fmtDate(state.asOf)}</span>
          ${delta != null ? html`<span class="${delta >= 0 ? 'up' : 'down'}">${signed(delta)} (${signedPct(delta / prev.value)}) since ${fmtDate(prev.date)}</span>` : ''}
        </div>
      </div>
      <div class="card hero-side">
        ${kpi('Mutual funds', fmt(state.classMap.mf || 0))}
        ${kpi('Unrealised gain', signed(gain), gain >= 0 ? 'up' : 'down')}
        ${kpi('Liquid', fmt(liq.liquid))}
        ${kpi('Locked-in', fmt(liq.locked))}
      </div>
    </div>

    <div class="stats">
      ${state.byClass.map(c => stat({
        label: c.label, value: fmt(c.value), color: c.color, iconName: c.icon,
        sub: html`<span>${pct(c.pct)}</span><span>·</span><span>${c.key === 'mf' ? `${MF_SCHEMES.length} schemes` : `${c.items.filter(h => h.value > 0).length} ${c.items.filter(h => h.value > 0).length === 1 ? 'holding' : 'holdings'}`}</span>`,
        action: { name: 'goto', arg: c.key === 'mf' ? 'mf' : c.key === 'fd' ? 'holdings/fd' : c.key === 'sgb' ? 'holdings/sgb' : `holdings?cls=${c.key}` },
      }))}
    </div>

    <div class="grid cols-3-2">
      <div class="card"><div class="card-head"><h3>Allocation</h3><span class="muted">${state.byClass.length} asset classes</span></div>
        ${allocRows(state.byClass.map(c => ({ key: c.key, name: c.label, value: c.value, color: c.color })), { total: state.total, action: 'gotoClass' })}
      </div>
      ${donutCard('Composition', 'ovDonut', fmt(state.total), 'total')}
    </div>

    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Liquidity</h3><span class="muted">by exit speed</span></div><div class="chart sm"><canvas id="ovLiq"></canvas></div></div>
      <div class="card"><div class="card-head"><h3>Net worth trend</h3><span class="muted">${state.snapshots.length} snapshots</span></div><div class="chart sm"><canvas id="ovTrend"></canvas></div></div>
    </div>`;

  doughnut(root.querySelector('#ovDonut'), {
    labels: state.byClass.map(c => c.label), data: state.byClass.map(c => c.value), colors: state.byClass.map(c => c.color), total: state.total,
  });
  bars(root.querySelector('#ovLiq'), {
    labels: ['Liquid', 'Semi-liquid', 'Locked-in'], data: [liq.liquid, liq.semi, liq.locked], colors: ['#22c55e', '#3b82f6', '#8b5cf6'],
    tip: c => `${fmt(c.raw)} · ${pct(c.raw / state.total)}`,
  });
  line(root.querySelector('#ovTrend'), {
    labels: state.snapshots.map(s => fmtMonth(s.date)), data: state.snapshots.map(s => s.value), color: '#b8860b',
  });
}

export function onAction(name, arg) {
  if (name === 'gotoClass') {
    location.hash = arg === 'mf' ? 'mf' : arg === 'fd' ? 'holdings/fd' : arg === 'sgb' ? 'holdings/sgb' : `holdings?cls=${arg}`;
    return true;
  }
  return false;
}
