import { state, activeHoldings } from './store.js';
import { ASSET_CLASSES } from './data.js';
import { html, fmt, fmtDate, fmtShort, pct, estimateXIRR, $ } from './util.js';
import { icon } from './ui.js';
import { openModal, toast } from './modal.js';

export function openShare() {
  const modal = openModal(html`
    <div class="modal-head"><div><h2>Share &amp; export</h2><p>Everything here stays behind sign-in; only you and authorised accounts can open the link.</p></div>
      <button class="icon-btn" data-action="closeModal" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">
      <div class="share-opt">${icon('printer')}<div style="flex:1"><b>Print or save as PDF</b><p>Prints the page you are on. Choose “Save as PDF” in the print dialog.</p><button class="btn" id="shPrint">Print this page</button></div></div>
      <div class="share-opt">${icon('download')}<div style="flex:1"><b>Summary image</b><p>A compact card for WhatsApp or your records.</p><canvas id="shCanvas" width="800" height="440"></canvas><button class="btn" id="shDownload">Download PNG</button></div></div>
      <div class="share-opt">${icon('link')}<div style="flex:1"><b>Dashboard link</b><p>Sign-in with an authorised Google account is still required.</p><div class="link-row"><input class="input" id="shLink" readonly value="${location.origin + location.pathname}"><button class="btn" id="shCopy">Copy</button></div></div></div>
    </div>`, { size: 'sm' });

  drawCard($('#shCanvas', modal));
  $('#shPrint', modal).addEventListener('click', () => { printWithHeader(); });
  $('#shDownload', modal).addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `portfolio-${state.asOf}.png`;
    a.href = $('#shCanvas', modal).toDataURL('image/png');
    a.click();
  });
  $('#shCopy', modal).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#shLink', modal).value); toast('Link copied'); } catch { toast('Copy failed — select the link and copy manually.'); }
  });
}

function printWithHeader() {
  const view = $('#view');
  const hdr = document.createElement('div');
  hdr.className = 'print-only';
  hdr.innerHTML = html`<h1>Portfolio · ${fmt(state.total)}</h1><p class="muted">As of ${fmtDate(state.asOf)}</p>`;
  view.prepend(hdr);
  const cleanup = () => { hdr.remove(); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 2000);
}

function drawCard(canvas) {
  const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d');
  const r = (x, y, w, h, rad) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); };
  ctx.fillStyle = '#0f141b'; r(0, 0, W, H, 24); ctx.fill();
  ctx.fillStyle = '#d9ad3c'; ctx.fillRect(0, 0, W, 4);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#9aa4b2'; ctx.font = '600 13px Inter, sans-serif'; ctx.fillText('NET WORTH', 36, 48);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 48px Inter, sans-serif'; ctx.fillText(fmt(state.total), 36, 100);
  ctx.fillStyle = '#7c8697'; ctx.font = '400 13px Inter, sans-serif'; ctx.fillText(`As of ${fmtDate(state.asOf)}`, 36, 126);

  const top = state.byClass.slice(0, 6);
  const max = top[0]?.value || 1;
  const x0 = 36, y0 = 170, barW = (W - 72 - 5 * 16) / 6;
  top.forEach((c, i) => {
    const x = x0 + i * (barW + 16), h = Math.max(6, c.value / max * 110);
    ctx.fillStyle = c.color; r(x, y0 + 110 - h, barW, h, 6); ctx.fill();
    ctx.fillStyle = '#e7eaf0'; ctx.font = '600 13px Inter, sans-serif'; ctx.fillText(fmtShort(c.value), x, y0 + 134);
    ctx.fillStyle = '#9aa4b2'; ctx.font = '400 11px Inter, sans-serif'; ctx.fillText(`${c.short} · ${pct(c.pct, 0)}`, x, y0 + 152);
  });

  const items = activeHoldings().filter(h => h.cost > 0);
  const cost = items.reduce((a, h) => a + h.cost, 0), gain = state.total - cost, xirr = estimateXIRR(items);
  const stats = [['HOLDINGS', `${activeHoldings().length}`], ['GAIN', `${gain >= 0 ? '+' : ''}${fmtShort(gain)}`], ['RETURN', pct(gain / cost)], ['EST. XIRR', xirr != null ? `${(xirr * 100).toFixed(1)}%` : '—']];
  ctx.fillStyle = '#242c38'; ctx.fillRect(36, 356, W - 72, 1);
  stats.forEach(([l, v], i) => {
    const x = 36 + i * ((W - 72) / 4);
    ctx.fillStyle = '#7c8697'; ctx.font = '600 11px Inter, sans-serif'; ctx.fillText(l, x, 384);
    ctx.fillStyle = '#e7eaf0'; ctx.font = '600 16px Inter, sans-serif'; ctx.fillText(v, x, 408);
  });
  ctx.fillStyle = '#4b5563'; ctx.font = '400 11px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(location.host, W - 36, H - 16); ctx.textAlign = 'left';
}
