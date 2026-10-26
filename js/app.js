import { state, hydrate, recompute } from './store.js';
import { getConfig, authGoogle, loadRemote, setToken, tokenValid, isIdle, startSession, endSession, Unauthorized } from './api.js';
import { html, raw, fmtDate, $, $$ } from './util.js';
import { icon } from './ui.js';
import { openModal, closeModal, modalOpen, toast } from './modal.js';
import { destroyAll } from './charts.js';
import { openUpdate } from './update.js';
import { openShare } from './export.js';
import * as overview from './pages/overview.js';
import * as holdings from './pages/holdings.js';
import * as mf from './pages/mf.js';
import * as analysis from './pages/analysis.js';
import * as family from './pages/family.js';
import * as journey from './pages/journey.js';

const PAGES = { overview, holdings, mf, analysis, family, journey };
const NAV = [
  ['overview', 'Overview', 'grid'], ['holdings', 'Holdings', 'list'], ['mf', 'Mutual Funds', 'pie'],
  ['analysis', 'Analysis', 'chart'], ['family', 'Family', 'users'], ['journey', 'Journey', 'trend'],
];
const THEME_KEY = 'portfolio_theme';
let route = { page: 'overview', sub: undefined, query: {} };

// ── Theme ─────────────────────────────────────────────────────────────
function applyTheme(mode) {
  if (mode) document.documentElement.dataset.theme = mode; else delete document.documentElement.dataset.theme;
  const dark = mode ? mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('[data-action="theme"] use')?.setAttribute('href', dark ? '#i-sun' : '#i-moon');
}
function toggleTheme() {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  applyTheme(next);
  renderRoute();
}

// ── Router ────────────────────────────────────────────────────────────
function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const [page, sub] = path.split('/');
  return { page: PAGES[page] ? page : 'overview', sub: sub || undefined, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
function renderNav() {
  const links = NAV.map(([id, label, ic]) => html`<a class="nav-link" href="#${id}" data-page="${id}" aria-current="${route.page === id ? 'page' : 'false'}">${icon(ic)}<span>${label}</span></a>`);
  $('#nav').innerHTML = html`${links}`;
  $('#bottomNav').innerHTML = html`${links}`;
}
function renderRoute() {
  route = parseHash();
  destroyAll();
  const view = $('#view');
  PAGES[route.page].render(view, { sub: route.sub, query: route.query });
  $$('.nav-link').forEach(a => a.setAttribute('aria-current', a.dataset.page === route.page ? 'page' : 'false'));
  $('#asOf').textContent = `Updated ${fmtDate(state.asOf)}`;
  document.title = `Portfolio · ${NAV.find(n => n[0] === route.page)[1]}`;
  window.scrollTo({ top: 0 });
}

// ── Global actions ────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, arg } = el.dataset;
  if (PAGES[route.page].onAction?.(action, arg, el)) return;
  switch (action) {
    case 'update': openUpdate(); break;
    case 'share': openShare(); break;
    case 'theme': toggleTheme(); break;
    case 'lock': lock(); break;
    case 'reload': location.reload(); break;
    case 'goto': location.hash = arg; break;
    case 'closeModal': if (!el.classList.contains('modal-backdrop') || e.target === el) closeModal(); break;
  }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  PAGES[route.page].onInput?.(el.dataset.input, el.value, el.dataset.arg);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOpen()) closeModal(); });
window.addEventListener('hashchange', renderRoute);
document.addEventListener('portfolio:changed', () => { recompute(); renderRoute(); });

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
      google.accounts.id.renderButton(gsi, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 280 });
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
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch {}
  applyTheme(saved === 'dark' || saved === 'light' ? saved : null);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.dataset.theme) { applyTheme(null); if (!$('#app').hidden) renderRoute(); } });

  if (tokenValid() && !isIdle()) {
    startSession(lock);
    loadAndShow();
  } else {
    endSession();
    showLock();
  }
})();
