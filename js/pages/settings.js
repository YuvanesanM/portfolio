import { state } from '../store.js';
import { DATA_AS_OF, CAS_AS_OF, HOLDINGS, MF_SCHEMES, SNAPSHOTS } from '../data.js';
import { PROXY_URL } from '../api.js';
import { html, display, fmtDate, $ } from '../util.js';
import { pageHead, seg, icon } from '../ui.js';

export function render(root) {
  const theme = document.documentElement.dataset.theme || 'dark';
  const sidebar = localStorage.getItem('portfolio_sidebar') === 'collapsed';
  const overrides = Object.values(state.overrides).filter(o => o.asOf > DATA_AS_OF).length;
  root.innerHTML = html`
    ${pageHead('Settings', 'Display preferences and data provenance')}
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Display</h3></div>
        <div class="kv">
          <div><span>Theme</span>${seg([['dark', 'Dark'], ['light', 'Light']], theme, 'setTheme')}</div>
          <div><span>Amount units</span>${seg([['auto', 'Auto'], ['lakh', 'Lakhs'], ['crore', 'Crores'], ['full', 'Full ₹']], display.unit, 'setUnit')}</div>
          <div><span>Hide values</span><label class="toggle"><input type="checkbox" data-input="maskToggle" ${display.mask ? 'checked' : ''}><span class="track"></span><span class="small dim">${display.mask ? 'Masked' : 'Visible'}</span></label></div>
          <div><span>Sidebar</span><label class="toggle"><input type="checkbox" data-input="sidebarToggle" ${sidebar ? 'checked' : ''}><span class="track"></span><span class="small dim">${sidebar ? 'Collapsed' : 'Expanded'}</span></label></div>
        </div>
        <div class="note">Preferences are stored in this browser only.</div></div>
      <div class="card"><div class="card-head"><h3>Session</h3></div>
        <div class="kv">
          <div><span>Signed in as</span><b>${localStorage.getItem('portfolio_user_email') || 'Authorised account'}</b></div>
          <div><span>Auto-lock</span><b>After 30 minutes idle</b></div>
          <div><span>Session length</span><b>24 hours</b></div>
        </div>
        <div style="margin-top:14px"><button class="btn btn-danger" data-action="lock">${icon('lock')} Lock now</button></div></div>
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>Data provenance</h3></div>
        <div class="kv">
          <div><span>Market prices as of</span><b>${fmtDate(DATA_AS_OF)}</b></div>
          <div><span>Mutual fund CAS as of</span><b>${fmtDate(CAS_AS_OF)}</b></div>
          <div><span>Holdings defined</span><b>${HOLDINGS.length} (${state.holdings.filter(h => h.value > 0).length} with value)</b></div>
          <div><span>MF schemes</span><b>${MF_SCHEMES.length}</b></div>
          <div><span>Snapshots</span><b>${state.snapshots.length} (${SNAPSHOTS.length} in code)</b></div>
          <div><span>Active overrides</span><b>${overrides}</b></div>
          <div><span>Notes</span><b>${Object.keys(state.notes).length}</b></div>
          <div><span>Remote file</span><b>${state.offline ? 'Unreachable' : state.remote?.version >= 2 ? 'v2' : 'Legacy (notes + snapshots read)'}</b></div>
        </div></div>
      <div class="card"><div class="card-head"><h3>How values are sourced</h3></div>
        <div class="kv">
          <div><span>Source of truth</span><b>js/data.js</b></div>
          <div><span>Priced holdings</span><b>value = qty × price</b></div>
          <div><span>Mutual funds</span><b>Sum of MF_SCHEMES per owner</b></div>
          <div><span>Overrides</span><b>Apply only while dated after ${fmtDate(DATA_AS_OF)}</b></div>
          <div><span>Storage</span><b>AES-256 encrypted holdings.json via proxy</b></div>
          <div><span>Proxy</span><b class="small">${PROXY_URL.replace('https://', '')}</b></div>
        </div></div>
    </div>`;
}

export function onInput(name, value, arg, el) {
  if (name === 'maskToggle') { document.dispatchEvent(new CustomEvent('portfolio:mask', { detail: el.checked })); return true; }
  if (name === 'sidebarToggle') { document.dispatchEvent(new CustomEvent('portfolio:sidebar', { detail: el.checked })); return true; }
  return false;
}
export function onAction(name, arg) {
  if (name === 'setTheme') { document.dispatchEvent(new CustomEvent('portfolio:theme', { detail: arg })); return true; }
  if (name === 'setUnit') { document.dispatchEvent(new CustomEvent('portfolio:unit', { detail: arg })); return true; }
  return false;
}
