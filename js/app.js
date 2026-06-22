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
         setCourseStatus, postponeCourse, resumeCourse, setStrategy, setCurrentSemester,
         getStateSnapshot, restoreStateSnapshot } from './state.js';
import { getBlocked, getCourseById, buildSemMap, safeCalculatePlan, getSemesterParity } from './planner.js';
import { COURSES, TOTAL_CREDITS } from './data.js';
import { buildGridHTML }   from './grid-html.js';
import { buildPanelHTML } from './panel-html.js';
import { openContextMenu, closeContextMenu } from './context-menu.js';
import { onDragStart, onDragStartProjected, onDragEnd, onDragOver, onDragLeave, onDrop, setFreeDragMode } from './drag-drop.js';
import { openConfig, closeConfig, applyConfig, handleConfigClick, updateTopbarBadge, handleReset, doReset } from './config.js';
import { showToast } from './toast.js';
import { initOnboarding, closeOnboarding, getUserName, getUserPace, saveUser, clearUserData } from './onboarding.js';
import { updateStudentProfile, getStudentProfile, clearStudentProfile } from './student-profile.js';
import { initScheduleView, destroyScheduleView } from './schedule-view.js';

// ── Module-level state snapshots ─────────────────────────────────────────────
// Kept here so action handlers can reference the last-rendered values without
// re-deriving them.
let lastSemMap     = {};
let lastPlan       = {};
let lastCurrentSem = null;
let lastStrategy   = 'equilibrada';
let lastSearchQuery = '';
let whatIfSnapshot  = null;
let scheduleMode    = false;

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  try {
    _render();
  } catch (e) {
    console.error('render:', e);
    showToast('Error al procesar la malla: ' + e.message, 'error');
  }
}

function updateTopbarGreeting() {
  const name = getUserName();
  const el   = document.getElementById('topbar-user-greeting');
  if (!el) return;
  el.textContent = name ? `${name} ·` : '';
  el.style.display = name ? '' : 'none';
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

  // Snapshot state for action handlers.
  lastSemMap     = buildSemMap();
  lastPlan       = plan;
  lastCurrentSem = currentSem;
  lastStrategy   = strategy;

  document.getElementById('grid').innerHTML = buildGridHTML({
    approved, failed, notTaken, blocked, recommended, plan,
    currentSem, postponed, getCourseStatus, semMap: lastSemMap,
    overrides: getAllOverrides(), semExtensions: getAllExtensions(),
  });

  document.getElementById('panel').innerHTML = buildPanelHTML({
    approved, studying, failed, notTaken, blocked, recommended, plan,
    postponed, currentSem, strategy,
  });

  attachDragListeners();
  applySearchFilter(lastSearchQuery);
  updateTopbarGreeting();
  renderGreetingBar();
  updateProjectionCTA();
  updateFreeDragBtn();
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
      const nonPracIds = ids.filter(id => { const c = getCourseById(id); return c && !c.isPracticum; });
      const allApproved = nonPracIds.length > 0 && nonPracIds.every(id =>
        ['aprobado', 'adelantado', 'eximido', 'convalidado'].includes(getCourseStatus(id))
      );
      if (allApproved) {
        nonPracIds.forEach(id => setCourseStatus(id, 'pendiente'));
        showToast(`Semestre ${sem} revertido a pendiente.`, 'success');
      } else {
        nonPracIds.forEach(id => setCourseStatus(id, 'aprobado'));
        showToast(`Semestre ${sem} marcado como aprobado. Puedes editar ramos individualmente.`, 'success');
      }
      render();
      break;
    }

    case 'mark-semester-studying': {
      event.stopPropagation();
      const ids = lastSemMap[sem] ?? [];
      if (!ids.length) { showToast('No hay ramos en este semestre.', 'warning'); break; }
      const blockedSet = getBlocked();
      const eligible = ids.filter(id => {
        const c = getCourseById(id);
        if (!c || c.isPracticum) return false;
        const st = getCourseStatus(id);
        if (['aprobado', 'adelantado', 'eximido', 'convalidado'].includes(st)) return false;
        if (blockedSet.has(id) && st === 'pendiente') return false;
        return true;
      });
      const allStudying = eligible.length > 0 && eligible.every(id => getCourseStatus(id) === 'cursando');
      if (allStudying) {
        eligible.forEach(id => setCourseStatus(id, 'pendiente'));
        showToast(`Semestre ${sem}: ramos desmarcados como "cursando".`, 'success');
      } else {
        eligible.forEach(id => setCourseStatus(id, 'cursando'));
        showToast(`Ramos disponibles del semestre ${sem} marcados como "cursando ahora".`, 'success');
      }
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

    // ── Profile actions (greeting bar) ───────────────────────────────────────
    case 'edit-profile': {
      const profile = getStudentProfile();
      const ni = document.getElementById('welcome-name-input');
      if (ni) ni.value = profile.name || '';
      hideWelcomeError();
      document.getElementById('welcome-modal').classList.add('modal-overlay--open');
      break;
    }

    case 'reset-profile': {
      if (!confirm('¿Reiniciar tu perfil?\n\nTu avance en los ramos se mantendrá. Solo se borrará tu nombre, semestre actual y ritmo.')) break;
      clearUserData();
      clearStudentProfile();
      setCurrentSemester(null, null);
      setStrategy('equilibrada');
      const ni2 = document.getElementById('welcome-name-input');
      if (ni2) ni2.value = '';
      hideWelcomeError();
      document.getElementById('welcome-modal').classList.add('modal-overlay--open');
      updateTopbarBadge();
      render();
      break;
    }

    // ── Welcome screen: Step 1 (name) ─────────────────────────────────────────
    case 'save-name': {
      const nameInput = document.getElementById('welcome-name-input');
      const wName    = nameInput?.value?.trim() ?? '';
      if (!wName) {
        showWelcomeError('Escribe tu nombre para continuar. Lo usaremos para personalizar tu experiencia.');
        nameInput?.focus();
        break;
      }
      const curProfile = getStudentProfile();
      saveUser(wName, curProfile.preferredPace || getUserPace() || 'equilibrada');
      updateStudentProfile({ name: wName });
      // Fill the personalized name in the instructivo
      const nameSpan = document.getElementById('onboarding-name');
      if (nameSpan) nameSpan.textContent = wName;
      document.getElementById('welcome-modal').classList.remove('modal-overlay--open');
      document.getElementById('onboarding-modal').classList.add('modal-overlay--open');
      render();
      break;
    }

    // ── Onboarding: Step 2 (instructivo) ─────────────────────────────────────
    case 'start-app': {
      document.getElementById('onboarding-modal').classList.remove('modal-overlay--open');
      updateProjectionCTA();
      render();
      break;
    }

    // ── Projection: Step 3 (semester + pace) ─────────────────────────────────
    case 'select-proj-sem':
      document.querySelectorAll('.proj-sem-btn').forEach(b => b.classList.remove('proj-sem-btn--selected'));
      el.classList.add('proj-sem-btn--selected');
      hideProjectionError();
      break;

    case 'select-proj-pace':
      document.querySelectorAll('.proj-pace-btn').forEach(b => b.classList.remove('proj-pace-btn--selected'));
      el.classList.add('proj-pace-btn--selected');
      hideProjectionError();
      break;

    case 'open-projection-setup': {
      const profile = getStudentProfile();
      document.querySelectorAll('.proj-sem-btn').forEach(b => {
        b.classList.toggle('proj-sem-btn--selected', profile.currentSemester ? Number(b.dataset.sem) === profile.currentSemester : false);
      });
      document.querySelectorAll('.proj-pace-btn').forEach(b => {
        b.classList.toggle('proj-pace-btn--selected', b.dataset.pace === (profile.preferredPace || 'equilibrada'));
      });
      hideProjectionError();
      document.getElementById('projection-modal').classList.add('modal-overlay--open');
      break;
    }

    case 'save-projection': {
      const semBtn  = document.querySelector('.proj-sem-btn--selected');
      const wSemNum = semBtn ? Number(semBtn.dataset.sem) : null;
      const paceBtn = document.querySelector('.proj-pace-btn--selected');
      const wPace   = paceBtn?.dataset?.pace ?? null;

      if (!wSemNum) {
        showProjectionError('Selecciona el semestre en que te encuentras actualmente.');
        break;
      }
      if (!wPace) {
        showProjectionError('Elige el ritmo que mejor se adapte a ti.');
        break;
      }

      const wYear  = wSemNum === 9 ? 5 : Math.ceil(wSemNum / 2);
      const wSemOY = wSemNum === 9 ? 1 : (wSemNum % 2 === 0 ? 2 : 1);
      const projProfile = getStudentProfile();

      saveUser(projProfile.name, wPace);
      setCurrentSemester(wYear, wSemOY);
      setStrategy(wPace);
      updateStudentProfile({ currentSemester: wSemNum, preferredPace: wPace, hasCompletedOnboarding: true });

      document.getElementById('projection-modal').classList.remove('modal-overlay--open');
      updateTopbarBadge();
      render();
      showToast(`¡Proyección lista, ${projProfile.name}! Tu ruta está configurada.`, 'success');
      break;
    }

    case 'change-name': {
      const curName = getUserName();
      const newName = prompt('¿Cómo quieres llamarte?', curName);
      if (newName === null) break;
      const trimmed = newName.trim();
      if (!trimmed) { showToast('El nombre no puede estar vacío.', 'warning'); break; }
      saveUser(trimmed, getUserPace() || 'equilibrada');
      render();
      showToast(`Nombre actualizado: ${trimmed}`, 'success');
      break;
    }

    // ── Onboarding ────────────────────────────────────────────────────────────
    case 'open-onboarding': {
      const nameSpanO = document.getElementById('onboarding-name');
      if (nameSpanO) nameSpanO.textContent = getStudentProfile().name || '...';
      document.getElementById('onboarding-modal').classList.add('modal-overlay--open');
      break;
    }

    case 'close-onboarding':
      closeOnboarding();
      break;

    case 'show-onboarding-again':
      localStorage.removeItem('malla-onboarding-v1');
      break;

    case 'apply-config':
      applyConfig();
      break;

    case 'download-projection':
      downloadProjection();
      break;

    // ── Confirm reset modal ───────────────────────────────────────────────────
    case 'do-reset':
      doReset();
      break;

    case 'cancel-reset':
      document.getElementById('confirm-reset-modal').classList.remove('modal-overlay--open');
      break;

    // ── Schedule view toggle ──────────────────────────────────────────────────
    case 'toggle-schedule-view': {
      scheduleMode = !scheduleMode;
      const mainEl  = document.querySelector('.main');
      const svEl    = document.getElementById('schedule-view');
      const btn     = document.getElementById('schedule-toggle-btn');
      const search  = document.getElementById('topbar-search');
      const infobar = document.querySelector('.infobar');
      const greeting = document.getElementById('greeting-bar');
      const cta      = document.getElementById('projection-cta');
      if (scheduleMode) {
        mainEl.style.display   = 'none';
        if (infobar)  infobar.style.display  = 'none';
        if (greeting) greeting.style.display = 'none';
        if (cta)      cta.style.display      = 'none';
        search.style.display   = 'none';
        svEl.style.display     = 'flex';
        if (btn) btn.textContent = '← Malla';
        initScheduleView();
      } else {
        svEl.style.display     = 'none';
        mainEl.style.display   = '';
        if (infobar)  infobar.style.display  = '';
        if (greeting) greeting.style.display = '';
        search.style.display   = '';
        if (btn) btn.textContent = '📅 Ver horario';
        destroyScheduleView();
        updateProjectionCTA();
      }
      break;
    }

    // ── Whatif (simulation) mode ──────────────────────────────────────────────
    // ── Free drag mode ────────────────────────────────────────────────────────
    case 'activate-free-drag': {
      setFreeDragMode(true);
      document.getElementById('free-drag-banner').style.display = '';
      document.getElementById('free-drag-btn').style.display = 'none';
      showToast('Modo libre activado. Arrastra los ramos sin restricciones.', 'success');
      break;
    }

    case 'exit-free-drag':
      setFreeDragMode(false);
      document.getElementById('free-drag-banner').style.display = 'none';
      document.getElementById('free-drag-btn').style.display = '';
      break;

    case 'activate-whatif':
      if (whatIfSnapshot) break;
      whatIfSnapshot = getStateSnapshot();
      document.getElementById('whatif-banner').style.display = '';
      showToast('Modo simulación activo. Tus cambios son temporales.', 'success');
      break;

    case 'exit-whatif-discard':
      if (!whatIfSnapshot) break;
      restoreStateSnapshot(whatIfSnapshot);
      whatIfSnapshot = null;
      document.getElementById('whatif-banner').style.display = 'none';
      updateTopbarBadge();
      render();
      showToast('Simulación descartada. Estado restaurado.', 'success');
      break;

    case 'exit-whatif-apply':
      whatIfSnapshot = null;
      document.getElementById('whatif-banner').style.display = 'none';
      showToast('Cambios de la simulación guardados.', 'success');
      break;
  }
}

// ── Search filter ────────────────────────────────────────────────────────────

function applySearchFilter(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('.course-card[data-course-id]').forEach(card => {
    if (!q) {
      card.style.opacity = '';
      card.style.outline = '';
      return;
    }
    const name  = card.querySelector('.course-name')?.textContent.toLowerCase() ?? '';
    const match = name.includes(q);
    card.style.opacity      = match ? '' : '0.12';
    card.style.outline      = match ? '2px solid var(--blue)' : '';
    card.style.outlineOffset = match ? '2px' : '';
  });
}

// ── Download projection ───────────────────────────────────────────────────────

function downloadProjection() {
  const approved  = getApproved();
  const studying  = getCurrentlyStudying();
  const failed    = getFailed();
  const notTaken  = getNotTaken();

  const approvedSCT = COURSES.filter(c => approved.has(c.id)).reduce((sum, c) => sum + c.credits, 0);
  const pct         = Math.round(approvedSCT / TOTAL_CREDITS * 100);
  const delayed     = failed.size + notTaken.size;

  const semLabel = (s) => getSemesterParity(s) === 'first' ? 'Mar–Jul' : 'Ago–Dic';
  const strategyNames = { rapida: 'Rápida', equilibrada: 'Equilibrada', tranquila: 'Tranquila' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  const sep  = '='.repeat(52);
  const sep2 = '─'.repeat(52);

  const lines = [
    sep,
    '  PROYECCIÓN MALLA CURRICULAR',
    '  Administración de Servicios',
    `  Generada el ${dateStr}`,
    sep,
    '',
    'CONFIGURACIÓN',
    `  Semestre actual : ${lastCurrentSem ?? '—'}`,
    `  Ritmo de avance : ${strategyNames[lastStrategy] ?? lastStrategy}`,
    '',
    'PROGRESO',
    `  SCT aprobados   : ${approvedSCT} / ${TOTAL_CREDITS} (${pct}%)`,
    `  Ramos aprobados : ${approved.size}`,
    `  Ramos atrasados : ${delayed} (${failed.size} reprobados · ${notTaken.size} no tomados)`,
    '',
    sep,
    '  PLAN COMPLETO',
    sep,
    '',
  ];

  if (!lastCurrentSem) {
    lines.push('  (No hay semestre configurado. Configura tu semestre actual primero.)');
  } else {
    const nextSem   = lastCurrentSem + 1;
    const allSems   = Object.keys(lastPlan).map(Number).sort((a, b) => a - b);

    // Next semester recommendation
    const nextIds = lastPlan[nextSem] ?? [];
    if (nextIds.length) {
      const nextSCT = nextIds.reduce((sum, id) => sum + (getCourseById(id)?.credits ?? 0), 0);
      lines.push(`▸ PRÓXIMO SEMESTRE ${nextSem} (${semLabel(nextSem)}) — ${nextSCT} SCT  ★`);
      nextIds.forEach(id => {
        const c = getCourseById(id);
        if (c) lines.push(`    • ${c.name}  (${c.credits} SCT)`);
      });
      lines.push('');
    }

    // Future semesters
    const futureSems = allSems.filter(s => s > nextSem);
    futureSems.forEach(s => {
      const ids      = lastPlan[s] ?? [];
      const semSCT   = ids.reduce((sum, id) => sum + (getCourseById(id)?.credits ?? 0), 0);
      lines.push(sep2);
      lines.push(`  Semestre ${s}  ·  ${semLabel(s)}  ·  ${semSCT} SCT`);
      lines.push(sep2);
      ids.forEach(id => {
        const c = getCourseById(id);
        if (c) lines.push(`    • ${c.name}  (${c.credits} SCT)`);
      });
      lines.push('');
    });

    if (!nextIds.length && !futureSems.length) {
      lines.push('  No hay semestres futuros proyectados.');
    }
  }

  lines.push(sep);
  lines.push('  Generado con Malla Curricular — ADS');
  lines.push(sep);

  const content = lines.join('\n');
  const blob    = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `proyeccion-malla-sem${lastCurrentSem ?? 'sin-config'}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Proyección descargada.', 'success');
}

// ── Greeting bar ─────────────────────────────────────────────────────────────

const GREETING_SUBTITLES = {
  rapida:      'Buscaremos una ruta eficiente para avanzar lo antes posible, cuidando que la carga siga siendo realista.',
  equilibrada: 'Planifiquemos una ruta clara, exigente pero sostenible.',
  tranquila:   'Avancemos paso a paso, priorizando una carga manejable y estable.',
};

function renderGreetingBar() {
  const el = document.getElementById('greeting-bar');
  if (!el) return;
  const profile  = getStudentProfile();
  const name     = profile.name?.trim();
  const pace     = profile.preferredPace;

  const title    = name
    ? `Hola, <strong>${name}</strong>, organicemos tu ruta.`
    : 'Organicemos tu ruta académica.';
  const subtitle = GREETING_SUBTITLES[pace] || 'Entiende tu avance, ajusta tus ramos y proyecta tus próximos semestres.';

  el.innerHTML = `
    <div class="greeting-bar-text">
      <p class="greeting-title">${title}</p>
      <p class="greeting-subtitle">${subtitle}</p>
    </div>
    <div class="greeting-bar-actions">
      <button class="btn greeting-bar-btn"          data-action="edit-profile">✏ Cambiar perfil</button>
      <button class="btn greeting-bar-btn greeting-bar-btn--danger" data-action="reset-profile">↩ Reiniciar perfil</button>
    </div>`;
}

// ── Welcome / Projection screen helpers ──────────────────────────────────────

function showWelcomeError(msg) {
  const el = document.getElementById('welcome-validation');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideWelcomeError() {
  const el = document.getElementById('welcome-validation');
  if (el) el.style.display = 'none';
}

function showProjectionError(msg) {
  const el = document.getElementById('projection-validation');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideProjectionError() {
  const el = document.getElementById('projection-validation');
  if (el) el.style.display = 'none';
}

function updateProjectionCTA() {
  const profile = getStudentProfile();
  const el = document.getElementById('projection-cta');
  if (!el) return;
  el.style.display = (profile.name && !profile.hasCompletedOnboarding) ? '' : 'none';
}

function updateFreeDragBtn() {
  const btn     = document.getElementById('free-drag-btn');
  const banner  = document.getElementById('free-drag-banner');
  if (!btn) return;
  const profile = getStudentProfile();
  const configured = !!(profile.hasCompletedOnboarding && getCurrentSemesterNumber());
  // Hide the button while the banner is visible (mode is active).
  const bannerVisible = banner && banner.style.display !== 'none';
  btn.style.display = (configured && !bannerVisible) ? '' : 'none';
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

render();
initOnboarding();
updateProjectionCTA();

document.getElementById('welcome-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.querySelector('[data-action="save-name"]')?.click();
});
document.getElementById('welcome-name-input').addEventListener('input', () => hideWelcomeError());

document.getElementById('topbar-search').addEventListener('input', e => {
  lastSearchQuery = e.target.value;
  applySearchFilter(lastSearchQuery);
});

document.getElementById('topbar-search').addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    e.target.value = '';
    lastSearchQuery = '';
    applySearchFilter('');
  }
});
