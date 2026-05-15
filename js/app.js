/**
 * Application entry point.
 *
 * Responsibilities:
 *  - Orchestrate render() by pulling data from all modules.
 *  - Set up event delegation on the grid, panel, topbar, and modal.
 *  - Wire drag & drop events.
 *  - Listen for 'app:rerender' dispatched by action modules.
 */

import { getApproved, getFailed, getNotTaken, getCurrentlyStudying, getPostponed,
         getCourseStatus, getCurrentSemesterNumber, getStrategy, getAllOverrides,
         getAllExtensions, toggleSemesterExtension,
         setCourseStatus, postponeCourse, resumeCourse, setStrategy } from './state.js';
import { getBlocked, getCourseById, buildSemMap, safeCalculatePlan } from './planner.js';
import { buildGridHTML }   from './grid-html.js';
import { buildPanelHTML, buildSumbarHTML } from './panel-html.js';
import { openContextMenu, closeContextMenu } from './context-menu.js';
import { onDragStart, onDragStartProjected, onDragEnd, onDragOver, onDragLeave, onDrop } from './drag-drop.js';
import { openConfig, closeConfig, applyConfig, handleConfigClick, updateTopbarBadge, handleReset } from './config.js';
import { showToast } from './toast.js';
import { initOnboarding, closeOnboarding } from './onboarding.js';

// ── Module-level semMap ───────────────────────────────────────────────────────
// Kept here so the mark-semester handler can look up course IDs without relying
// on a window global.
let lastSemMap = {};

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  try {
    _render();
  } catch (e) {
    console.error('render:', e);
    showToast('Error al procesar la malla: ' + e.message, 'error');
  }
}

function _render() {
  const approved   = getApproved();
  const failed     = getFailed();
  const notTaken   = getNotTaken();
  const studying   = getCurrentlyStudying();
  const blocked    = getBlocked();
  const postponed  = getPostponed();
  const currentSem = getCurrentSemesterNumber();
  const strategy   = getStrategy();
  const { recommended, plan } = safeCalculatePlan();

  // Build semMap once per render; pass it down instead of using a global.
  lastSemMap = buildSemMap();

  document.getElementById('grid').innerHTML = buildGridHTML({
    approved, failed, notTaken, blocked, recommended, plan,
    currentSem, postponed, getCourseStatus, semMap: lastSemMap,
    overrides: getAllOverrides(), semExtensions: getAllExtensions(),
  });

  document.getElementById('panel').innerHTML = buildPanelHTML({
    approved, studying, failed, notTaken, blocked, recommended, plan,
    postponed, currentSem, strategy,
  });

  document.getElementById('sumbar').innerHTML = buildSumbarHTML({
    approved, studying, failed, notTaken, blocked, recommended,
  });

  attachDragListeners();
}

// ── Drag event attachment (runs after each render) ───────────────────────────

function attachDragListeners() {
  // Direct click listener on every card so the context menu opens reliably.
  // Some browsers swallow click events on draggable="true" elements before they
  // bubble to the document-level delegation handler — this bypasses that issue.
  document.querySelectorAll('.course-card[data-course-id]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openContextMenu(e, el.dataset.courseId);
    });
  });

  // Course cards — native drag.
  document.querySelectorAll('.course-card[draggable="true"]:not([data-projected-from-sem])').forEach(el => {
    el.addEventListener('dragstart', e => onDragStart(e, el.dataset.courseId));
    el.addEventListener('dragend',   () => onDragEnd());
  });

  // Projected cards.
  document.querySelectorAll('.course-card[data-projected-from-sem]').forEach(el => {
    el.addEventListener('dragstart', e => onDragStartProjected(e, el.dataset.courseId, Number(el.dataset.projectedFromSem)));
    el.addEventListener('dragend',   () => onDragEnd());
  });

  // Semester columns as drop targets.
  document.querySelectorAll('.sem-col[data-sem]').forEach(el => {
    const sem = Number(el.dataset.sem);
    el.addEventListener('dragover',  e => onDragOver(e, sem));
    el.addEventListener('dragleave', () => onDragLeave(sem));
    el.addEventListener('drop',      e => onDrop(e, sem));
  });
}

// ── Event delegation ──────────────────────────────────────────────────────────

document.addEventListener('click', handleClick);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContextMenu(); });
document.addEventListener('app:rerender', () => render());

function handleClick(event) {
  const target = event.target;

  // Context menu: close when clicking outside.
  if (!target.closest('#context-menu') && !target.closest('.course-card')) {
    closeContextMenu();
  }

  // Find the nearest element with a data-action.
  const el     = target.closest('[data-action]');
  if (!el) return;

  const action   = el.dataset.action;
  const courseId = el.dataset.courseId;
  const status   = el.dataset.status;
  const strategy = el.dataset.strategy;
  const sem      = el.dataset.sem ? Number(el.dataset.sem) : null;

  switch (action) {
    // ── Course card → open context menu ──────────────────────────────────────
    case 'open-context-menu':
      openContextMenu(event, courseId);
      break;

    // ── Context menu actions ──────────────────────────────────────────────────
    case 'set-status':
      closeContextMenu();
      setCourseStatus(courseId, status);
      render();
      break;

    case 'postpone':
      closeContextMenu();
      postponeCourse(courseId);
      render();
      showToast(`"${getCourseById(courseId)?.name}" pospuesto para este semestre. El plan buscará alternativas.`, 'success');
      break;

    case 'resume':
      closeContextMenu();
      resumeCourse(courseId);
      render();
      showToast(`"${getCourseById(courseId)?.name}" incluido de nuevo en el plan.`, 'success');
      break;

    case 'close-menu':
      closeContextMenu();
      break;

    // ── Semester header ────────────────────────────────────────────────────────
    case 'mark-semester': {
      event.stopPropagation();
      const ids = lastSemMap[sem] ?? [];
      if (!ids.length) { showToast('No hay ramos en este semestre.', 'warning'); break; }
      ids.forEach(id => {
        const c = getCourseById(id);
        if (!c || c.isPracticum) return;
        setCourseStatus(id, 'aprobado');
      });
      showToast(`Semestre ${sem} marcado como aprobado. Ahora puedes editar ramos individuales.`, 'success');
      render();
      break;
    }

    case 'mark-semester-studying': {
      event.stopPropagation();
      const ids = lastSemMap[sem] ?? [];
      if (!ids.length) { showToast('No hay ramos en este semestre.', 'warning'); break; }
      const blockedSet = getBlocked();
      ids.forEach(id => {
        const c = getCourseById(id);
        if (!c || c.isPracticum) return;
        const st = getCourseStatus(id);
        if (['aprobado', 'adelantado', 'eximido', 'convalidado'].includes(st)) return;
        if (blockedSet.has(id) && st === 'pendiente') return;
        setCourseStatus(id, 'cursando');
      });
      showToast(`Ramos disponibles del semestre ${sem} marcados como "cursando ahora".`, 'success');
      render();
      break;
    }

    case 'extend-semester': {
      event.stopPropagation();
      toggleSemesterExtension(sem);
      const extended = getAllExtensions().has(sem);
      showToast(extended
        ? `Semestre ${sem}: cupo ampliado a 34 SCT.`
        : `Semestre ${sem}: cupo vuelto a 33 SCT.`, 'success');
      render();
      break;
    }

    // ── Strategy (side panel) ─────────────────────────────────────────────────
    case 'set-strategy':
      setStrategy(strategy);
      updateTopbarBadge();
      render();
      break;

    // ── Topbar ────────────────────────────────────────────────────────────────
    case 'open-config':
      openConfig();
      break;

    case 'reset-all':
      handleReset();
      break;

    // ── Config modal ──────────────────────────────────────────────────────────
    case 'set-year':
    case 'set-sem':
    case 'set-config-strategy':
      handleConfigClick(action, el.dataset.value ?? el.dataset.strategy);
      break;

    case 'close-config':
      closeConfig();
      break;

    // ── Onboarding ────────────────────────────────────────────────────────────
    case 'open-onboarding':
      document.getElementById('onboarding-modal').classList.add('modal-overlay--open');
      break;

    case 'close-onboarding':
      closeOnboarding();
      break;

    case 'show-onboarding-again':
      localStorage.removeItem('malla-onboarding-v1');
      break;

    case 'apply-config':
      applyConfig();
      break;
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

render();
initOnboarding();
