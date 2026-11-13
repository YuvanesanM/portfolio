import { state, liquidity, liquidityDetail, previousSnapshot } from '../store.js';
import { MF_SCHEMES } from '../data.js';
import { computeInsights } from '../insights.js';
import { html, raw, fmt, fmtDate, fmtMonth, signed, signedPct, pct, sum, $, $$ } from '../util.js';
import { kpi, tile, allocRows, legend, insightCard, icon, seg, delta } from '../ui.js';
import { line, sparkline } from '../charts.js';
import { segmented, countUp } from '../viz.js';

const prefs = { sort: 'value', expanded: true };
let root_ = null;

const classHref = key => key === 'mf' ? 'mf' : `assets/${key}`;

export function render(root) {
  root_ = root;
  const prev = previousSnapshot();
  const d = prev ? state.total - prev.value : null;
  const liq = liquidity();
  const gain = state.total - state.cost;
  const active = state.holdings.filter(h => h.value > 0);
  const overrides = state.holdings.filter(h => h.overridden).map(h => h.overridden).sort();
  const insights = computeInsights().slice(0, 3);
  const classItems = state.byClass.map(c => ({ key: c.key, name: c.label, value: c.value, color: c.color }));
  const buckets = liquidityDetail();

  root.innerHTML = html`
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">${icon('sparkle')} Total portfolio value</span>
        <span class="hero-value"><span class="cur">₹</span><span id="ovTotal">${fmt(state.total).replace('₹', '')}</span></span>
        <div class="hero-sub">
          <span>As of ${fmtDate(state.asOf)}</span>
          ${d != null ? html`<span class="sep">·</span>${delta(d, prev.value)}<span class="muted">since ${fmtDate(prev.date)}</span>` : html`<span class="sep">·</span><span class="muted">No earlier snapshot to compare</span>`}
        </div>
        <div class="hero-meta">
          <div><span>Asset classes</span><b>${state.byClass.length}</b></div>
          <div><span>Holdings</span><b>${active.length}</b></div>
          <div><span>Previous snapshot</span><b>${prev ? fmtDate(prev.date) : '—'}</b></div>
          <div><span>Manual overrides</span><b>${overrides.length ? `${overrides.length} · ${fmtDate(overrides[overrides.length - 1])}` : 'None'}</b></div>
        </div>
        ${state.snapshots.length >= 3 ? html`<div class="hero-spark"><canvas id="ovSpark" aria-label="Net worth trend across ${state.snapshots.length} snapshots" role="img"></canvas></div>` : ''}
      </div>
      <div class="card hero-side">
        ${kpi('Mutual funds', fmt(state.classMap.mf || 0), '', `${MF_SCHEMES.length} schemes · ${pct((state.classMap.mf || 0) / state.total)}`, 'mf')}
        ${kpi('Unrealised gain', signed(gain), gain >= 0 ? 'up' : 'down', `${signedPct(gain / state.cost)} on ${fmt(state.cost)} cost`, 'performance')}
        ${kpi('Liquid assets', fmt(liq.liquid), '', `${pct(liq.liquid / state.total)} · MF, FD, crypto`, 'liquidity')}
        ${kpi('Illiquid / lock-in', fmt(liq.locked), '', `${pct(liq.locked / state.total)} · SGB, PMS, AIF, SSY, NPS, insurance`, 'liquidity')}
      </div>
    </div>

    <div class="tiles">
      ${state.byClass.map((c, i) => {
        const items = c.items.filter(h => h.value > 0);
        const g = c.cost ? c.value - c.cost : null;
        return tile({
          key: c.key, label: c.label, value: fmt(c.value), share: pct(c.pct), color: c.color, iconName: c.icon, index: i, href: classHref(c.key),
          sub: c.key === 'mf' ? `${MF_SCHEMES.length} schemes` : `${items.length} holding${items.length === 1 ? '' : 's'}`,
          extra: g != null && c.cost ? html`<span class="${g >= 0 ? 'up' : 'down'}">${signed(g)} (${signedPct(g / c.cost)})</span> vs cost` : 'No cost basis recorded',
        });
      })}
    </div>

    <div class="grid cols-2-3">
      <div class="card" id="ovComp"><div class="card-head"><h3>Composition</h3><span class="muted">${state.byClass.length} classes · top 5 + other</span></div>
        ${segmented(classItems, { total: state.total, action: 'gotoClass', legend: false })}
        <div id="ovLegend" style="margin-top:12px">${legend(classItems, { total: state.total, action: 'gotoClass' })}</div>
      </div>
      <div class="card"><div class="card-head"><h3>Allocation</h3>
        <div class="actions">${seg([['value', 'By value'], ['name', 'By name']], prefs.sort, 'allocSort')}<button class="btn small" data-action="allocToggle">${prefs.expanded ? 'Show top 6' : 'Show all'}</button></div></div>
        <div id="ovAlloc"></div>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Liquidity profile</h3><a class="small gold" href="#liquidity">Details →</a></div>
        ${segmented(buckets.map(b => ({ key: b.key, name: b.label, value: b.value, color: b.color })), { total: state.total, legend: false, sort: false })}
        <div style="margin-top:12px">${allocRows(buckets.map(b => ({ key: b.key, name: b.label, value: b.value, color: b.color })), { total: state.total })}</div>
        <div class="note">Liquid: ${buckets[0].classes.map(c => c.short).join(', ') || '—'} · Semi-liquid: ${buckets[1].classes.map(c => c.short).join(', ')} · Locked-in: ${buckets[2].classes.map(c => c.short).join(', ')}</div>
      </div>
      <div class="card"><div class="card-head"><h3>Net worth history</h3><a class="small gold" href="#performance">Performance →</a></div>
        ${state.snapshots.length >= 2 ? html`<div class="chart sm"><canvas id="ovTrend" role="img" aria-label="Net worth over ${state.snapshots.length} snapshots"></canvas></div>` : html`<div class="empty"><b>Not enough history</b>At least two dated snapshots are needed to draw a trend.</div>`}
      </div>
    </div>

    <div class="section-head"><h2>Insights</h2><a class="small gold" href="#insights">All insights →</a></div>
    <div class="grid cols-3" style="margin-bottom:0">${insights.map(insightCard)}</div>`;

  renderAlloc();
  countUp($('#ovTotal', root), state.total, v => fmt(v).replace('₹', ''));
  if (state.snapshots.length >= 3) sparkline($('#ovSpark', root), { data: state.snapshots.map(s => s.value), color: 'var(--accent)' });
  if (state.snapshots.length >= 2) line($('#ovTrend', root), { labels: state.snapshots.map(s => fmtMonth(s.date)), data: state.snapshots.map(s => s.value), color: 'var(--accent)' });

  // Link legend rows and segmented blocks: hovering one highlights the other.
  const comp = $('#ovComp', root);
  const setHot = key => {
    $$('.legend-item', comp).forEach(el => el.classList.toggle('active', !!key && el.dataset.arg === key));
    $$('.seg-block', comp).forEach(el => el.classList.toggle('hot', !!key && el.dataset.seg === key));
  };
  comp.addEventListener('pointerover', e => { const t = e.target.closest('.legend-item,.seg-block'); if (t) setHot(t.dataset.arg || t.dataset.seg); });
  comp.addEventListener('pointerleave', () => setHot(null));
  comp.addEventListener('focusin', e => { const t = e.target.closest('.legend-item,.seg-block'); if (t) setHot(t.dataset.arg || t.dataset.seg); });
  comp.addEventListener('focusout', () => setHot(null));
}

function renderAlloc() {
  const sorted = [...state.byClass].sort((a, b) => prefs.sort === 'name' ? a.label.localeCompare(b.label) : b.value - a.value);
  const shown = prefs.expanded ? sorted : sorted.slice(0, 6);
  const top3 = [...state.byClass].slice(0, 3);
  $('#ovAlloc', root_).innerHTML = html`
    ${allocRows(shown.map(c => ({ key: c.key, name: c.label, value: c.value, color: c.color })), { total: state.total, action: 'gotoClass' })}
    ${!prefs.expanded && sorted.length > 6 ? html`<div class="note">${sorted.length - 6} smaller classes hidden · ${fmt(sum(sorted.slice(6), c => c.value))} (${pct(sum(sorted.slice(6), c => c.pct))})</div>` : ''}
    <div class="note">Concentration: top 3 classes (${top3.map(c => c.short).join(', ')}) = <b>${pct(sum(top3, c => c.pct))}</b> of net worth. Percentages use total net worth ${fmt(state.total)} as the denominator.</div>`;
}

export function onAction(name, arg) {
  if (name === 'gotoClass') { location.hash = classHref(arg); return true; }
  if (name === 'allocSort') { prefs.sort = arg; $$('[data-action="allocSort"]', root_).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.arg === arg))); renderAlloc(); return true; }
  if (name === 'allocToggle') { prefs.expanded = !prefs.expanded; $('[data-action="allocToggle"]', root_).textContent = prefs.expanded ? 'Show top 6' : 'Show all'; renderAlloc(); return true; }
  return false;
}
