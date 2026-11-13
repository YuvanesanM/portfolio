import { fmt } from './util.js';
import { tipLabels, crosshair } from './viz.js';

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export const resolveColor = c => (typeof c === 'string' && c.startsWith('var(')) ? cssVar(c.slice(4, -1)) : c;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function theme() {
  return {
    text: cssVar('--text-2'), muted: cssVar('--text-3'), grid: cssVar('--border'),
    surface: cssVar('--surface'), tooltipBg: cssVar('--surface-3'), tooltipText: cssVar('--text'), accent: cssVar('--accent'),
  };
}

function base() {
  const t = theme();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reduceMotion() ? false : { duration: 600, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' ? Math.min(ctx.dataIndex * 35, 500) : 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText,
        borderColor: t.grid, borderWidth: 1, padding: 10, cornerRadius: 8, displayColors: true, usePointStyle: true,
        boxPadding: 4, titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' },
      },
    },
  };
}

export function destroyChart(canvas) { if (canvas) Chart.getChart(canvas)?.destroy(); }
export function destroyAll() { Object.values(Chart.instances).forEach(c => c.destroy()); }

function mount(canvas, config) {
  if (!canvas) return null;
  destroyChart(canvas);
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size = 11;
  return new Chart(canvas.getContext('2d'), config);
}

// Horizontal/vertical bars: ≤22px thick, rounded data-end only, value printed at the tip for horizontal bars.
export function bars(canvas, { labels, data, colors, horizontal = false, tip, onClick, percent = false, labelAt = 'tip' }) {
  const t = theme();
  const axis = { grid: { color: t.grid, drawBorder: false, lineWidth: 1 }, ticks: { color: t.muted, padding: 6 }, border: { display: false } };
  const valueAxis = { ...axis, ticks: { ...axis.ticks, maxTicksLimit: 6, callback: v => percent ? `${v}%` : fmt(v).replace('₹', '') } };
  const labelAxis = { ...axis, grid: { display: false }, ticks: { color: t.text, autoSkip: false } };
  return mount(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors.map(resolveColor), borderRadius: 4, borderSkipped: 'start', maxBarThickness: 22, categoryPercentage: 0.7 }] },
    options: {
      ...base(), indexAxis: horizontal ? 'y' : 'x',
      layout: { padding: { right: horizontal && labelAt === 'tip' ? 60 : 0 } },
      onHover: (e, els) => { e.native.target.style.cursor = els.length && onClick ? 'pointer' : 'default'; },
      onClick: (e, els) => { if (onClick && els.length) onClick(els[0].index); },
      scales: horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis },
      plugins: {
        ...base().plugins,
        tipLabels: horizontal && labelAt === 'tip' ? { color: t.text, format: v => percent ? `${v}%` : fmt(v) } : false,
        tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${tip ? tip(c) : fmt(c.raw)}` } },
      },
    },
    plugins: [tipLabels],
  });
}

// Single-series line: 2px, ≥8px markers with a surface ring, 10% area wash, crosshair + index tooltip.
export function line(canvas, { labels, data, color, points = true }) {
  const t = theme();
  const col = resolveColor(color);
  const axis = { grid: { color: t.grid, drawBorder: false, lineWidth: 1 }, ticks: { color: t.muted, padding: 6, maxTicksLimit: 6 }, border: { display: false } };
  const wash = ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 240);
    g.addColorStop(0, col + '2e'); g.addColorStop(1, col + '00');
    return g;
  };
  return mount(canvas, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: col, backgroundColor: c => wash(c.chart.ctx), borderWidth: 2, fill: true, tension: 0.35, borderJoinStyle: 'round', borderCapStyle: 'round',
      pointRadius: points ? 4 : 0, pointHoverRadius: 6, pointHitRadius: 24, pointBackgroundColor: col, pointBorderColor: t.surface, pointBorderWidth: 2 }] },
    options: {
      ...base(),
      interaction: { mode: 'index', intersect: false },
      scales: { x: { ...axis, grid: { display: false } }, y: { ...axis, ticks: { ...axis.ticks, callback: v => fmt(v).replace('₹', '') } } },
      plugins: { ...base().plugins, crosshair: { color: t.muted }, tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${fmt(c.raw)}` } } },
    },
    plugins: [crosshair],
  });
}

// Axis-free trend used inside hero cards and asset tiles.
export function sparkline(canvas, { data, color }) {
  const col = resolveColor(color);
  const wash = ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 60);
    g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00');
    return g;
  };
  return mount(canvas, {
    type: 'line',
    data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: col, backgroundColor: c => wash(c.chart.ctx), borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 0 }] },
    options: { ...base(), animation: reduceMotion() ? false : { duration: 900, easing: 'easeOutQuart' }, events: [], scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, layout: { padding: 2 } },
  });
}
