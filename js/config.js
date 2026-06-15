/**
 * Configuration modal — lets the user set their current semester and pace strategy.
 * Dispatches 'app:rerender' when applied.
 */

import { getStrategy, getCurrentYear, getSemesterOfYear, setCurrentSemester, setStrategy, resetAll } from './state.js';
import { showToast } from './toast.js';

// Temporary selections while the modal is open (discarded on cancel).
let tempYear      = null;
let tempSemOfYear = null;
let tempStrategy  = null;

export function openConfig() {
  tempYear      = getCurrentYear();
  tempSemOfYear = getSemesterOfYear();
  tempStrategy  = getStrategy();

  // Reflect current state in the modal buttons.
  syncModalButtons();
  document.getElementById('config-modal').classList.add('modal-overlay--open');
}

export function closeConfig() {
  document.getElementById('config-modal').classList.remove('modal-overlay--open');
}

export function applyConfig() {
  if (!tempYear || !tempSemOfYear) {
    showToast('Selecciona año y semestre primero.', 'error');
    return;
  }
  setCurrentSemester(tempYear, tempSemOfYear);
  setStrategy(tempStrategy ?? 'equilibrada');
  closeConfig();
  updateTopbarBadge();
  document.dispatchEvent(new CustomEvent('app:rerender'));
}

/** Called from event delegation when a config button is clicked. */
export function handleConfigClick(action, value) {
  if (action === 'set-year') {
    tempYear = Number(value);
  } else if (action === 'set-sem') {
    tempSemOfYear = Number(value);
  } else if (action === 'set-config-strategy') {
    tempStrategy = value;
  }
  syncModalButtons();
}

export function updateTopbarBadge() {
  const el       = document.getElementById('topbar-badge');
  const year     = getCurrentYear();
  const strategy = getStrategy();
  if (!year) {
    el.textContent = 'Sin configurar';
    el.className   = 'topbar-badge';
    return;
  }
  const strategyLabels = { rapida: '🚀 Rápida', equilibrada: '⚖️ Equilibrada', tranquila: '🌿 Tranquila' };
  el.textContent = `${year}° año · ${getSemesterOfYear() === 1 ? '1er' : '2do'} sem · ${strategyLabels[strategy]}`;
  el.className   = 'topbar-badge topbar-badge--active';
}

export function handleReset() {
  document.getElementById('confirm-reset-modal').classList.add('modal-overlay--open');
}

export function doReset() {
  document.getElementById('confirm-reset-modal').classList.remove('modal-overlay--open');
  resetAll();
  updateTopbarBadge();
  document.dispatchEvent(new CustomEvent('app:rerender'));
}

// ── Internal ──────────────────────────────────────────────────────────────────

function syncModalButtons() {
  document.querySelectorAll('[data-action="set-year"]').forEach(btn => {
    btn.classList.toggle('config-option--selected', Number(btn.dataset.value) === tempYear);
  });
  document.querySelectorAll('[data-action="set-sem"]').forEach(btn => {
    btn.classList.toggle('config-option--selected', Number(btn.dataset.value) === tempSemOfYear);
  });
  document.querySelectorAll('[data-action="set-config-strategy"]').forEach(btn => {
    btn.classList.toggle('config-option--selected', btn.dataset.strategy === (tempStrategy ?? 'equilibrada'));
  });
}
