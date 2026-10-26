import { fmt } from './util.js';

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
    animation: reduceMotion() ? false : { duration: 450, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.tooltipBg, titleColor: t.tooltipText, bodyColor: t.tooltipText,
        borderColor: t.grid, borderWidth: 1, padding: 10, cornerRadius: 8, displayColors: true,
        boxPadding: 4, titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' },
      },
    },
  };
}

export function destroyChart(canvas) {
  if (!canvas) return;
  Chart.getChart(canvas)?.destroy();
}
export function destroyAll() {
  Object.values(Chart.instances).forEach(c => c.destroy());
}
function mount(canvas, config) {
  if (!canvas) return null;
  destroyChart(canvas);
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size = 11;
  return new Chart(canvas.getContext('2d'), config);
}

export function doughnut(canvas, { labels, data, colors, total, legend = false, onHover, onClick, cutout = '72%' }) {
  const t = theme();
  return mount(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: t.surface, borderWidth: 2, hoverOffset: 8, hoverBorderColor: t.surface }] },
    options: {
      ...base(), cutout,
      onHover: (e, els) => { if (onHover) onHover(els.length ? els[0].index : null); e.native.target.style.cursor = els.length && onClick ? 'pointer' : 'default'; },
      onClick: (e, els) => { if (onClick && els.length) onClick(els[0].index); },
      plugins: {
        ...base().plugins,
        legend: legend ? { display: true, position: 'bottom', labels: { color: t.text, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', padding: 12 } } : { display: false },
        tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${fmt(c.raw)}${total ? ` · ${(c.raw / total * 100).toFixed(1)}%` : ''}` } },
      },
    },
  });
}

export function bars(canvas, { labels, data, colors, horizontal = false, tip, onClick, percent = false }) {
  const t = theme();
  const axis = { grid: { color: t.grid, drawBorder: false }, ticks: { color: t.muted }, border: { display: false } };
  const valueAxis = { ...axis, ticks: { ...axis.ticks, callback: v => percent ? `${v}%` : fmt(v).replace('₹', '') } };
  const labelAxis = { ...axis, grid: { display: false }, ticks: { color: t.text, autoSkip: false } };
  return mount(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 5, borderSkipped: false, maxBarThickness: 22 }] },
    options: {
      ...base(), indexAxis: horizontal ? 'y' : 'x',
      onHover: (e, els) => { e.native.target.style.cursor = els.length && onClick ? 'pointer' : 'default'; },
      onClick: (e, els) => { if (onClick && els.length) onClick(els[0].index); },
      scales: horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis },
      plugins: { ...base().plugins, tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${tip ? tip(c) : fmt(c.raw)}` } } },
    },
  });
}

export function line(canvas, { labels, data, color, points = true }) {
  const t = theme();
  const axis = { grid: { color: t.grid, drawBorder: false }, ticks: { color: t.muted }, border: { display: false } };
  const gradient = ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 240);
    g.addColorStop(0, color + '40'); g.addColorStop(1, color + '00');
    return g;
  };
  return mount(canvas, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: color, backgroundColor: c => gradient(c.chart.ctx), borderWidth: 2, fill: true, tension: 0.35, pointRadius: points ? 3 : 0, pointHoverRadius: 6, pointBackgroundColor: color, pointBorderColor: t.surface, pointBorderWidth: 1.5 }] },
    options: {
      ...base(),
      interaction: { mode: 'index', intersect: false },
      scales: { x: { ...axis, grid: { display: false } }, y: { ...axis, ticks: { ...axis.ticks, callback: v => fmt(v).replace('₹', '') } } },
      plugins: { ...base().plugins, tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${fmt(c.raw)}` } } },
    },
  });
}

// Axis-free trend used inside hero cards and asset tiles.
export function sparkline(canvas, { data, color }) {
  const gradient = ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 60);
    g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00');
    return g;
  };
  return mount(canvas, {
    type: 'line',
    data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: color, backgroundColor: c => gradient(c.chart.ctx), borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 0 }] },
    options: { ...base(), events: [], scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, layout: { padding: 2 } },
  });
}
