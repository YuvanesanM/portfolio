import { computeInsights } from '../insights.js';
import { state } from '../store.js';
import { html, fmtDate } from '../util.js';
import { pageHead, insightCard, icon } from '../ui.js';

export function render(root) {
  const all = computeInsights();
  const warn = all.filter(i => i.tone === 'warn'), rest = all.filter(i => i.tone !== 'warn');
  root.innerHTML = html`
    ${pageHead('Insights', `${all.length} observations derived from your data as of ${fmtDate(state.asOf)}`)}
    <div class="alert info">${icon('info')}<div>Every item below is computed from the figures in data.js and holdings.json — nothing is a recommendation, forecast or tax conclusion. Each links to the page where the underlying numbers live.</div></div>
    ${warn.length ? html`<div class="section-head"><h2>Needs attention</h2><span class="muted">${warn.length}</span></div><div class="grid cols-2">${warn.map(insightCard)}</div>` : ''}
    <div class="section-head"><h2>Portfolio shape</h2><span class="muted">${rest.length}</span></div>
    <div class="grid cols-2">${rest.map(insightCard)}</div>`;
}
