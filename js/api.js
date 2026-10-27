export const PROXY_URL = 'https://portfolio-proxy-6ezf.onrender.com';

const TOKEN_KEY    = 'portfolio_token';
const ACTIVITY_KEY = 'portfolio_last_activity';
const INACTIVITY_MS = 30 * 60 * 1000;

const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: k => { try { localStorage.removeItem(k); } catch {} },
};

export const getToken   = () => store.get(TOKEN_KEY) || '';
export const setToken   = t  => store.set(TOKEN_KEY, t);
export const clearToken = () => store.del(TOKEN_KEY);

// Token is "<expiry_ms>.<hmac>"; the expiry half is readable client-side.
export function tokenValid() {
  const [exp] = getToken().split('.');
  return Number(exp) > Date.now();
}

export class Unauthorized extends Error {}

function fetchWithTimeout(url, options = {}, ms = 45000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function proxy(path, { method = 'GET', body, auth = true, timeout } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetchWithTimeout(`${PROXY_URL}${path}`, { method, headers, body: body && JSON.stringify(body), cache: 'no-store' }, timeout);
  if (res.status === 401) throw new Unauthorized();
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export const getConfig     = () => proxy('/config', { auth: false, timeout: 50000 });
export const authGoogle    = credential => proxy('/auth', { method: 'POST', body: { credential }, auth: false, timeout: 40000 });
export const loadRemote    = () => proxy(`/holdings?t=${Date.now()}`);
export const saveRemote    = payload => proxy('/holdings', { method: 'PUT', body: payload });
export const fetchGold     = () => proxy('/gold-price',      { auth: false, timeout: 15000 });
export const fetchSilver   = () => proxy('/silver-price',    { auth: false, timeout: 15000 });
export const fetchUnlisted = () => proxy('/unlisted-prices', { auth: false, timeout: 40000 });
export const requestAdvice = (portfolio, context) => proxy('/advise', { method: 'POST', body: { portfolio, context }, timeout: 300000 });

export async function fetchNav(code) {
  const res = await fetchWithTimeout(`https://api.mfapi.in/mf/${code}/latest`, {}, 12000);
  if (!res.ok) throw new Error(`NAV ${code}: HTTP ${res.status}`);
  const data = await res.json();
  return parseFloat(data?.data?.[0]?.nav);
}

// ── Inactivity lock ──────────────────────────────────────────────────
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
let timer = null, onLock = null;

export const isIdle = () => {
  const last = Number(store.get(ACTIVITY_KEY) || 0);
  return last > 0 && Date.now() - last >= INACTIVITY_MS;
};
function touch() {
  store.set(ACTIVITY_KEY, String(Date.now()));
  schedule();
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => (isIdle() ? onLock?.() : schedule()), INACTIVITY_MS);
}
function onVisible() {
  if (document.visibilityState === 'visible' && isIdle()) onLock?.();
}
export function startSession(lockFn) {
  onLock = lockFn;
  touch();
  EVENTS.forEach(e => document.addEventListener(e, touch, { passive: true }));
  document.addEventListener('visibilitychange', onVisible);
}
export function endSession() {
  clearTimeout(timer);
  EVENTS.forEach(e => document.removeEventListener(e, touch));
  document.removeEventListener('visibilitychange', onVisible);
  clearToken();
  store.del(ACTIVITY_KEY);
}
