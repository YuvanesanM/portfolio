import { activeHoldings } from '../store.js';
import { ASSET_CLASSES, TAX_RULES } from '../data.js';
import { html, fmt, fmtDate, pct, signed, sum, daysBetween, yearsSince } from '../util.js';
import { pageHead, kpi, ownerBadge, icon } from '../ui.js';

const LTCG_EXEMPT = 125000;
function taxInfo(h) {
  const gain = h.value - h.cost, days = daysBetween(h.since), pos = Math.max(0, gain);
  switch (ASSET_CLASSES[h.cls].tax) {
    case 'equity':   return days >= 365 ? { label: 'LTCG 12.5%', kind: 'ltcg', est: pos * 0.125, info: '₹1.25L/yr exempt overall' } : { label: 'STCG 20%', kind: 'stcg', est: pos * 0.20, info: 'Held under 1 year' };
    case 'unlisted': return days >= 730 ? { label: 'LTCG 12.5%', kind: 'ltcg', est: pos * 0.125, info: 'Held over 2 years' } : { label: 'Slab rate', kind: 'stcg', est: pos * 0.30, info: 'Held under 2 years' };
    case 'metal':    return days >= 730 ? { label: 'LTCG 12.5%', kind: 'ltcg', est: pos * 0.125, info: 'Held over 2 years' } : { label: 'Slab rate', kind: 'stcg', est: pos * 0.30, info: 'Held under 2 years' };
    case 'sgb':      return { label: 'Tax free', kind: 'free', est: 0, info: 'Exempt at RBI maturity' };
    case 'free':     return { label: 'Exempt', kind: 'free', est: 0, info: h.cls === 'ssy' ? 'EEE under 80C' : 'Subject to policy terms' };
    case 'nps':      return { label: '60% exempt', kind: 'partial', est: 0, info: 'At withdrawal after 60' };
    case 'aif':      return { label: 'Fund level', kind: 'slab', est: pos * 0.125, info: 'Depends on AIF category' };
    case 'crypto':   return { label: '30% flat', kind: 'stcg', est: pos * 0.30, info: 'No set-off of losses' };
    default:         return { label: 'Income slab', kind: 'slab', est: pos * 0.30, info: 'Interest taxed yearly' };
  }
}
const KIND_TONE = { free: 'up', ltcg: 'gold', stcg: 'down', slab: '', partial: '', na: 'muted' };

export function render(root) {
  const rows = activeHoldings().filter(h => h.cost > 0).map(h => ({ ...h, gain: h.value - h.cost, tax: taxInfo(h) }));
  const total = sum(rows, r => r.gain);
  const by = kind => rows.filter(r => r.tax.kind === kind);
  const ltcg = Math.max(0, sum(by('ltcg'), r => r.tax.est) - LTCG_EXEMPT * 0.125);
  const stcg = sum([...by('stcg'), ...by('slab')], r => r.tax.est);
  const freeGain = sum([...by('free'), ...by('partial')], r => Math.max(0, r.gain));
  root.innerHTML = html`
    ${pageHead('Tax', 'Indicative capital-gains exposure if every position were sold today')}
    <div class="hero">
      <div class="card hero-main">
        <span class="hero-label">${icon('receipt')} Estimated tax if fully realised</span>
        <span class="hero-value">${fmt(ltcg + stcg)}</span>
        <div class="hero-sub"><span>on ${fmt(total)} unrealised gain</span><span class="sep">·</span><span class="muted">${pct((ltcg + stcg) / Math.max(1, total))} effective</span></div>
      </div>
      <div class="card hero-side">
        ${kpi('Tax-free gains', fmt(freeGain), 'up', 'SGB at maturity, SSY, insurance')}
        ${kpi('LTCG tax', fmt(ltcg), '', 'net of ₹1.25L exemption')}
        ${kpi('STCG / slab tax', fmt(stcg), 'down', 'short holding periods')}
        ${kpi('Positions', String(rows.length), '', 'with a cost basis')}
      </div>
    </div>
    <div class="alert warn">${icon('alert')}<div><b>Estimates only.</b> Headline rates for FY 2026-27; surcharge, cess, indexation history, loss set-off and grandfathering are ignored. Confirm with your CA before acting.</div></div>
    <div class="card" style="margin-bottom:var(--gap)"><div class="card-head"><h3>Per holding</h3></div><div class="table-wrap"><table class="tbl compact">
      <thead><tr><th>Holding</th><th>Owner</th><th>Bought</th><th class="right">Held</th><th class="right">Gain</th><th>Treatment</th><th class="right">Est. tax</th></tr></thead>
      <tbody>${rows.sort((a, b) => b.gain - a.gain).map(r => html`<tr>
        <td><span class="main-cell">${r.name}</span><span class="sub">${ASSET_CLASSES[r.cls].label}</span></td><td>${ownerBadge(r.owner)}</td>
        <td class="muted">${fmtDate(r.since)}</td><td class="right muted">${yearsSince(r.since).toFixed(1)} y</td>
        <td class="right ${r.gain >= 0 ? 'up' : 'down'}">${signed(r.gain)}</td>
        <td><span class="badge ${KIND_TONE[r.tax.kind]}">${r.tax.label}</span><span class="sub">${r.tax.info}</span></td>
        <td class="right ${r.tax.est > 0 ? 'down' : 'muted'}">${r.tax.est > 0 ? fmt(r.tax.est) : '—'}</td></tr>`)}</tbody>
    </table></div></div>
    <div class="card"><div class="card-head"><h3>Rules reference</h3></div><div class="table-wrap"><table class="tbl compact">
      <thead><tr><th>Asset</th><th>Long-term after</th><th>LTCG</th><th>STCG</th><th>Notes</th></tr></thead>
      <tbody>${TAX_RULES.map(r => html`<tr><td class="main-cell">${r.asset}</td><td>${r.period}</td><td>${r.ltcg}</td><td>${r.stcg}</td><td class="muted">${r.note}</td></tr>`)}</tbody>
    </table></div></div>`;
}
