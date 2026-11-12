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
  return html`<span class="badge" style="color:${o?.color || 'inherit'};background:color-mix(in srgb, ${o?.color || '#999'} 14%, transparent)">${owner}</span>`;
};
export const gainText = (gain, cost) => {
  if (gain == null || !cost) return html`<span class="muted">—</span>`;
  const cls = gain >= 0 ? 'up' : 'down';
  return html`<span class="${cls}">${signed(gain)} <span class="muted small">(${signedPct(gain / cost)})</span></span>`;
};
export const delta = (value, base) => {
  if (value == null || !base) return html`<span class="muted">—</span>`;
  const cls = value >= 0 ? 'up' : 'down';
  return html`<span class="${cls}" style="display:inline-flex;align-items:center;gap:4px">${icon(value >= 0 ? 'arrow-up-right' : 'arrow-down-right', 'ico')}${signed(value)} (${signedPct(value / base)})</span>`;
};

export function pageHead(title, subtitle, actions) {
  return html`<div class="page-head"><div><h1>${title}</h1>${subtitle ? html`<p>${subtitle}</p>` : ''}</div>${actions || ''}</div>`;
}
export const sectionHead = (title, meta) => html`<div class="section-head"><h2>${title}</h2>${meta ? html`<span class="muted">${meta}</span>` : ''}</div>`;

export function subtabs(items, current, base) {
  return html`<div class="subtabs" role="tablist">${items.map(([key, label]) =>
    html`<a class="subtab" role="tab" href="#${base}/${key}" aria-current="${key === current ? 'true' : 'false'}">${label}</a>`)}</div>`;
}
export function seg(items, current, action) {
  return html`<div class="seg" role="group">${items.map(([key, label]) =>
    html`<button type="button" data-action="${action}" data-arg="${key}" aria-pressed="${key === current}">${label}</button>`)}</div>`;
}

export function stat({ label, value, sub, color, iconName, action, tone }) {
  return html`<div class="card stat" ${action ? raw(`data-action="${esc(action.name)}" data-arg="${esc(action.arg)}" tabindex="0" role="link"`) : ''}>
    <div class="stat-label">${color ? html`<span class="mark" style="background:${color}">${icon(iconName || 'grid')}</span>` : ''}${label}</div>
    <div class="stat-value ${tone || ''}">${value}</div>
    ${sub ? html`<div class="stat-sub">${sub}</div>` : ''}
  </div>`;
}

export function kpi(label, value, tone, sub, action) {
  return html`<div class="kpi" ${action ? raw(`data-action="goto" data-arg="${esc(action)}" tabindex="0" role="link"`) : ''}><span class="kpi-label">${label}</span><span class="kpi-value ${tone || ''}">${value}</span>${sub ? html`<span class="kpi-sub">${sub}</span>` : ''}</div>`;
}

export function tile({ key, label, value, share, sub, extra, color, iconName, href, index = 0 }) {
  return html`<a class="card tile" href="#${href}" data-cls="${key}" style="--tile-color:${color};animation-delay:${Math.min(index * 30, 300)}ms">
    <span class="arrow">${icon('arrow-up-right')}</span>
    <div class="tile-top"><span class="mark">${icon(iconName || 'grid')}</span><span class="tile-name">${label}</span></div>
    <div class="tile-value">${value}</div>
    <div class="tile-meta"><span class="pct">${share}</span><span>${sub}</span></div>
    ${extra ? html`<div class="tile-extra">${extra}</div>` : ''}
  </a>`;
}

export function allocRows(items, { total, action } = {}) {
  const t = total ?? items.reduce((a, x) => a + x.value, 0);
  return html`<div class="rows">${items.map(x => {
    const share = t ? x.value / t : 0;
    return html`<div class="row" data-key="${x.key ?? x.name}" ${action ? raw(`data-action="${esc(action)}" data-arg="${esc(x.key ?? x.name)}" tabindex="0" role="link"`) : ''}>
      <i class="dot" style="background:${x.color}"></i>
      <span class="name" title="${x.name}">${x.name}</span>
      <div class="bar"><i style="width:${(share * 100).toFixed(1)}%;background:${x.color}"></i></div>
      <span class="pct">${pct(share)}</span>
      <span class="val">${fmt(x.value)}</span>
    </div>`;
  })}</div>`;
}

export function legend(items, { total, action } = {}) {
  const t = total ?? items.reduce((a, x) => a + x.value, 0);
  return html`<div class="legend">${items.map((x, i) => html`<button type="button" class="legend-item" data-index="${i}" ${action ? raw(`data-action="${esc(action)}" data-arg="${esc(x.key ?? x.name)}"`) : ''}>
    <i class="dot" style="background:${x.color}"></i><span class="name">${x.name}</span><span class="pct">${pct(x.value / t)}</span><span class="val">${fmt(x.value)}</span></button>`)}</div>`;
}

export function donutCard(title, canvasId, centerTop, centerSub, extra) {
  return html`<div class="card"><div class="card-head"><h3>${title}</h3>${extra || ''}</div>
    <div class="chart donut donut-wrap"><canvas id="${canvasId}"></canvas>
      <div class="donut-center"><b>${centerTop}</b><span>${centerSub}</span></div></div></div>`;
}

export const empty = (msg, title) => html`<div class="empty">${title ? html`<b>${title}</b>` : ''}${msg}</div>`;

export function insightCard({ title, body, color, iconName, meta, href, hrefLabel }) {
  return html`<div class="insight"><span class="mark" style="background:${color}">${icon(iconName || 'info')}</span>
    <div><b>${title}</b><p>${body}</p><div class="meta">${meta ? html`<span>${meta}</span>` : ''}${href ? html`<a href="#${href}">${hrefLabel || 'View'} →</a>` : ''}</div></div></div>`;
}

export function sortableTh(label, key, sort, extraClass = '') {
  const active = sort.key === key;
  return html`<th class="sortable ${extraClass}" data-action="sort" data-arg="${key}" ${active ? raw(`aria-sort="${sort.asc ? 'ascending' : 'descending'}"`) : ''}>${label}${active ? (sort.asc ? ' ↑' : ' ↓') : ''}</th>`;
}
