import { state, recompute, savePayload } from './store.js';
import { DATA_AS_OF, ASSET_CLASSES, OWNERS } from './data.js';
import { saveRemote, fetchGold, fetchSilver, fetchUnlisted, Unauthorized } from './api.js';
import { html, raw, fmt, fmtDate, todayISO, sum, $, $$ } from './util.js';
import { classBadge, icon } from './ui.js';
import { openModal, closeModal, toast } from './modal.js';

const isPriced = h => h.price != null && !h.mf;

export function openUpdate() {
  const activeOverrides = Object.values(state.overrides).filter(o => o.asOf > DATA_AS_OF).length;
  const pendingAdd = [];
  const pendingRemove = new Set();

  const modal = openModal(html`
    <div class="modal-head"><div><h2>Update holdings</h2><p>Enter a unit price for priced holdings or a total value for the rest; blank rows stay unchanged. Add new positions or remove closed ones below. Everything saves to your encrypted holdings file.</p></div>
      <button class="icon-btn" data-action="closeModal" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">
      <div class="toolbar">
        <div class="field"><label>Valuation date</label><input class="input" type="date" id="updDate" value="${todayISO()}" min="${DATA_AS_OF}"></div>
        <div class="field" style="flex:1;min-width:200px"><label>&nbsp;</label><span class="small muted" id="updDateMsg"></span></div>
        ${activeOverrides ? html`<div class="field"><label>&nbsp;</label><button class="btn small btn-danger" id="updClear">Clear ${activeOverrides} override${activeOverrides === 1 ? '' : 's'}</button></div>` : ''}
      </div>
      <div class="fetch-box">${icon('sparkle')}<div class="grow"><b>Fetch live prices</b><small>Gold &amp; silver (Chennai), SGB at gold rate, and unlisted shares via the proxy. Mutual fund values come from the CAS.</small></div>
        <button class="btn btn-primary" id="updFetch">Fetch</button><div class="fetch-status" id="updFetchStatus"></div></div>

      <details class="add-box" id="updAddBox">
        <summary>${icon('arrow')}<b>Add a holding</b><span class="muted small">new position, FD, policy, coins…</span></summary>
        <div class="add-grid">
          <div class="field"><label>Name</label><input class="input" id="addName" placeholder="e.g. HDFC Bank FD" maxlength="60"></div>
          <div class="field"><label>Type</label><select class="input" id="addCls">${Object.entries(ASSET_CLASSES).filter(([k]) => k !== 'mf').map(([k, c]) => html`<option value="${k}">${c.label}</option>`)}</select></div>
          <div class="field"><label>Owner</label><select class="input" id="addOwner">${Object.keys(OWNERS).map(o => html`<option value="${o}">${o}</option>`)}</select></div>
          <div class="field"><label>Account / broker</label><input class="input" id="addAccount" placeholder="e.g. ICICI" maxlength="40"></div>
          <div class="field"><label>Valued by</label><select class="input" id="addMode"><option value="value">Total value</option><option value="price">Units × price</option></select></div>
          <div class="field" data-mode="value"><label>Current value (₹)</label><input class="input num" type="number" min="0" step="1" id="addValue" placeholder="0"></div>
          <div class="field" data-mode="price" hidden><label>Units</label><input class="input num" type="number" min="0" step="any" id="addQty" placeholder="0"></div>
          <div class="field" data-mode="price" hidden><label>Unit</label><select class="input" id="addUnit"><option value="sh">shares / units</option><option value="g">grams</option></select></div>
          <div class="field" data-mode="price" hidden><label>Price per unit (₹)</label><input class="input num" type="number" min="0" step="any" id="addPrice" placeholder="0"></div>
          <div class="field"><label>Total cost (₹)</label><input class="input num" type="number" min="0" step="1" id="addCost" placeholder="0"></div>
          <div class="field"><label>Purchased on</label><input class="input" type="date" id="addSince" value="${todayISO()}" max="${todayISO()}"></div>
          <div class="field"><label>&nbsp;</label><button class="btn" id="addBtn">${icon('check')}Add to list</button></div>
        </div>
        <div class="chips" id="updAdded"></div>
      </details>

      <div class="table-wrap"><table class="tbl compact update-table">
        <thead><tr><th>Holding</th><th>Type</th><th class="right">Current</th><th class="right">New price / value</th><th>Note</th><th></th></tr></thead>
        <tbody>${state.holdings.map(h => html`<tr data-id="${h.id}">
          <td><span class="main-cell">${h.name}</span><span class="sub">${h.account}${h.qty ? ` · ${h.qty.toLocaleString('en-IN')} ${h.unit === 'g' ? 'g' : 'units'}` : ''}${h.added ? ' · added in app' : ''}</span>${h.overridden ? html`<span class="sub stale">Override since ${fmtDate(h.overridden)}</span>` : ''}</td>
          <td>${classBadge(h.cls)}</td>
          <td class="right"><span class="main-cell">${h.value > 0 ? fmt(h.value) : '—'}</span>${isPriced(h) ? html`<span class="sub">₹${h.price.toLocaleString('en-IN')}/${h.unit === 'g' ? 'g' : 'unit'}</span>` : ''}</td>
          <td class="right">${h.mf ? html`<span class="muted small">From CAS · ${h.schemes} schemes</span>`
            : isPriced(h) ? html`<input class="input num" type="number" step="any" min="0" data-field="price" placeholder="${h.price}" aria-label="New unit price"><span class="calc"></span>`
            : html`<input class="input num wide" type="number" step="1" min="0" data-field="value" placeholder="${h.value || 0}" aria-label="New value">`}</td>
          <td><input class="input" data-field="note" value="${state.notes[h.id] || ''}" placeholder="Add note" style="width:150px"></td>
          <td>${h.mf ? '' : html`<button class="icon-btn" data-remove="${h.id}" title="Remove holding" aria-label="Remove ${h.name}">${icon('x')}</button>`}</td>
        </tr>`)}</tbody>
      </table></div>
    </div>
    <div class="modal-foot">
      <div class="summary-bar"><span>Current <b>${fmt(state.total)}</b></span><span>New <b id="updNew">—</b></span><span>Change <b id="updDelta">—</b></span></div>
      <div class="actions"><button class="btn" data-action="closeModal">Cancel</button><button class="btn btn-primary" id="updSave" ${state.offline ? 'disabled' : ''}>${icon('save')}Save</button></div>
      ${state.offline ? html`<p class="small down" style="width:100%">Saving is disabled while the data server is unreachable.</p>` : ''}
    </div>`, { size: '' });

  const rowsById = Object.fromEntries($$('tr[data-id]', modal).map(tr => [tr.dataset.id, tr]));

  const newValueFor = h => {
    const tr = rowsById[h.id];
    const inp = tr?.querySelector('[data-field="price"],[data-field="value"]');
    if (!inp || inp.value === '') return null;
    const n = parseFloat(inp.value);
    if (isNaN(n) || n < 0) return null;
    return isPriced(h) ? Math.round(n * h.qty) : Math.round(n);
  };
  const addedValue = a => a.price != null ? Math.round(a.qty * a.price) : a.value;

  const recalc = () => {
    let total = 0;
    for (const h of state.holdings) {
      if (pendingRemove.has(h.id)) continue;
      const nv = newValueFor(h);
      total += nv ?? h.value;
      const calc = rowsById[h.id]?.querySelector('.calc');
      if (calc) calc.textContent = nv != null ? `= ${fmt(nv)}` : '';
    }
    total += sum(pendingAdd, addedValue);
    const delta = total - state.total;
    $('#updNew', modal).textContent = fmt(total);
    const d = $('#updDelta', modal);
    d.textContent = (delta >= 0 ? '+' : '') + fmt(delta);
    d.className = delta >= 0 ? 'up' : 'down';
  };

  const checkDate = () => {
    const v = $('#updDate', modal).value;
    const ok = v > DATA_AS_OF;
    $('#updDateMsg', modal).textContent = ok ? '' : `Must be after ${fmtDate(DATA_AS_OF)} for changes to take effect.`;
    $('#updDateMsg', modal).className = ok ? 'small muted' : 'small down';
    return ok;
  };

  const renderAdded = () => {
    $('#updAdded', modal).innerHTML = html`${pendingAdd.map((a, i) => html`<span class="chip">${a.name} · ${ASSET_CLASSES[a.cls].short} · ${fmt(addedValue(a))}<button type="button" data-unadd="${i}" aria-label="Remove ${a.name} from list">${icon('x')}</button></span>`)}`;
  };

  modal.addEventListener('input', e => {
    const f = e.target.dataset.field;
    if (f === 'note') { const id = e.target.closest('tr').dataset.id; const v = e.target.value.trim(); if (v) state.notes[id] = v; else delete state.notes[id]; return; }
    if (f) recalc();
    if (e.target.id === 'updDate') checkDate();
  });
  $('#addMode', modal).addEventListener('change', e => {
    $$('[data-mode]', modal).forEach(el => { el.hidden = el.dataset.mode !== e.target.value; });
  });
  modal.addEventListener('click', e => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const id = rm.dataset.remove, tr = rowsById[id];
      if (pendingRemove.has(id)) { pendingRemove.delete(id); tr.classList.remove('removed-row'); rm.innerHTML = html`${icon('x')}`; rm.title = 'Remove holding'; }
      else { pendingRemove.add(id); tr.classList.add('removed-row'); rm.innerHTML = html`<span class="small">Undo</span>`; rm.title = 'Undo removal'; }
      recalc();
      return;
    }
    const un = e.target.closest('[data-unadd]');
    if (un) { pendingAdd.splice(+un.dataset.unadd, 1); renderAdded(); recalc(); }
  });

  $('#addBtn', modal).addEventListener('click', () => {
    const v = id => $(`#${id}`, modal).value.trim();
    const num = id => { const n = parseFloat(v(id)); return isNaN(n) ? null : n; };
    const name = v('addName'), cls = v('addCls'), owner = v('addOwner'), account = v('addAccount') || '—', mode = v('addMode');
    const cost = num('addCost'), since = v('addSince') || todayISO();
    if (!name) { toast('Give the holding a name.'); return; }
    const h = { id: `add-${Date.now().toString(36)}`, cls, owner, account, name, cost: cost != null && cost >= 0 ? Math.round(cost) : 0, since };
    if (mode === 'price') {
      const qty = num('addQty'), price = num('addPrice');
      if (!(qty > 0) || !(price >= 0)) { toast('Enter units and a price per unit.'); return; }
      Object.assign(h, { qty, unit: v('addUnit') === 'g' ? 'g' : 'sh', price });
    } else {
      const value = num('addValue');
      if (!(value >= 0)) { toast('Enter the current value.'); return; }
      h.value = Math.round(value);
    }
    if (!h.cost) h.cost = addedValue(h);
    pendingAdd.push(h);
    renderAdded(); recalc();
    ['addName', 'addAccount', 'addValue', 'addQty', 'addPrice', 'addCost'].forEach(id => { $(`#${id}`, modal).value = ''; });
    toast(`${h.name} queued — press Save to keep it.`);
  });

  $('#updFetch', modal).addEventListener('click', () => fetchPrices(modal, rowsById, recalc));
  $('#updClear', modal)?.addEventListener('click', async () => {
    if (!confirm('Remove all manual price/value overrides and go back to the stored values? Added and removed holdings are kept.')) return;
    state.overrides = {};
    await persist(modal, $('#updDate', modal).value, false);
  });
  $('#updSave', modal).addEventListener('click', async () => {
    if (!checkDate()) return;
    const date = $('#updDate', modal).value;
    let changed = 0;
    for (const h of state.holdings) {
      if (pendingRemove.has(h.id)) continue;
      const tr = rowsById[h.id];
      const inp = tr?.querySelector('[data-field="price"],[data-field="value"]');
      if (!inp || inp.value === '') continue;
      const n = parseFloat(inp.value);
      if (isNaN(n) || n < 0) continue;
      state.overrides[h.id] = isPriced(h) ? { price: n, asOf: date } : { value: Math.round(n), asOf: date };
      changed++;
    }
    for (const a of pendingAdd) { state.additions[a.id] = a; changed++; }
    for (const id of pendingRemove) {
      if (state.additions[id]) delete state.additions[id]; else if (!state.removed.includes(id)) state.removed.push(id);
      delete state.overrides[id]; delete state.notes[id];
      changed++;
    }
    const notesChanged = JSON.stringify(state.notes) !== JSON.stringify(state.remote?.notes || {});
    if (!changed && !notesChanged) { toast('Nothing to save — enter a value, add or remove a holding, or write a note.'); return; }
    await persist(modal, date, changed > 0);
  });
  recalc();
}

async function persist(modal, date, addSnapshot) {
  const btn = $('#updSave', modal);
  btn.disabled = true; btn.textContent = 'Saving…';
  recompute();
  if (addSnapshot) {
    state.snapshots = state.snapshots.filter(s => s.date !== date).concat({ date, value: state.total }).sort((a, b) => a.date < b.date ? -1 : 1);
  }
  try {
    await saveRemote(savePayload(date));
    state.remote = { ...(state.remote || {}), version: 2, notes: { ...state.notes }, overrides: { ...state.overrides }, additions: { ...state.additions }, removed: [...state.removed], snapshots: state.snapshots };
    closeModal();
    document.dispatchEvent(new CustomEvent('portfolio:changed'));
    toast(`Saved — net worth ${fmt(state.total)} as of ${fmtDate(date)}`);
  } catch (e) {
    if (e instanceof Unauthorized) { toast('Session expired — please sign in again.'); setTimeout(() => location.reload(), 1200); return; }
    btn.disabled = false; btn.textContent = 'Save';
    toast(`Save failed: ${e.message}`, 5000);
  }
}

async function fetchPrices(modal, rowsById, recalc) {
  const btn = $('#updFetch', modal), status = $('#updFetchStatus', modal);
  btn.disabled = true;
  const say = m => { status.textContent = m; };
  const setPrice = (id, price) => {
    const inp = rowsById[id]?.querySelector('[data-field="price"]');
    if (!inp || !(price > 0)) return false;
    inp.value = price; inp.style.borderColor = 'var(--green)';
    return true;
  };
  const parts = [];
  try {
    say('Fetching gold and silver…');
    const [g, s] = await Promise.allSettled([fetchGold(), fetchSilver()]);
    const gold = g.status === 'fulfilled' && g.value.ok ? g.value.price : null;
    const silver = s.status === 'fulfilled' && s.value.ok ? s.value.price : null;
    if (gold) {
      let n = setPrice('coin-au', gold) ? 1 : 0;
      for (const h of state.holdings) if (h.cls === 'sgb' && setPrice(h.id, gold)) n++;
      parts.push(`Gold ₹${gold.toLocaleString('en-IN')}/g (${n} rows)`);
    } else parts.push('Gold unavailable');
    if (silver && setPrice('coin-ag', silver)) parts.push(`Silver ₹${silver.toLocaleString('en-IN')}/g`); else parts.push('Silver unavailable');
    recalc();
    say(`${parts.join(' · ')} · fetching unlisted shares…`);
    const u = await fetchUnlisted().catch(() => null);
    const results = u?.results || {};
    let n = 0, fail = [];
    for (const h of state.holdings) {
      if (!h.fetchKey) continue;
      const r = results[h.fetchKey];
      if (r?.ok && setPrice(h.id, r.price)) n++; else fail.push(h.name);
    }
    parts.push(`Unlisted ${n} updated${fail.length ? ` (no price: ${fail.join(', ')})` : ''}`);
    recalc();
    say(parts.join(' · ') + '. Review the filled values, then Save.');
  } catch (e) {
    say(`Fetch failed: ${e.message}`);
  } finally {
    btn.disabled = false;
  }
}
