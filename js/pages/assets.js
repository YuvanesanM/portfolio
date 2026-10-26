import { state, sgbHoldings } from '../store.js';
import { ASSET_CLASSES, OWNERS, MF_SCHEMES } from '../data.js';
import { html, fmt, fmtDate, pct, signed, signedPct, sum, daysBetween, todayISO, groupBy, $, $$ } from '../util.js';
import { pageHead, stat, tile, classBadge, ownerBadge, gainText, allocRows, donutCard, seg, icon, kpi, empty } from '../ui.js';
import { bars, doughnut } from '../charts.js';

const prefs = { mode: 'value', sort: 'value' };
let root_ = null;

export function render(root, { sub } = {}) {
  root_ = root;
  if (sub && ASSET_CLASSES[sub]) return renderClass(root, sub);
  renderIndex(root);
}

// ── Index: ranking chart + tiles ──────────────────────────────────────
function renderIndex(root) {
  const classes = [...state.byClass].sort((a, b) => prefs.sort === 'name' ? a.label.localeCompare(b.label) : b.value - a.value);
  root.innerHTML = html`
    ${pageHead('Asset classes', `${state.byClass.length} classes with value · ${Object.keys(ASSET_CLASSES).length} defined in data.js`, seg([['value', 'By value'], ['name', 'By name']], prefs.sort, 'assetSort'))}
    <div class="grid cols-3-2">
      <div class="card"><div class="card-head"><h3>Ranked by ${prefs.mode === 'value' ? 'value' : 'share of portfolio'}</h3>
        <div class="actions">${seg([['value', '₹ value'], ['pct', '% share']], prefs.mode, 'assetMode')}</div></div>
        <div class="chart xl"><canvas id="acRank" role="img" aria-label="Asset classes ranked by ${prefs.mode === 'value' ? 'value' : 'share'}"></canvas></div>
        <div class="note">Click a bar to open that class. Share uses total net worth ${fmt(state.total)} as the denominator.</div></div>
      <div class="card"><div class="card-head"><h3>Gain by class</h3><span class="muted">vs recorded cost</span></div>
        <div class="table-wrap"><table class="tbl compact"><thead><tr><th>Class</th><th class="right">Value</th><th class="right">Gain</th></tr></thead>
        <tbody>${[...state.byClass].sort((a, b) => (b.value - b.cost) - (a.value - a.cost)).map(c => html`<tr><td>${classBadge(c.key)}</td><td class="right main-cell">${fmt(c.value)}</td><td class="right">${c.cost ? gainText(c.value - c.cost, c.cost) : html`<span class="muted">—</span>`}</td></tr>`)}</tbody></table></div></div>
    </div>
    <div class="tiles">${classes.map((c, i) => {
      const items = c.items.filter(h => h.value > 0);
      const g = c.cost ? c.value - c.cost : null;
      return tile({ key: c.key, label: c.label, value: fmt(c.value), share: pct(c.pct), color: c.color, iconName: c.icon, index: i, href: c.key === 'mf' ? 'mf' : `assets/${c.key}`,
        sub: c.key === 'mf' ? `${MF_SCHEMES.length} schemes` : `${items.length} holding${items.length === 1 ? '' : 's'}`,
        extra: g != null ? html`<span class="${g >= 0 ? 'up' : 'down'}">${signed(g)} (${signedPct(g / c.cost)})</span> vs cost` : '' });
    })}</div>`;
  const ranked = [...state.byClass].sort((a, b) => b.value - a.value);
  bars($('#acRank', root), {
    labels: ranked.map(c => c.label), data: ranked.map(c => prefs.mode === 'value' ? c.value : +(c.pct * 100).toFixed(2)), colors: ranked.map(c => c.color),
    horizontal: true, percent: prefs.mode === 'pct', tip: c => `${fmt(ranked[c.dataIndex].value)} · ${pct(ranked[c.dataIndex].pct)}`,
    onClick: i => { location.hash = ranked[i].key === 'mf' ? 'mf' : `assets/${ranked[i].key}`; },
  });
}

// ── Class detail ──────────────────────────────────────────────────────
function renderClass(root, key) {
  const c = ASSET_CLASSES[key];
  const cls = state.byClass.find(x => x.key === key) || { ...c, key, items: state.holdings.filter(h => h.cls === key), value: 0, cost: 0, pct: 0 };
  const items = [...cls.items].sort((a, b) => b.value - a.value);
  const active = items.filter(h => h.value > 0);
  const gain = cls.cost ? cls.value - cls.cost : null;
  const extra = key === 'fd' ? fdSection(active) : key === 'sgb' ? sgbSection() : '';
  root.innerHTML = html`
    ${pageHead(c.label, `${active.length} holding${active.length === 1 ? '' : 's'} · ${pct(cls.pct)} of net worth`, html`<a class="btn" href="#assets">${icon('arrow')} All classes</a>`)}
    <div class="stats">
      ${stat({ label: 'Value', value: fmt(cls.value), color: c.color, iconName: c.icon, sub: `${pct(cls.pct)} of ${fmt(state.total)}` })}
      ${stat({ label: 'Cost basis', value: cls.cost ? fmt(cls.cost) : '—', sub: cls.cost ? html`<span class="${gain >= 0 ? 'up' : 'down'}">${signed(gain)} (${signedPct(gain / cls.cost)})</span>` : 'Not recorded' })}
      ${stat({ label: 'Liquidity', value: { liquid: 'Liquid', semi: 'Semi-liquid', locked: 'Locked-in' }[c.liquidity], sub: 'Bucket for this class' })}
      ${stat({ label: 'Owners', value: String(new Set(active.map(h => h.owner)).size), sub: [...new Set(active.map(h => h.owner))].join(', ') || '—' })}
    </div>
    ${extra}
    <div class="card"><div class="card-head"><h3>Holdings</h3><span class="muted">${items.length} rows</span></div>
      ${items.length ? html`<div class="table-wrap"><table class="tbl">
        <thead><tr><th>Holding</th><th>Owner</th><th>Since</th><th class="right">Cost</th><th class="right">Value</th><th class="right">Gain</th><th class="right">Of class</th></tr></thead>
        <tbody>${items.map(h => html`<tr>
          <td><span class="main-cell">${h.name}</span><span class="sub">${h.account}${h.qty ? ` · ${h.qty.toLocaleString('en-IN')} ${h.unit === 'g' ? 'g' : 'units'}${h.price != null ? ` @ ₹${h.price.toLocaleString('en-IN')}` : ''}` : ''}${h.maturity ? ` · matures ${fmtDate(h.maturity)}` : ''}</span>${state.notes[h.id] ? html`<span class="sub note-cell">${state.notes[h.id]}</span>` : ''}${h.overridden ? html`<span class="sub">Manual override · ${fmtDate(h.overridden)}</span>` : ''}</td>
          <td>${ownerBadge(h.owner)}</td><td class="muted">${fmtDate(h.since)}</td>
          <td class="right muted">${h.cost ? fmt(h.cost) : '—'}</td><td class="right main-cell">${h.value > 0 ? fmt(h.value) : html`<span class="muted">—</span>`}</td>
          <td class="right">${h.value > 0 && h.cost ? gainText(h.value - h.cost, h.cost) : html`<span class="muted">—</span>`}</td>
          <td class="right muted">${cls.value && h.value > 0 ? pct(h.value / cls.value) : '—'}</td></tr>`)}</tbody>
        <tfoot><tr><td colspan="3">Total</td><td class="right">${cls.cost ? fmt(cls.cost) : '—'}</td><td class="right">${fmt(cls.value)}</td><td class="right">${cls.cost ? gainText(gain, cls.cost) : '—'}</td><td class="right">100%</td></tr></tfoot>
      </table></div>` : empty('No holdings recorded for this class.')}
    </div>`;
  if (key === 'fd') mountFD(root, active);
}

function fdSection(fds) {
  const total = sum(fds, h => h.value);
  const banks = [...groupBy(fds, h => h.account)].map(([name, items]) => ({ name, value: sum(items, h => h.value) })).sort((a, b) => b.value - a.value);
  const owners = [...groupBy(fds, h => h.owner)].map(([name, items]) => ({ name, value: sum(items, h => h.value), color: OWNERS[name]?.color || '#999' })).sort((a, b) => b.value - a.value);
  return html`<div class="grid cols-2">
    ${donutCard('By bank', 'fdDonut', fmt(total), `${banks.length} banks`)}
    <div class="card"><div class="card-head"><h3>By holder</h3></div>${allocRows(owners, { total })}
      <div class="note">Maturity dates and interest rates are not recorded in data.js, so no maturity ladder is shown.</div></div>
  </div>`;
}
function mountFD(root, fds) {
  const total = sum(fds, h => h.value);
  const banks = [...groupBy(fds, h => h.account)].map(([name, items]) => ({ name, value: sum(items, h => h.value) })).sort((a, b) => b.value - a.value);
  const palette = ['#3dd68c', '#4c83ff', '#f5a524', '#9b7bff', '#2dd4a7'];
  doughnut($('#fdDonut', root), { labels: banks.map(b => b.name), data: banks.map(b => b.value), colors: banks.map((_, i) => palette[i % palette.length]), total, legend: true });
}

function sgbSection() {
  const sgbs = sgbHoldings().sort((a, b) => a.maturity < b.maturity ? -1 : 1);
  const total = sum(sgbs, h => h.value), cost = sum(sgbs, h => h.cost), grams = sum(sgbs, h => h.qty);
  const today = todayISO();
  const upcoming = sgbs.map(h => ({ ...h, days: daysBetween(today, h.maturity) })).filter(h => h.days > 0 && h.days <= 548);
  const next = upcoming[0];
  return html`
    ${next ? html`<div class="alert">${icon('bell')}<div><b>${next.qty} g tranche matures on ${fmtDate(next.maturity)}</b> — ${next.days} days away. Worth ${fmt(next.value)}; the ${fmt(next.value - next.cost)} gain is tax free at RBI redemption.${upcoming.length > 1 ? ` ${upcoming.length - 1} more within 18 months.` : ''}</div></div>` : ''}
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Summary</h3></div><div class="kv">
        <div><span>Gold held</span><b>${grams} g across ${sgbs.length} tranches</b></div>
        <div><span>Gold rate used</span><b>₹${(sgbs[0]?.price || 0).toLocaleString('en-IN')}/g</b></div>
        <div><span>Cost basis</span><b>${fmt(cost)}</b></div>
        <div><span>Unrealised gain</span><b class="${total >= cost ? 'up' : 'down'}">${signed(total - cost)} (${signedPct((total - cost) / cost)})</b></div>
        <div><span>Tax at maturity</span><b class="up">Exempt</b></div></div></div>
      <div class="card"><div class="card-head"><h3>Maturity timeline</h3><span class="muted">8-year tenure</span></div>
        ${sgbs.map(h => {
          const elapsed = Math.max(0, Math.min(1, daysBetween(h.since) / daysBetween(h.since, h.maturity)));
          const left = daysBetween(today, h.maturity);
          return html`<div class="timeline-item ${left < 365 ? 'near' : ''}">
            <div class="top"><b>${h.qty} g · ${fmtDate(h.maturity)}</b><span class="muted">${left > 0 ? `${(left / 365.25).toFixed(1)} yrs left` : 'Matured'}</span></div>
            <div class="bar thin"><i style="width:${(elapsed * 100).toFixed(1)}%"></i></div>
            <div class="meta" style="margin-top:6px"><span>${fmt(h.value)}</span><span class="${h.value >= h.cost ? 'up' : 'down'}">${signed(h.value - h.cost)}</span></div></div>`;
        })}</div>
    </div>`;
}

export function onAction(name, arg) {
  if (name === 'assetMode') { prefs.mode = arg; renderIndex(root_); return true; }
  if (name === 'assetSort') { prefs.sort = arg; renderIndex(root_); return true; }
  return false;
}
