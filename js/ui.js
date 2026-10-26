import { html, raw, fmt, pct, signed, signedPct, esc } from './util.js';
import { ASSET_CLASSES, OWNERS } from './data.js';

export const icon = (name, cls = 'ico') => raw(`<svg class="${cls}" aria-hidden="true"><use href="#i-${esc(name)}"/></svg>`);

export const classIcon = key => icon(ASSET_CLASSES[key]?.icon || 'grid');

export const classBadge = key => {
  const c = ASSET_CLASSES[key];
  return html`<span class="badge"><i class="dot" style="background:${c?.color || '#999'}"></i>${c?.short || key}</span>`;
};
export const ownerBadge = owner => {
  const o = OWNERS[owner];
  return html`<span class="badge" style="color:${o?.color || 'inherit'};background:color-mix(in srgb, ${o?.color || '#999'} 12%, transparent)">${owner}</span>`;
};
export const gainText = (gain, cost) => {
  if (gain == null || !cost) return html`<span class="muted">—</span>`;
  const cls = gain >= 0 ? 'up' : 'down';
  return html`<span class="${cls}">${signed(gain)} <span class="muted small">(${signedPct(gain / cost)})</span></span>`;
};

export function pageHead(title, subtitle, actions) {
  return html`<div class="page-head"><div><h1>${title}</h1>${subtitle ? html`<p>${subtitle}</p>` : ''}</div>${actions || ''}</div>`;
}

export function subtabs(items, current, base) {
  return html`<div class="subtabs" role="tablist">${items.map(([key, label]) =>
    html`<a class="subtab" role="tab" href="#${base}/${key}" aria-current="${key === current ? 'true' : 'false'}">${label}</a>`)}</div>`;
}

export function stat({ label, value, sub, color, iconName, action, tone }) {
  return html`<div class="card stat" ${action ? raw(`data-action="${esc(action.name)}" data-arg="${esc(action.arg)}"`) : ''}>
    <div class="stat-label">${color ? html`<span class="mark" style="background:${color}">${icon(iconName || 'grid')}</span>` : ''}${label}</div>
    <div class="stat-value ${tone || ''}">${value}</div>
    ${sub ? html`<div class="stat-sub">${sub}</div>` : ''}
  </div>`;
}

export function kpi(label, value, tone) {
  return html`<div class="kpi"><span class="kpi-label">${label}</span><span class="kpi-value ${tone || ''}">${value}</span></div>`;
}

export function allocRows(items, { total, action } = {}) {
  const t = total ?? items.reduce((a, x) => a + x.value, 0);
  return html`<div class="rows">${items.map(x => {
    const share = t ? x.value / t : 0;
    return html`<div class="row" ${action ? raw(`data-action="${esc(action)}" data-arg="${esc(x.key ?? x.name)}"`) : ''}>
      <i class="dot" style="background:${x.color}"></i>
      <span class="name" title="${x.name}">${x.name}</span>
      <div class="bar"><i style="width:${(share * 100).toFixed(1)}%;background:${x.color}"></i></div>
      <span class="pct">${pct(share)}</span>
      <span class="val">${fmt(x.value)}</span>
    </div>`;
  })}</div>`;
}

export function donutCard(title, canvasId, centerTop, centerSub, extra) {
  return html`<div class="card"><div class="card-head"><h3>${title}</h3>${extra || ''}</div>
    <div class="chart donut donut-wrap"><canvas id="${canvasId}"></canvas>
      <div class="donut-center"><b>${centerTop}</b><span>${centerSub}</span></div></div></div>`;
}

export const empty = msg => html`<div class="empty">${msg}</div>`;

export function sortableTh(label, key, sort, extraClass = '') {
  const active = sort.key === key;
  return html`<th class="sortable ${extraClass}" data-action="sort" data-arg="${key}" ${active ? raw(`aria-sort="${sort.asc ? 'ascending' : 'descending'}"`) : ''}>${label}${active ? (sort.asc ? ' ↑' : ' ↓') : ''}</th>`;
}
