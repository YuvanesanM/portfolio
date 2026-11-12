import { $ } from './util.js';

let onCloseCb = null;

export function openModal(content, { size = '', onClose } = {}) {
  const root = $('#modalRoot');
  onCloseCb = onClose || null;
  root.innerHTML = `<div class="modal-backdrop" data-action="closeModal"><div class="modal ${size}" role="dialog" aria-modal="true">${content}</div></div>`;
  document.body.style.overflow = 'hidden';
  return root.querySelector('.modal');
}

export function closeModal() {
  const root = $('#modalRoot');
  if (!root.firstChild) return;
  root.innerHTML = '';
  document.body.style.overflow = '';
  onCloseCb?.();
  onCloseCb = null;
}

export const modalOpen = () => !!$('#modalRoot').firstChild;

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}
