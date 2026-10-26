import { state, previousSnapshot, liquidity, sgbHoldings } from './store.js';
import { DATA_AS_OF, CAS_AS_OF, MF_SCHEMES } from './data.js';
import { fmt, fmtDate, pct, signed, signedPct, daysBetween, todayISO, sum } from './util.js';

// Every insight is derived from state; nothing here is a recommendation.
export function computeInsights() {
  const out = [];
  const top = state.byClass[0];
  if (top) out.push({
    key: 'largest', tone: 'info', color: top.color, icon: top.icon,
    title: `${top.label} is your largest asset class`,
    body: `${fmt(top.value)} — ${pct(top.pct)} of net worth across ${top.key === 'mf' ? `${MF_SCHEMES.length} schemes` : `${top.items.filter(h => h.value > 0).length} holdings`}.`,
    meta: `As of ${fmtDate(state.asOf)}`, href: top.key === 'mf' ? 'mf' : `assets/${top.key}`, hrefLabel: 'Open class',
  });

  const top3 = state.byClass.slice(0, 3);
  const top3Pct = sum(top3, c => c.pct);
  out.push({
    key: 'concentration', tone: top3Pct > 0.7 ? 'warn' : 'info', color: '#e5bd67', iconName: 'pie',
    title: `Top three classes hold ${pct(top3Pct, 0)} of the portfolio`,
    body: top3.map(c => `${c.short} ${pct(c.pct)}`).join(' · ') + `. ${state.byClass.length} classes carry value in total.`,
    meta: 'Concentration by asset class', href: 'assets', hrefLabel: 'Asset classes',
  });

  const prev = previousSnapshot();
  if (prev) {
    const d = state.total - prev.value;
    out.push({
      key: 'change', tone: d >= 0 ? 'good' : 'warn', color: d >= 0 ? '#3dd68c' : '#ff6b75', iconName: 'trend',
      title: `Net worth ${d >= 0 ? 'up' : 'down'} ${fmt(Math.abs(d))} since ${fmtDate(prev.date)}`,
      body: `${fmt(prev.value)} → ${fmt(state.total)} (${signedPct(d / prev.value)}). This is a valuation change, not an investment return — it includes any deposits or withdrawals.`,
      meta: `${daysBetween(prev.date, state.asOf)} days between snapshots`, href: 'performance', hrefLabel: 'Performance',
    });
  }

  const liq = liquidity();
  out.push({
    key: 'liquidity', tone: 'info', color: '#4c83ff', iconName: 'droplet',
    title: `${pct(liq.liquid / state.total, 0)} of the portfolio is liquid`,
    body: `Liquid ${fmt(liq.liquid)} · semi-liquid ${fmt(liq.semi)} · locked-in ${fmt(liq.locked)}. Buckets are assigned per asset class.`,
    meta: 'Liquidity profile', href: 'liquidity', hrefLabel: 'Liquidity',
  });

  const soon = sgbHoldings().map(h => ({ ...h, days: daysBetween(todayISO(), h.maturity) })).filter(h => h.days > 0 && h.days <= 548).sort((a, b) => a.days - b.days);
  if (soon.length) out.push({
    key: 'sgb', tone: 'good', color: '#f59e0b', iconName: 'sparkle',
    title: `${soon.length} SGB tranche${soon.length > 1 ? 's' : ''} matur${soon.length > 1 ? 'e' : 'es'} within 18 months`,
    body: `Nearest: ${soon[0].qty} g on ${fmtDate(soon[0].maturity)} (${soon[0].days} days), currently ${fmt(soon[0].value)}. Total maturing: ${fmt(sum(soon, h => h.value))}.`,
    meta: 'Redemption at RBI maturity is tax free', href: 'assets/sgb', hrefLabel: 'SGB tranches',
  });

  const casAge = daysBetween(CAS_AS_OF);
  if (casAge > 45) out.push({
    key: 'cas', tone: 'warn', color: '#f5a524', iconName: 'clock',
    title: `Mutual fund values are from a CAS dated ${fmtDate(CAS_AS_OF)}`,
    body: `${casAge} days old. ${fmt(state.classMap.mf || 0)} across ${MF_SCHEMES.length} schemes has not been revalued since; download a fresh CAS and update data.js.`,
    meta: 'Stale valuation', href: 'mf', hrefLabel: 'Mutual funds',
  });

  const dataAge = daysBetween(DATA_AS_OF);
  if (dataAge > 30) out.push({
    key: 'stale', tone: 'warn', color: '#f5a524', iconName: 'calendar',
    title: `Market prices were last updated ${dataAge} days ago`,
    body: `Stocks, ETFs, REITs, gold and silver reflect ${fmtDate(DATA_AS_OF)} prices. Use “Update values” or refresh data.js.`,
    meta: 'Reporting date', hrefLabel: 'Update', href: 'settings',
  });

  const overrides = state.holdings.filter(h => h.overridden);
  if (overrides.length) out.push({
    key: 'overrides', tone: 'info', color: '#9b7bff', iconName: 'refresh',
    title: `${overrides.length} holding${overrides.length > 1 ? 's' : ''} carry a manual override`,
    body: overrides.slice(0, 4).map(h => h.name).join(', ') + (overrides.length > 4 ? ` and ${overrides.length - 4} more` : '') + `. Overrides replace code values until data.js is updated past their date.`,
    meta: `Latest ${fmtDate(overrides.map(h => h.overridden).sort().pop())}`, href: 'portfolio', hrefLabel: 'Holdings',
  });

  const zero = state.holdings.filter(h => h.value === 0);
  if (zero.length) out.push({
    key: 'zero', tone: 'info', color: '#6f7f98', iconName: 'info',
    title: `${zero.length} position${zero.length > 1 ? 's' : ''} with no current value`,
    body: zero.map(h => `${h.name} (${h.account}${h.cost ? `, cost ${fmt(h.cost)}` : ''})`).join('; ') + '. Treated as closed and excluded from returns and tax.',
    meta: 'Data hygiene', href: 'portfolio', hrefLabel: 'Holdings',
  });

  const losers = state.holdings.filter(h => h.value > 0 && h.cost > 0 && h.value < h.cost);
  if (losers.length) {
    const loss = sum(losers, h => h.value - h.cost);
    out.push({
      key: 'losers', tone: 'info', color: '#ff6b75', iconName: 'chart',
      title: `${losers.length} holdings are below cost`,
      body: `Combined unrealised loss of ${fmt(Math.abs(loss))}; largest: ${[...losers].sort((a, b) => (a.value - a.cost) - (b.value - b.cost)).slice(0, 3).map(h => `${h.name} ${signed(h.value - h.cost)}`).join(', ')}.`,
      meta: 'Unrealised, versus purchase cost', href: 'performance', hrefLabel: 'Returns',
    });
  }
  return out;
}
