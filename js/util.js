const RAW = Symbol('raw');

export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const raw = s => ({ [RAW]: true, s: String(s), toString() { return this.s; } });

// Tagged template: interpolations are escaped unless they are html`` results, raw(), or arrays of those.
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) {
    out += part(vals[i]) + strings[i + 1];
  }
  return raw(out);
}
function part(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(part).join('');
  if (typeof v === 'object' && v[RAW]) return v.s;
  return esc(v);
}

export const sum = (arr, fn = x => x) => arr.reduce((a, x) => a + (fn(x) || 0), 0);

export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(x);
  }
  return map;
}

// ── Money ────────────────────────────────────────────────────────────
export function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(abs >= 1e6 ? 1 : 2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}
export function fmtShort(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
  return `${sign}${Math.round(abs)}`;
}
export const fmtFull = n => n == null || isNaN(n) ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`;
export const signed  = (n, f = fmt) => (n >= 0 ? '+' : '') + f(n);
export const pct     = (x, d = 1) => isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—';
export const signedPct = (x, d = 1) => isFinite(x) ? `${x >= 0 ? '+' : ''}${(x * 100).toFixed(d)}%` : '—';

// ── Dates (all ISO yyyy-mm-dd in; local calendar out) ───────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function toISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const todayISO = () => toISO(new Date());
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtMonth(iso) {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
export const daysBetween = (fromISO, toISO_ = todayISO()) =>
  Math.round((parseISO(toISO_) - parseISO(fromISO)) / 86400000);
export const yearsSince = iso => daysBetween(iso) / 365.25;

// ── Returns ──────────────────────────────────────────────────────────
// Weighted-average-holding-period approximation of XIRR; good enough for a dashboard.
export function estimateXIRR(items) {
  let cost = 0, value = 0, weightedDays = 0;
  for (const h of items) {
    if (!h.cost || h.cost <= 0 || !h.since) continue;
    const days = Math.max(1, daysBetween(h.since));
    cost += h.cost; value += h.value || 0; weightedDays += days * h.cost;
  }
  if (cost === 0 || value <= 0) return null;
  const avgYears = weightedDays / cost / 365.25;
  return Math.pow(value / cost, 1 / avgYears) - 1;
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
