import { HOLDINGS, MF_SCHEMES, SNAPSHOTS, ASSET_CLASSES, DATA_AS_OF } from './data.js';
import { sum, groupBy } from './util.js';

// Live state. `holdings` are materialized copies of data.js rows with value/cost resolved.
export const state = {
  holdings: [],
  byClass: [],        // [{ key, label, color, value, cost, pct }] sorted by value desc
  classMap: {},       // key → value
  total: 0,
  cost: 0,
  asOf: DATA_AS_OF,
  snapshots: [],
  notes: {},
  overrides: {},      // id → { price?, value?, qty?, asOf }
  remote: null,       // raw remote file (null when offline)
  offline: false,
};

export const mfTotals = () => {
  const t = { Yuvan: { value: 0, cost: 0, count: 0 }, Ramyaa: { value: 0, cost: 0, count: 0 } };
  for (const s of MF_SCHEMES) {
    const o = t[s.owner] || (t[s.owner] = { value: 0, cost: 0, count: 0 });
    o.value += s.value || 0; o.cost += s.cost || 0; o.count++;
  }
  return t;
};

function overrideActive(o) {
  return o && o.asOf && o.asOf > DATA_AS_OF;
}

function materialize(src, override) {
  const h = { ...src };
  if (h.mf) {
    const t = mfTotals()[h.mf] || { value: 0, cost: 0, count: 0 };
    h.value = Math.round(t.value); h.cost = Math.round(t.cost); h.schemes = t.count;
    return h;
  }
  if (overrideActive(override)) {
    if (override.qty != null) h.qty = override.qty;
    if (override.price != null && h.price != null) h.price = override.price;
    else if (override.value != null) h.value = override.value;
    h.overridden = override.asOf;
  }
  if (h.price != null) h.value = Math.round((h.qty || 0) * h.price);
  return h;
}

export function recompute() {
  state.holdings = HOLDINGS.map(h => materialize(h, state.overrides[h.id]));
  state.total = sum(state.holdings, h => h.value);
  state.cost  = sum(state.holdings.filter(h => h.value > 0), h => h.cost);
  const groups = groupBy(state.holdings, h => h.cls);
  state.byClass = Object.keys(ASSET_CLASSES)
    .map(key => {
      const items = groups.get(key) || [];
      const value = sum(items, h => h.value);
      return { key, ...ASSET_CLASSES[key], items, value, cost: sum(items.filter(h => h.value > 0), h => h.cost), pct: state.total ? value / state.total : 0 };
    })
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);
  state.classMap = Object.fromEntries(state.byClass.map(c => [c.key, c.value]));
  const latestOverride = Object.values(state.overrides).filter(overrideActive).map(o => o.asOf).sort().pop();
  state.asOf = latestOverride && latestOverride > DATA_AS_OF ? latestOverride : DATA_AS_OF;
}

function mergeSnapshots(remote) {
  const byDate = new Map(SNAPSHOTS.map(s => [s.date, s.value]));
  for (const s of remote || []) if (s?.date && s.value > 0) byDate.set(s.date, s.value);
  return [...byDate].map(([date, value]) => ({ date, value })).sort((a, b) => a.date < b.date ? -1 : 1);
}

export function hydrate(remote) {
  state.remote = remote;
  state.offline = !remote;
  state.notes = { ...(remote?.notes || {}) };
  state.overrides = remote?.version >= 2 ? { ...(remote.overrides || {}) } : {};
  state.snapshots = mergeSnapshots(remote?.snapshots);
  recompute();
}

export const liquidity = () => {
  const out = { liquid: 0, semi: 0, locked: 0 };
  for (const c of state.byClass) out[c.liquidity] += c.value;
  return out;
};

export const previousSnapshot = () => {
  const before = state.snapshots.filter(s => s.date < state.asOf);
  return before[before.length - 1] || null;
};

export const sgbHoldings = () => state.holdings.filter(h => h.cls === 'sgb');
export const activeHoldings = () => state.holdings.filter(h => h.value > 0);

export function savePayload(asOf) {
  return {
    version: 2,
    asOf,
    overrides: state.overrides,
    notes: state.notes,
    snapshots: state.snapshots,
    // Materialized copy for readers of the raw file; the app never reads it back.
    holdings: state.holdings.map(({ id, cls, owner, account, name, value, cost }) => ({ id, cls, owner, account, name, value, cost })),
  };
}
