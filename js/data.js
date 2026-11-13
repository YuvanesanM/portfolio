// Static configuration lives here. Portfolio figures do NOT: they are loaded at sign-in from
// the private proxy (GET /data) and applied with applyData(), which rebinds the exports below.

export const ASSET_CLASSES = {
  mf:        { label: 'Mutual Funds',     short: 'MF',        color: 'var(--c-mf)', icon: 'pie',      liquidity: 'liquid',   tax: 'equity'   },
  fd:        { label: 'Fixed Deposits',   short: 'FD',        color: 'var(--c-fd)', icon: 'bank',     liquidity: 'liquid',   tax: 'slab'     },
  sgb:       { label: 'Sovereign Gold',   short: 'SGB',       color: 'var(--c-sgb)', icon: 'sparkle',  liquidity: 'locked',   tax: 'sgb'      },
  pms:       { label: 'PMS',              short: 'PMS',       color: 'var(--c-pms)', icon: 'briefcase',liquidity: 'locked',   tax: 'equity'   },
  aif:       { label: 'AIF',              short: 'AIF',       color: 'var(--c-aif)', icon: 'layers',   liquidity: 'locked',   tax: 'aif'      },
  stocks:    { label: 'Stocks & ETFs',    short: 'Stocks',    color: 'var(--c-stocks)', icon: 'trend',    liquidity: 'semi',     tax: 'equity'   },
  reit:      { label: 'REIT & InvIT',     short: 'REIT',      color: 'var(--c-reit)', icon: 'building', liquidity: 'semi',     tax: 'equity'   },
  unlisted:  { label: 'Unlisted Shares',  short: 'Unlisted',  color: 'var(--c-unlisted)', icon: 'unlock',   liquidity: 'semi',     tax: 'unlisted' },
  coin:      { label: 'Gold & Silver',    short: 'Coins',     color: 'var(--c-coin)', icon: 'coins',    liquidity: 'semi',     tax: 'metal'    },
  ssy:       { label: 'SSY',              short: 'SSY',       color: 'var(--c-ssy)', icon: 'users',    liquidity: 'locked',   tax: 'free'     },
  insurance: { label: 'Insurance',        short: 'Insurance', color: 'var(--c-insurance)', icon: 'shield',   liquidity: 'locked',   tax: 'free'     },
  nps:       { label: 'NPS',              short: 'NPS',       color: 'var(--c-nps)', icon: 'landmark', liquidity: 'locked',   tax: 'nps'      },
  crypto:    { label: 'Crypto',           short: 'Crypto',    color: 'var(--c-crypto)', icon: 'bitcoin',  liquidity: 'liquid',   tax: 'crypto'   },
  savings:   { label: 'Savings',          short: 'Savings',   color: 'var(--c-savings)', icon: 'wallet',   liquidity: 'liquid',   tax: 'slab'     },
};

export const MF_HOUSE_COLORS = {
  ICICI: '#3b82f6', SBI: '#22c55e', Nippon: '#f43f5e', Motilal: '#8b5cf6', HDFC: '#f59e0b',
  Invesco: '#14b8a6', Bajaj: '#f97316', Kotak: '#06b6d4', Franklin: '#d946ef', Axis: '#eab308',
  Bandhan: '#6366f1', HSBC: '#84cc16',
};
export const MF_CAT_COLORS = {
  FOF: '#3b82f6', 'Multi Asset': '#f59e0b', Thematic: '#f97316', 'Large & Mid': '#22c55e',
  'Flexi Cap': '#8b5cf6', Sectoral: '#f43f5e', 'Mid Cap': '#14b8a6', 'Multi Cap': '#06b6d4',
  'Large Cap': '#eab308', Commodity: '#d946ef', Index: '#6366f1', Hybrid: '#84cc16',
  Focused: '#ec4899', 'Small Cap': '#64748b', Contra: '#0ea5e9',
};

export const TAX_RULES = [
  { asset: 'Equity MF / Stocks / ETF', period: '1 year',  ltcg: '12.5%',             stcg: '20%',  note: 'LTCG above ₹1.25L per year is taxed' },
  { asset: 'SGB held to maturity',     period: '8 years', ltcg: 'Tax free',           stcg: 'Slab', note: 'Only on RBI redemption; early exit is taxed' },
  { asset: 'Gold / Silver (physical)', period: '2 years', ltcg: '12.5%',             stcg: 'Slab', note: 'Rule since July 2024 budget' },
  { asset: 'REIT / InvIT',             period: '1 year',  ltcg: '12.5%',             stcg: '20%',  note: 'Distributions partially taxable' },
  { asset: 'Unlisted shares',          period: '2 years', ltcg: '12.5%',             stcg: 'Slab', note: 'No indexation since July 2024' },
  { asset: 'Fixed Deposit',            period: '—',       ltcg: 'Slab',              stcg: 'Slab', note: 'Interest taxed as income each year' },
  { asset: 'AIF (Category III)',       period: '—',       ltcg: 'Taxed at fund level', stcg: '—',  note: 'Depends on category and structure' },
  { asset: 'NPS',                      period: '—',       ltcg: '60% tax free at 60', stcg: '—',  note: '40% must buy an annuity' },
  { asset: 'ULIP / Insurance',         period: '—',       ltcg: 'Exempt if premium ≤ ₹2.5L/yr', stcg: '—', note: 'Sum assured must be ≥ 10× premium' },
  { asset: 'Crypto',                   period: '—',       ltcg: '30% flat',          stcg: '30%',  note: 'Plus 1% TDS; losses cannot be set off' },
];

// ── Portfolio data: rebound by applyData() once the proxy responds ───
export let DATA_AS_OF = '';
export let CAS_AS_OF = '';
export let TARGET_NET_WORTH = 100_000_000;
export let OWNERS = {};
export let HOLDINGS = [];
export let SNAPSHOTS = [];
export let MF_SCHEMES = [];
export let DEFAULT_TARGETS = {};
export let BUNDLED_ADVICE = null;
export let dataLoaded = false;

export function applyData(d) {
  if (!d || !Array.isArray(d.HOLDINGS)) throw new Error('Portfolio data is malformed');
  DATA_AS_OF = String(d.DATA_AS_OF || '');
  CAS_AS_OF = String(d.CAS_AS_OF || '');
  TARGET_NET_WORTH = Number(d.TARGET_NET_WORTH) || 100_000_000;
  OWNERS = d.OWNERS || {};
  HOLDINGS = d.HOLDINGS.filter(h => h && h.id && ASSET_CLASSES[h.cls]);
  SNAPSHOTS = (d.SNAPSHOTS || []).filter(s => s && s.date && s.value > 0);
  MF_SCHEMES = d.MF_SCHEMES || [];
  DEFAULT_TARGETS = d.DEFAULT_TARGETS || Object.fromEntries(Object.keys(ASSET_CLASSES).map(k => [k, 0]));
  BUNDLED_ADVICE = d.ADVICE || null;
  dataLoaded = true;
}
