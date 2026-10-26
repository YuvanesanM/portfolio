import { fmt } from './util.js';

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function theme() {
  return {
    text: cssVar('--text-2'), muted: cssVar('--text-3'), grid: cssVar('--border'),
    surface: cssVar('--surface'), tooltipBg: cssVar('--surface-2'), tooltipText: cssVar('--text'),
  };
}

function base() {
  const t = theme();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
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

export function doughnut(canvas, { labels, data, colors, total, legend = false }) {
  const t = theme();
  return mount(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: t.surface, borderWidth: 2, hoverOffset: 6 }] },
    options: {
      ...base(), cutout: '70%',
      plugins: {
        ...base().plugins,
        legend: legend ? { display: true, position: 'bottom', labels: { color: t.text, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', padding: 12 } } : { display: false },
        tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${fmt(c.raw)}${total ? ` · ${(c.raw / total * 100).toFixed(1)}%` : ''}` } },
      },
    },
  });
}

export function bars(canvas, { labels, data, colors, horizontal = false, tip }) {
  const t = theme();
  const axis = { grid: { color: t.grid, drawBorder: false }, ticks: { color: t.muted }, border: { display: false } };
  const money = { ...axis, ticks: { ...axis.ticks, callback: v => fmt(v).replace('₹', '') } };
  return mount(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6, borderSkipped: false, maxBarThickness: 28 }] },
    options: {
      ...base(), indexAxis: horizontal ? 'y' : 'x',
      scales: horizontal
        ? { x: money, y: { ...axis, grid: { display: false }, ticks: { color: t.text } } }
        : { x: { ...axis, grid: { display: false }, ticks: { color: t.text } }, y: money },
      plugins: { ...base().plugins, tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${tip ? tip(c) : fmt(c.raw)}` } } },
    },
  });
}

export function line(canvas, { labels, data, color }) {
  const t = theme();
  const axis = { grid: { color: t.grid, drawBorder: false }, ticks: { color: t.muted }, border: { display: false } };
  const gradient = ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 240);
    g.addColorStop(0, color + '33'); g.addColorStop(1, color + '00');
    return g;
  };
  return mount(canvas, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: color, backgroundColor: c => gradient(c.chart.ctx), borderWidth: 2, fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: color }] },
    options: {
      ...base(),
      scales: { x: { ...axis, grid: { display: false } }, y: { ...axis, ticks: { ...axis.ticks, callback: v => fmt(v).replace('₹', '') } } },
      plugins: { ...base().plugins, tooltip: { ...base().plugins.tooltip, callbacks: { label: c => ` ${fmt(c.raw)}` } } },
    },
  });
}
