// Chart-free visual components: segmented bars, dumbbells, tooltips, count-ups.
import { html, raw, fmt, pct, esc, $ } from './util.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Tooltip (one shared element) ──────────────────────────────────────
let tip = null;
function tooltipEl() {
  if (!tip) { tip = document.createElement('div'); tip.className = 'viz-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip); }
  return tip;
}
export function showTip(target, rows, title) {
  const el = tooltipEl();
  el.replaceChildren();
  if (title) { const t = document.createElement('div'); t.className = 'viz-tip-title'; t.textContent = title; el.appendChild(t); }
  for (const r of rows) {
    const row = document.createElement('div'); row.className = 'viz-tip-row';
    if (r.color) { const k = document.createElement('i'); k.className = 'viz-tip-key'; k.style.background = r.color; row.appendChild(k); }
    const v = document.createElement('b'); v.textContent = r.value; row.appendChild(v);
    const l = document.createElement('span'); l.textContent = r.label; row.appendChild(l);
    el.appendChild(row);
  }
  el.hidden = false;
  const r = target.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.top - h - 10;
  x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
  if (y < 8) y = r.bottom + 10;
  el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}
export function hideTip() { if (tip) tip.hidden = true; }

// Delegated hover/focus for any element carrying data-tip (JSON rows) and optional data-tip-title.
document.addEventListener('pointerover', e => {
  const t = e.target.closest('[data-tip]'); if (!t) return;
  try { showTip(t, JSON.parse(t.dataset.tip), t.dataset.tipTitle); } catch {}
});
document.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]')) hideTip(); });
document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) { try { showTip(t, JSON.parse(t.dataset.tip), t.dataset.tipTitle); } catch {} } });
document.addEventListener('focusout', e => { if (e.target.closest('[data-tip]')) hideTip(); });
window.addEventListener('scroll', hideTip, { passive: true });

const tipAttr = (rows, title) => raw(`data-tip="${esc(JSON.stringify(rows))}"${title ? ` data-tip-title="${esc(title)}"` : ''}`);

// Ink for a label printed inside a coloured fill: white, or near-black on light fills (yellow, aqua).
function inkFor(color) {
  let hex = color;
  if (typeof hex === 'string' && hex.startsWith('var(')) hex = getComputedStyle(document.documentElement).getPropertyValue(hex.slice(4, -1)).trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? '#0b0b0b' : '#fff';
}

// ── Segmented bar: one whole split into ≤ 6 parts (+ Other) ──────────
// items: [{ key, name, value, color }]; total defaults to the sum. Labels print inside blocks that are wide enough.
export function segmented(items, { total, max = 6, action, legend = true, tall = true, sort = true, otherColor = '#64748b' } = {}) {
  const t = total ?? items.reduce((a, x) => a + x.value, 0);
  let parts = [...items].filter(x => x.value > 0);
  if (sort) parts.sort((a, b) => b.value - a.value);
  if (parts.length > max) {
    const tail = parts.slice(max - 1);
    parts = [...parts.slice(0, max - 1), { key: 'other', name: `Other (${tail.length})`, value: tail.reduce((a, x) => a + x.value, 0), color: otherColor, members: tail }];
  }
  const blocks = parts.map((p, i) => {
    const share = t ? p.value / t : 0;
    const rows = p.members
      ? p.members.map(m => ({ value: fmt(m.value), label: `${m.name} · ${pct(m.value / t)}`, color: m.color }))
      : [{ value: fmt(p.value), label: `${pct(share)} of total`, color: p.color }];
    const label = share >= 0.09 ? pct(share, 0) : '';
    return html`<button type="button" class="seg-block" style="flex:${(share * 1000).toFixed(1)} 1 0;background:${p.color};color:${inkFor(p.color)};animation-delay:${i * 50}ms"
      ${tipAttr(rows, p.name)} aria-label="${p.name}: ${fmt(p.value)}, ${pct(share)}"
      ${action && p.key !== 'other' ? raw(`data-action="${esc(action)}" data-arg="${esc(p.key)}"`) : ''} data-seg="${p.key}">${label ? html`<span>${label}</span>` : ''}</button>`;
  });
  return html`<div class="seg-wrap">
    <div class="seg-bar ${tall ? 'tall' : 'thin'}" role="img" aria-label="Split of ${fmt(t)}">${blocks}</div>
    ${legend ? html`<div class="seg-legend">${parts.map(p => html`<span class="seg-key" data-seg="${p.key}"><i class="dot" style="background:${p.color}"></i>${p.name}</span>`)}</div>` : ''}
  </div>`;
}

// ── Dumbbell: before → after per item (cost → value) ──────────────────
// items: [{ name, sub, from, to, color }]
export function dumbbell(items, { fromLabel = 'Cost', toLabel = 'Value' } = {}) {
  const max = Math.max(...items.flatMap(x => [x.from, x.to]), 1);
  const x = v => (v / max * 100).toFixed(2);
  return html`<div class="dumbbell">
    <div class="db-legend"><span><i class="db-dot from"></i>${fromLabel}</span><span><i class="db-dot to"></i>${toLabel}</span><span class="muted">gain</span></div>
    ${items.map((it, i) => {
      const up = it.to >= it.from, g = it.to - it.from;
      const rows = [{ value: fmt(it.to), label: toLabel }, { value: fmt(it.from), label: fromLabel }, { value: `${g >= 0 ? '+' : ''}${fmt(g)}`, label: `${g >= 0 ? '+' : ''}${(g / (it.from || 1) * 100).toFixed(1)}% ${up ? 'gain' : 'loss'}` }];
      return html`<div class="db-row" tabindex="0" ${tipAttr(rows, it.name)} style="animation-delay:${Math.min(i * 30, 400)}ms">
        <div class="db-name"><span class="main-cell">${it.name}</span>${it.sub ? html`<span class="sub">${it.sub}</span>` : ''}</div>
        <div class="db-track">
          <i class="db-line ${up ? 'up' : 'down'}" style="left:${x(Math.min(it.from, it.to))}%;width:${(Math.abs(it.to - it.from) / max * 100).toFixed(2)}%"></i>
          <i class="db-dot from" style="left:${x(it.from)}%"></i>
          <i class="db-dot to ${up ? 'up' : 'down'}" style="left:${x(it.to)}%"></i>
        </div>
        <div class="db-val ${up ? 'up' : 'down'}">${g >= 0 ? '+' : ''}${fmt(g)}</div>
      </div>`;
    })}
  </div>`;
}

// ── Count-up for hero figures (presentation only; respects reduced motion) ──
export function countUp(el, to, format, { from = 0, ms = 700 } = {}) {
  if (!el) return;
  if (reduceMotion() || !(to > 0)) { el.textContent = format(to); return; }
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => {
    const p = Math.min(1, (now - start) / ms);
    el.textContent = format(from + (to - from) * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Stagger entrance of a container's direct children via --i.
export function stagger(root, selector = ':scope > *') {
  if (!root) return;
  root.querySelectorAll(selector).forEach((el, i) => el.style.setProperty('--i', String(Math.min(i, 12))));
}

// ── Chart.js plugins ──────────────────────────────────────────────────
// Value at the tip of each horizontal bar, in text ink (never the series colour).
export const tipLabels = {
  id: 'tipLabels',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx } = chart, meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length || chart.options.indexAxis !== 'y') return;
    ctx.save();
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = opts.color || '#888';
    ctx.textBaseline = 'middle';
    const limitR = chart.width - 6, limitL = 4;
    meta.data.forEach((bar, i) => {
      const v = chart.data.datasets[0].data[i];
      if (v == null) return;
      const text = (opts.format || String)(v);
      const w = ctx.measureText(text).width;
      // Positive bars: value just past the tip (inside, in white, if there is no room). Negative bars: the
      // empty space right of the baseline, so the label never collides with the category axis.
      let x = v >= 0 ? bar.x + 6 : bar.base + 6;
      let inside = false;
      if (v >= 0 && x + w > limitR) { x = bar.x - 6 - w; inside = true; }
      if (x < limitL) x = limitL;
      ctx.fillStyle = inside ? (opts.insideColor || '#fff') : (opts.color || '#888');
      ctx.fillText(text, x, bar.y);
    });
    ctx.restore();
  },
};

// Vertical hairline that follows the pointer on line charts.
export const crosshair = {
  id: 'crosshair',
  afterDraw(chart, _args, opts) {
    const active = chart.tooltip?.getActiveElements?.() || [];
    if (!active.length) return;
    const { ctx, chartArea } = chart, x = active[0].element.x;
    ctx.save();
    ctx.strokeStyle = opts.color || 'rgba(128,128,128,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
    ctx.restore();
  },
};
