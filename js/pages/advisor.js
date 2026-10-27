import { state, liquidityDetail, sgbHoldings, previousSnapshot } from '../store.js';
import { ASSET_CLASSES, MF_SCHEMES, DEFAULT_TARGETS, DATA_AS_OF, CAS_AS_OF } from '../data.js';
import { requestAdvice, Unauthorized } from '../api.js';
import { html, raw, fmt, fmtDate, pct, signed, sum, groupBy, $, $$ } from '../util.js';
import { pageHead, classBadge, icon, kpi, empty } from '../ui.js';
import { toast } from '../modal.js';
import { getTargets, setTargets } from './rebalance.js';
import { BUNDLED_ADVICE } from '../advice.js';

const CONTEXT_KEY = 'portfolio_advisor_context';
const ADVICE_KEY = 'portfolio_advisor_last';
const pref = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: k => { try { localStorage.removeItem(k); } catch {} } };

let root_ = null, busy = false;

// Numbers only — no account numbers, policy ids or notes leave the browser.
export function buildBrief(context) {
  const classes = state.byClass.map(c => ({
    cls: c.key, label: c.label, value_inr: c.value, weight_pct: +(c.pct * 100).toFixed(2), cost_inr: c.cost || null,
    gain_inr: c.cost ? c.value - c.cost : null, liquidity: c.liquidity, holdings: c.items.filter(h => h.value > 0).length,
  }));
  for (const key of Object.keys(ASSET_CLASSES)) if (!classes.some(c => c.cls === key)) classes.push({ cls: key, label: ASSET_CLASSES[key].label, value_inr: 0, weight_pct: 0, cost_inr: null, gain_inr: null, liquidity: ASSET_CLASSES[key].liquidity, holdings: 0 });
  // Strip policy/folio-style identifiers from names before they leave the browser.
  const safeName = h => h.name.replace(/[A-Z]{0,3}\d{5,}[A-Z0-9]*/g, '').replace(/\s+/g, ' ').trim() || ASSET_CLASSES[h.cls].label;
  const top = [...state.holdings].filter(h => h.value > 0).sort((a, b) => b.value - a.value).slice(0, 15)
    .map(h => ({ name: safeName(h), cls: h.cls, value_inr: h.value, weight_pct: +(h.value / state.total * 100).toFixed(2), cost_inr: h.cost || null, since: h.since, maturity: h.maturity || null }));
  const mfTotal = sum(MF_SCHEMES, s => s.value);
  const mfCats = [...groupBy(MF_SCHEMES, s => s.cat)].map(([cat, items]) => ({ category: cat, weight_pct: +(sum(items, s => s.value) / mfTotal * 100).toFixed(1) })).sort((a, b) => b.weight_pct - a.weight_pct);
  const prev = previousSnapshot();
  return {
    as_of: state.asOf, prices_as_of: DATA_AS_OF, mf_cas_as_of: CAS_AS_OF, currency: 'INR',
    total_inr: state.total, cost_inr: state.cost, unrealised_gain_inr: state.total - state.cost,
    change_since_previous: prev ? { date: prev.date, value_inr: prev.value, delta_inr: state.total - prev.value } : null,
    classes, top_holdings: top,
    mutual_funds: { schemes: MF_SCHEMES.length, value_inr: mfTotal, cost_inr: sum(MF_SCHEMES, s => s.cost), categories: mfCats },
    sgb_maturities: sgbHoldings().map(h => ({ grams: h.qty, matures: h.maturity, value_inr: h.value, cost_inr: h.cost })),
    liquidity: liquidityDetail().map(b => ({ bucket: b.key, value_inr: b.value, weight_pct: +(b.pct * 100).toFixed(1), classes: b.classes.map(c => c.key) })),
    net_worth_history: state.snapshots,
    current_targets_pct: getTargets(),
    class_keys: Object.keys(ASSET_CLASSES),
    notes: [
      'Mutual fund values come from a CAS statement and are not marked to market daily.',
      'Unlisted share values are dealer quotes; NSE pre-IPO shares are locked until Mar 2027.',
      state.holdings.filter(h => h.value === 0).length ? `${state.holdings.filter(h => h.value === 0).length} positions carry zero value and are treated as closed.` : null,
    ].filter(Boolean),
  };
}

export function render(root) {
  root_ = root;
  const context = pref.get(CONTEXT_KEY) || '';
  const last = loadLast();
  root.innerHTML = html`
    ${pageHead('AI Advisor', 'Claude reads your allocation and proposes a rebalancing — at asset-class level, from your numbers only')}
    <div class="grid cols-2-3">
      <div class="card">
        <div class="card-head"><h3>Your context</h3><span class="muted">optional</span></div>
        <div class="field"><label for="advContext">Goals, horizon, constraints, upcoming cash needs</label>
          <textarea id="advContext" class="input area" rows="7" placeholder="e.g. Retire in 12 years. Moderate risk. Need ₹20 L for a house deposit in 2027. Prefer to keep SGBs to maturity. Monthly SIP capacity ₹1 L.">${context}</textarea></div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap">
          <button class="btn btn-primary" id="advRun" ${state.offline ? 'disabled' : ''}>${icon('sparkle')}${last ? 'Re-analyse portfolio' : 'Analyse portfolio'}</button>
          ${loadLocal() ? html`<button class="btn btn-ghost" id="advClear">Clear</button>` : ''}
        </div>
        <div class="note">Sends a numeric brief (class weights, top holdings, MF mix, SGB dates, history) to your proxy, which calls Claude. No account numbers or notes are included. Each run costs a few rupees of API usage.${state.offline ? ' Unavailable while the data server is unreachable.' : ''}</div>
      </div>
      <div class="card"><div class="card-head"><h3>What gets analysed</h3><span class="muted">as of ${fmtDate(state.asOf)}</span></div>
        <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:0">
          ${kpi('Net worth', fmt(state.total))}${kpi('Asset classes', String(state.byClass.length))}
          ${kpi('Top holdings sent', '15')}${kpi('Snapshots', String(state.snapshots.length))}
        </div>
        <div class="note">The advisor sees the same figures as the Overview, plus your current Rebalance targets, so you can compare its proposal with yours and apply it with one click.</div></div>
    </div>
    <div id="advResult">${last ? renderAdvice(last) : html`<div class="card">${empty('Run an analysis to see observations, a proposed allocation and suggested actions.', 'No analysis yet')}</div>`}</div>`;

  $('#advContext', root).addEventListener('input', e => pref.set(CONTEXT_KEY, e.target.value));
  $('#advRun', root).addEventListener('click', run);
  $('#advClear', root)?.addEventListener('click', () => { pref.del(ADVICE_KEY); render(root_); });
}

function loadLocal() {
  try { const v = JSON.parse(pref.get(ADVICE_KEY) || 'null'); return v && v.advice ? v : null; } catch { return null; }
}
const loadLast = () => loadLocal() || BUNDLED_ADVICE;

async function run() {
  if (busy) return;
  busy = true;
  const btn = $('#advRun', root_), out = $('#advResult', root_);
  btn.disabled = true;
  out.innerHTML = html`<div class="card"><div class="card-head"><h3>Analysing…</h3><span class="muted" id="advStatus">Sending brief to Claude</span></div>
    <div class="skeleton" style="height:18px;width:60%;margin-bottom:10px"></div><div class="skeleton" style="height:14px;width:90%;margin-bottom:8px"></div><div class="skeleton" style="height:14px;width:80%;margin-bottom:18px"></div>
    <div class="grid cols-3" style="margin:0">${[1, 2, 3].map(() => html`<div class="skeleton" style="height:90px"></div>`)}</div></div>`;
  const t = setTimeout(() => { const s = $('#advStatus', root_); if (s) s.textContent = 'Claude is reasoning over the allocation — usually 20–60 seconds'; }, 5000);
  try {
    const context = pref.get(CONTEXT_KEY) || '';
    const res = await requestAdvice(buildBrief(context), context);
    const record = { generatedAt: res.generatedAt, model: res.model, usage: res.usage, asOf: state.asOf, total: state.total, advice: normalise(res.advice) };
    pref.set(ADVICE_KEY, JSON.stringify(record));
    out.innerHTML = renderAdvice(record);
    toast('Analysis ready');
  } catch (e) {
    if (e instanceof Unauthorized) { toast('Session expired — please sign in again.'); setTimeout(() => location.reload(), 1200); return; }
    out.innerHTML = html`<div class="card"><div class="alert warn" style="margin:0">${icon('alert')}<div><b>Analysis failed.</b> ${e.message}${/not configured/i.test(e.message) ? html`<div class="small muted" style="margin-top:6px">Set <code>ANTHROPIC_API_KEY</code> in the Render environment for portfolio-proxy and redeploy.</div>` : ''}</div></div></div>`;
  } finally {
    clearTimeout(t); busy = false; btn.disabled = false;
    btn.innerHTML = html`${icon('sparkle')}Re-analyse portfolio`;
  }
}

// Clamp the model's allocation to known classes and renormalise to 100.
function normalise(a) {
  const keys = Object.keys(ASSET_CLASSES);
  const alloc = {};
  for (const t of a.target_allocation || []) if (keys.includes(t.cls)) alloc[t.cls] = { pct: Math.max(0, Number(t.pct) || 0), rationale: t.rationale || '' };
  const total = sum(Object.values(alloc), x => x.pct) || 1;
  for (const k of Object.keys(alloc)) alloc[k].pct = +(alloc[k].pct / total * 100).toFixed(1);
  return { ...a, target_allocation: alloc, actions: (a.actions || []).filter(x => keys.includes(x.cls)) };
}

const SEV = { act: ['down', 'Act'], watch: ['gold', 'Watch'], info: ['dim', 'Info'] };
const PRIO = { high: 'down', medium: 'gold', low: 'dim' };

function renderAdvice(rec) {
  const a = rec.advice;
  const rows = Object.keys(ASSET_CLASSES).map(key => {
    const cur = (state.classMap[key] || 0) / state.total * 100, tgt = a.target_allocation[key]?.pct ?? 0;
    return { key, cur, tgt, diff: (tgt - cur) / 100 * state.total, rationale: a.target_allocation[key]?.rationale || '' };
  }).filter(r => r.cur > 0 || r.tgt > 0).sort((x, y) => y.tgt - x.tgt);
  const stale = rec.asOf !== state.asOf || rec.total !== state.total;
  return html`
    ${stale ? html`<div class="alert warn">${icon('alert')}<div><b>Portfolio has changed since this analysis</b> (it was based on ${fmt(rec.total)} as of ${fmtDate(rec.asOf)}). Re-analyse for current figures.</div></div>` : ''}
    <div class="card" style="margin-bottom:var(--gap)">
      <div class="card-head"><h3>Assessment</h3><span class="muted">${rec.source === 'bundled' ? 'Bundled analysis · ' : ''}${new Date(rec.generatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${rec.model}${rec.usage ? ` · ${rec.usage.input_tokens + rec.usage.output_tokens} tokens` : ''}</span></div>
      <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap"><span class="badge gold" style="text-transform:capitalize">${a.stance} posture</span></div>
      <p style="margin-top:10px;font-size:14px;line-height:1.6">${a.summary}</p>
    </div>
    <div class="section-head"><h2>Observations</h2><span class="muted">${a.observations.length}</span></div>
    <div class="grid cols-3">${a.observations.map(o => html`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:6px"><b style="font-size:13px">${o.title}</b><span class="badge ${SEV[o.severity]?.[0] || ''}">${SEV[o.severity]?.[1] || o.severity}</span></div><p class="small dim" style="line-height:1.55">${o.detail}</p></div>`)}</div>
    <div class="grid cols-3-2">
      <div class="card"><div class="card-head"><h3>Proposed allocation</h3><div class="actions"><button class="btn small btn-primary" data-action="applyAdvice">${icon('scale')}Apply to Rebalance</button></div></div>
        <div class="table-wrap"><table class="tbl compact"><thead><tr><th>Class</th><th class="right">Now</th><th class="right">Proposed</th><th class="right">Move</th><th>Why</th></tr></thead>
        <tbody>${rows.map(r => html`<tr><td>${classBadge(r.key)}</td><td class="right muted">${r.cur.toFixed(1)}%</td><td class="right gold">${r.tgt.toFixed(1)}%</td>
          <td class="right ${Math.abs(r.diff) < 50000 ? 'muted' : r.diff > 0 ? 'up' : 'down'}">${Math.abs(r.diff) < 50000 ? '—' : signed(r.diff)}</td><td class="small dim">${r.rationale}</td></tr>`)}</tbody>
        <tfoot><tr><td>Total</td><td class="right">100%</td><td class="right">${sum(rows, r => r.tgt).toFixed(0)}%</td><td></td><td></td></tr></tfoot></table></div>
        <div class="note">"Move" is the rupee gap between the proposed weight and today's value, using net worth ${fmt(state.total)} as the base.</div></div>
      <div class="card"><div class="card-head"><h3>Suggested actions</h3><span class="muted">${a.actions.length}</span></div>
        ${a.actions.length ? a.actions.map(x => html`<div class="action-card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="tag ${x.type === 'buy' ? 'up' : x.type === 'sell' ? 'down' : 'gold'}" style="text-transform:uppercase">${x.type} · ${ASSET_CLASSES[x.cls]?.label || x.cls}</span><span class="badge ${PRIO[x.priority] || ''}">${x.priority}</span></div>
          ${x.amount_inr ? html`<div class="amt">${fmt(Math.abs(x.amount_inr))}</div>` : ''}<p class="small dim" style="line-height:1.5">${x.rationale}</p></div>`) : empty('No actions suggested — the portfolio is within the advisor\'s tolerance.')}</div>
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Risks to keep in view</h3></div><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${a.risks.map(r => html`<li>${r}</li>`)}</ul></div>
      <div class="card"><div class="card-head"><h3>Questions that would sharpen this</h3></div>${a.questions.length ? html`<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${a.questions.map(q => html`<li>${q}</li>`)}</ul><div class="note">Answer these in the context box above and re-analyse.</div>` : empty('None.')}</div>
    </div>
    <div class="alert info">${icon('info')}<div>${a.disclaimer}</div></div>`;
}

export function onAction(name) {
  if (name !== 'applyAdvice') return false;
  const last = loadLast();
  if (!last) return true;
  const map = Object.fromEntries(Object.keys(DEFAULT_TARGETS).map(k => [k, last.advice.target_allocation[k]?.pct ?? 0]));
  // Integer targets must still sum to 100 for the Rebalance page's check.
  const rounded = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Math.round(v)]));
  const drift = 100 - sum(Object.values(rounded), v => v);
  if (drift) { const big = Object.entries(rounded).sort((x, y) => y[1] - x[1])[0][0]; rounded[big] += drift; }
  setTargets(rounded);
  toast('Advisor targets applied to Rebalance');
  location.hash = 'rebalance';
  return true;
}
