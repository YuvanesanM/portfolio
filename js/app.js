import { state, hydrate, recompute } from './store.js';
import { getConfig, authGoogle, loadRemote, setToken, tokenValid, isIdle, startSession, endSession, Unauthorized } from './api.js';
import { html, fmtDate, display, $, $$ } from './util.js';
import { icon } from './ui.js';
import { closeModal, modalOpen, toast } from './modal.js';
import { destroyAll } from './charts.js';
import { openUpdate } from './update.js';
import { openShare } from './export.js';
import * as overview from './pages/overview.js';
import * as portfolio from './pages/holdings.js';
import * as assets from './pages/assets.js';
import * as mf from './pages/mf.js';
import * as performance from './pages/performance.js';
import * as liquidity from './pages/liquidity.js';
import * as tax from './pages/tax.js';
import * as rebalance from './pages/rebalance.js';
import * as insights from './pages/insights.js';
import * as goals from './pages/goals.js';
import * as family from './pages/family.js';
import * as settings from './pages/settings.js';

const PAGES = { overview, portfolio, assets, mf, performance, liquidity, tax, rebalance, insights, goals, family, settings };
const NAV = [
  { label: 'Main', items: [['overview', 'Overview', 'grid'], ['portfolio', 'Portfolio', 'list'], ['assets', 'Asset Classes', 'layers'], ['mf', 'Mutual Funds', 'pie']] },
  { label: 'Analysis', items: [['performance', 'Performance', 'trend'], ['liquidity', 'Liquidity', 'droplet'], ['tax', 'Tax', 'receipt'], ['rebalance', 'Rebalance', 'scale'], ['insights', 'Insights', 'bulb']] },
  { label: 'Planning', items: [['goals', 'Goals', 'target'], ['family', 'Family', 'users'], ['settings', 'Settings', 'settings']] },
];
const TITLES = Object.fromEntries(NAV.flatMap(g => g.items.map(([id, label]) => [id, label])));
const BOTTOM = ['overview', 'portfolio', 'assets', 'performance'];
const LEGACY = { holdings: 'portfolio', 'holdings/fd': 'assets/fd', 'holdings/sgb': 'assets/sgb', 'analysis/returns': 'performance', 'analysis/tax': 'tax', 'analysis/rebalance': 'rebalance', analysis: 'performance', journey: 'goals' };
const PREF = { theme: 'portfolio_theme', unit: 'portfolio_unit', mask: 'portfolio_mask', sidebar: 'portfolio_sidebar', email: 'portfolio_user_email' };
const pref = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let route = { page: 'overview', sub: undefined, query: {} };

// ── Preferences ───────────────────────────────────────────────────────
function applyTheme(mode) {
  if (mode === 'light') document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
  $('[data-action="theme"] use')?.setAttribute('href', mode === 'light' ? '#i-moon' : '#i-sun');
  $('meta[name="theme-color"]')?.setAttribute('content', mode === 'light' ? '#f3f5f9' : '#070d17');
}
function setTheme(mode) { pref.set(PREF.theme, mode); applyTheme(mode); if (!$('#app').hidden) renderRoute(); }
function setMask(on) {
  display.mask = !!on; pref.set(PREF.mask, on ? '1' : '0');
  const btn = $('[data-action="mask"]');
  btn.setAttribute('aria-pressed', String(!!on)); btn.title = on ? 'Show values' : 'Hide values'; btn.setAttribute('aria-label', btn.title);
  btn.querySelector('use').setAttribute('href', on ? '#i-eye-off' : '#i-eye');
  if (!$('#app').hidden) renderRoute();
}
function setUnit(u) { display.unit = u; pref.set(PREF.unit, u); if (!$('#app').hidden) renderRoute(); }
function setSidebar(collapsed) { $('#app').classList.toggle('collapsed', collapsed); pref.set(PREF.sidebar, collapsed ? 'collapsed' : 'expanded'); }
function openDrawer(open) { $('#app').classList.toggle('drawer-open', open); $('#drawerBackdrop').hidden = !open; }

function greeting() {
  const h = new Date().getHours();
  const word = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const email = pref.get(PREF.email) || '';
  const name = /ramyaa/i.test(email) ? 'Ramyaa' : 'Yuvan';
  return html`${word}, ${name}.<span class="greet-tail"> Your wealth, across every asset class, in one place.</span>`;
}

// ── Router ────────────────────────────────────────────────────────────
function parseHash() {
  let [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  if (LEGACY[path]) { path = LEGACY[path]; history.replaceState(null, '', `#${path}${qs ? `?${qs}` : ''}`); }
  const [page, sub] = path.split('/');
  return { page: PAGES[page] ? page : 'overview', sub: sub || undefined, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
function renderNav() {
  $('#nav').innerHTML = html`${NAV.map(g => html`<div class="nav-group"><div class="nav-label">${g.label}</div>${g.items.map(([id, label, ic]) =>
    html`<a class="nav-link" href="#${id}" data-page="${id}" title="${label}" aria-current="${route.page === id ? 'page' : 'false'}">${icon(ic)}<span>${label}</span></a>`)}</div>`)}`;
  $('#bottomNav').innerHTML = html`${BOTTOM.map(id => { const [, label, ic] = NAV.flatMap(g => g.items).find(i => i[0] === id); return html`<a href="#${id}" data-page="${id}" aria-current="${route.page === id ? 'page' : 'false'}">${icon(ic)}<span>${label}</span></a>`; })}
    <button type="button" data-action="openDrawer" aria-label="More sections">${icon('more')}<span>More</span></button>`;
}
function renderRoute() {
  route = parseHash();
  destroyAll();
  closeModal();
  openDrawer(false);
  const view = $('#view');
  PAGES[route.page].render(view, { sub: route.sub, query: route.query });
  $$('[data-page]').forEach(a => a.setAttribute('aria-current', a.dataset.page === route.page ? 'page' : 'false'));
  $('#pageTitle').textContent = TITLES[route.page];
  $('#greet').innerHTML = greeting();
  $('#asOf span').textContent = `Updated ${fmtDate(state.asOf)}`;
  $('#asOf').title = `Market prices as of ${fmtDate(state.asOf)}`;
  document.title = `${TITLES[route.page]} · Yuvan's Portfolio`;
  window.scrollTo({ top: 0 });
}

// ── Global events ─────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, arg } = el.dataset;
  if (PAGES[route.page].onAction?.(action, arg, el)) return;
  switch (action) {
    case 'update': openUpdate(); break;
    case 'share': openShare(); break;
    case 'theme': setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'); break;
    case 'mask': setMask(!display.mask); break;
    case 'lock': lock(); break;
    case 'reload': location.reload(); break;
    case 'goto': location.hash = arg; break;
    case 'collapse': setSidebar(!$('#app').classList.contains('collapsed')); break;
    case 'openDrawer': openDrawer(true); break;
    case 'closeDrawer': openDrawer(false); break;
    case 'closeModal': if (!el.classList.contains('modal-backdrop') || e.target === el) closeModal(); break;
  }
});
document.addEventListener('keydown', e => {
  const el = e.target.closest('[data-action][tabindex="0"]');
  if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); }
  if (e.key === 'Escape') { if (modalOpen()) closeModal(); else openDrawer(false); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  PAGES[route.page].onInput?.(el.dataset.input, el.value, el.dataset.arg, el);
});
window.addEventListener('hashchange', renderRoute);
document.addEventListener('portfolio:changed', () => { recompute(); renderRoute(); });
document.addEventListener('portfolio:theme', e => setTheme(e.detail));
document.addEventListener('portfolio:unit', e => setUnit(e.detail));
document.addEventListener('portfolio:mask', e => setMask(e.detail));
document.addEventListener('portfolio:sidebar', e => setSidebar(e.detail));

// ── Auth & boot ───────────────────────────────────────────────────────
function lock() {
  endSession();
  if (window.google?.accounts) google.accounts.id.disableAutoSelect();
  location.reload();
}

async function loadAndShow() {
  const loading = $('#loading'), msg = $('#loadingMsg');
  $('#lock').hidden = true; loading.hidden = false;
  const timers = [
    setTimeout(() => msg.textContent = 'Waking the data server (free tier, up to 30s)…', 4000),
    setTimeout(() => msg.textContent = 'Almost there…', 18000),
  ];
  let remote = null;
  try { remote = await loadRemote(); }
  catch (e) {
    if (e instanceof Unauthorized) { endSession(); location.reload(); return; }
    console.warn('Remote load failed:', e.message);
  }
  timers.forEach(clearTimeout);
  hydrate(remote);
  $('#offline').hidden = !state.offline;
  loading.hidden = true;
  $('#app').hidden = false;
  const email = pref.get(PREF.email) || '';
  $('#userName').textContent = /ramyaa/i.test(email) ? 'Ramyaa' : 'Yuvan';
  $('#avatar').textContent = /ramyaa/i.test(email) ? 'R' : 'Y';
  if (email) $('#userRole').textContent = email;
  renderNav();
  renderRoute();
}

async function showLock() {
  const msg = $('#lockMsg'), gsi = $('#gsi');
  const say = (t, err = false) => { msg.textContent = t; msg.className = `lock-msg${err ? ' error' : ''}`; };
  say('Connecting to auth server…');
  const wake = setTimeout(() => say('Server is waking up — this can take up to 30 seconds…'), 6000);
  let clientId = null;
  for (let attempt = 0; attempt < 2 && !clientId; attempt++) {
    try { clientId = (await getConfig()).clientId || null; } catch { if (!attempt) { say('Retrying…'); await new Promise(r => setTimeout(r, 3000)); } }
  }
  clearTimeout(wake);
  if (!clientId) {
    gsi.innerHTML = '';
    msg.innerHTML = 'Could not reach the auth server. <button data-action="reload">Try again</button>';
    msg.className = 'lock-msg error';
    return;
  }
  say('Access limited to authorised accounts');
  const started = Date.now();
  const wait = setInterval(() => {
    if (window.google?.accounts) {
      clearInterval(wait);
      gsi.innerHTML = '';
      google.accounts.id.initialize({ client_id: clientId, callback: onCredential, auto_select: false, cancel_on_tap_outside: false });
      google.accounts.id.renderButton(gsi, { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill', width: 280 });
    } else if (Date.now() - started > 15000) {
      clearInterval(wait);
      gsi.innerHTML = '';
      say('Google Sign-In failed to load — check your connection or ad blocker.', true);
    }
  }, 100);
}

async function onCredential(response) {
  const msg = $('#lockMsg');
  msg.textContent = 'Verifying…'; msg.className = 'lock-msg';
  try {
    const data = await authGoogle(response.credential);
    if (data.ok && data.token) {
      setToken(data.token);
      if (data.email) pref.set(PREF.email, data.email);
      startSession(lock);
      loadAndShow();
    } else throw new Error(data.error || 'Access denied');
  } catch (e) {
    msg.textContent = e.message.includes('401') ? 'This Google account is not authorised.' : e.message;
    msg.className = 'lock-msg error';
    window.google?.accounts?.id.disableAutoSelect();
  }
}

(function boot() {
  applyTheme(pref.get(PREF.theme) === 'light' ? 'light' : 'dark');
  display.unit = ['auto', 'lakh', 'crore', 'full'].includes(pref.get(PREF.unit)) ? pref.get(PREF.unit) : 'auto';
  display.mask = pref.get(PREF.mask) === '1';
  if (display.mask) { const b = $('[data-action="mask"]'); b.setAttribute('aria-pressed', 'true'); b.querySelector('use').setAttribute('href', '#i-eye-off'); }
  if (pref.get(PREF.sidebar) === 'collapsed') $('#app').classList.add('collapsed');
  if (tokenValid() && !isIdle()) { startSession(lock); loadAndShow(); }
  else { endSession(); showLock(); }
})();
