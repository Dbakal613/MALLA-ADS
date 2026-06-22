/**
 * Drag & drop logic for course cards.
 *
 * Two drag sources:
 *  1. Native course card  → moves the course to a different semester (sets override).
 *  2. Projected card      → moves the planned placement of a retake/future course.
 *
 * Dispatches 'app:rerender' after a successful drop.
 */

import { COURSES } from './data.js';
import { getCourseById, getSemesterParity, getBlocked, getEffectiveSemester, safeCalculatePlan } from './planner.js';
import { getApproved, getCourseStatus, setSemesterOverride, getAllOverrides, isExtendedSemester } from './state.js';
import { showToast } from './toast.js';

// Drag state — reset on dragend.
let draggedCourseId         = null;  // regular card drag
let draggedProjectedId      = null;  // projected card drag
let draggedProjectedFromSem = null;

// Free drag mode: bypasses all restriction hard-blocks.
let freeDragMode = false;
export const setFreeDragMode = (val) => { freeDragMode = val; };
export const isFreeDragMode  = ()    => freeDragMode;

// ── Drag start ────────────────────────────────────────────────────────────────

export function onDragStart(event, courseId) {
  draggedCourseId = courseId;
  event.dataTransfer.effectAllowed = 'move';
  // Slight delay so the element is visually grabbed before we add the class.
  setTimeout(() => document.getElementById('c-' + courseId)?.classList.add('dragging'), 0);
}

export function onDragStartProjected(event, courseId, fromSem) {
  draggedCourseId         = null;
  draggedProjectedId      = courseId;
  draggedProjectedFromSem = fromSem;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', courseId);
}

export function onDragEnd() {
  if (draggedCourseId) {
    document.getElementById('c-' + draggedCourseId)?.classList.remove('dragging');
  }
  draggedCourseId         = null;
  draggedProjectedId      = null;
  draggedProjectedFromSem = null;
}

// ── Drag over / leave ─────────────────────────────────────────────────────────

export function onDragOver(event, semNumber) {
  event.preventDefault();
  document.getElementById('sem-' + semNumber)?.classList.add('sem-col--drag-over');
}

export function onDragLeave(semNumber) {
  document.getElementById('sem-' + semNumber)?.classList.remove('sem-col--drag-over');
}

// ── Drop ──────────────────────────────────────────────────────────────────────

export function onDrop(event, targetSem) {
  event.preventDefault();
  document.getElementById('sem-' + targetSem)?.classList.remove('sem-col--drag-over');

  if (draggedProjectedId && !draggedCourseId) {
    handleProjectedDrop(targetSem);
    return;
  }
  if (draggedCourseId) {
    handleNativeDrop(targetSem);
  }
}

function handleProjectedDrop(targetSem) {
  const course = getCourseById(draggedProjectedId);
  if (!course) { draggedProjectedId = null; return; }

  if (!freeDragMode && !isValidOffering(course, targetSem)) {
    draggedProjectedId = null; return;
  }

  if (!freeDragMode) {
    const prereqConflicts = getPrereqConflicts(course, targetSem);
    if (prereqConflicts.length) {
      showToast(
        `No puedes mover "${course.name}" al semestre ${targetSem}.\n` +
        `Sus prerrequisitos deben estar antes: ${prereqConflicts.map(p => getCourseById(p)?.name ?? p).join(', ')}.`,
        'error'
      );
      draggedProjectedId = null; return;
    }
  }

  // Use the higher of native semMap credits and plan credits for the destination semester.
  // Plan credits correctly account for other projected courses already placed there.
  const { plan: currentPlan } = safeCalculatePlan();
  const planTargetCredits = (currentPlan[targetSem] ?? [])
    .filter(id => id !== draggedProjectedId)
    .reduce((sum, id) => { const c = getCourseById(id); return c ? sum + c.credits : sum; }, 0);
  const existingCredits = Math.max(computeDestinationCredits(targetSem, draggedProjectedId), planTargetCredits);
  const projCap = 33 + (isExtendedSemester(targetSem) ? 1 : 0);
  if (!freeDragMode && existingCredits + course.credits > projCap) {
    showToast(
      `No puedes mover "${course.name}" al semestre ${targetSem}.\n` +
      `Ese semestre tendría ${existingCredits + course.credits} SCT, superando el límite de ${projCap}.`,
      'error'
    );
    draggedProjectedId = null; return;
  }

  setSemesterOverride(draggedProjectedId, targetSem);
  showToast(`"${course.name}" → semestre ${targetSem}.`, 'success');
  draggedProjectedId = null;
  document.dispatchEvent(new CustomEvent('app:rerender'));
}

function handleNativeDrop(targetSem) {
  const course  = getCourseById(draggedCourseId);
  if (!course) { draggedCourseId = null; return; }

  // Already-completed courses can be freely repositioned (display reorganization only).
  const currentStatus = getCourseStatus(draggedCourseId);
  if (['aprobado', 'adelantado', 'eximido', 'convalidado'].includes(currentStatus)) {
    setSemesterOverride(draggedCourseId, targetSem);
    showToast(`"${course.name}" movido al semestre ${targetSem}.`, 'success');
    draggedCourseId = null;
    document.dispatchEvent(new CustomEvent('app:rerender'));
    return;
  }

  const approved = getApproved();
  const blocked  = getBlocked();

  if (!freeDragMode && !isValidOffering(course, targetSem)) {
    draggedCourseId = null; return;
  }

  // Blocked courses can only be moved if they appear in the plan (ignored in free mode).
  const { plan } = safeCalculatePlan();
  const isInPlan = plan && Object.values(plan).some(ids => ids.includes(draggedCourseId));
  if (!freeDragMode && blocked.has(draggedCourseId) && getCourseStatus(draggedCourseId) !== 'aprobado' && !isInPlan) {
    const culprits = course.prerequisites.filter(p => {
      const blocked2 = getBlocked();
      return getCourseStatus(p) === 'reprobado' || getCourseStatus(p) === 'no-tomado' || blocked2.has(p);
    });
    showToast(
      `❌ "${course.name}" está bloqueado.\nDebes aprobar primero: ${culprits.map(p => getCourseById(p)?.name ?? p).join(', ')}.`,
      'error'
    );
    draggedCourseId = null; return;
  }

  if (!freeDragMode) {
    const prereqConflicts = getPrereqConflicts(course, targetSem);
    if (prereqConflicts.length) {
      showToast(
        `❌ No puedes mover "${course.name}" al semestre ${targetSem}.\n` +
        `Sus prerrequisitos deben estar en semestres anteriores:\n${prereqConflicts.map(p => getCourseById(p)?.name ?? p).join(', ')}.`,
        'error'
      );
      draggedCourseId = null; return;
    }

    // Warn if moving breaks a dependent course.
    const dependentConflicts = COURSES.filter(c =>
      c.prerequisites.includes(draggedCourseId) &&
      getEffectiveSemester(c.id) <= targetSem &&
      !approved.has(c.id)
    );
    if (dependentConflicts.length) {
      showToast(
        `⚠️ Si mueves "${course.name}" al semestre ${targetSem}, estos ramos que dependen de él quedarían mal:\n${dependentConflicts.map(x => x.name).join(', ')}.\nMuévelos primero a semestres posteriores.`,
        'warning'
      );
      draggedCourseId = null; return;
    }
  }

  // Credit cap validation (bypassed in free mode — counter turns red visually).
  const semMap      = buildSemMap();
  const hasPracticum = (semMap[targetSem] ?? []).some(id => getCourseById(id)?.isPracticum);
  const destCredits  = computeDestinationCreditsFromMap(semMap, targetSem, draggedCourseId);

  if (!freeDragMode && hasPracticum && course.credits > 3) {
    showToast(
      `No permitido: el semestre ${targetSem} tiene Práctica Profesional (30 SCT).\nSolo puedes agregar ramos de máximo 3 SCT.`,
      'error'
    );
    draggedCourseId = null; return;
  }

  const cap = 33 + (isExtendedSemester(targetSem) ? 1 : 0);
  if (!freeDragMode && destCredits + course.credits > cap) {
    showToast(
      `No permitido: mover "${course.name}" al semestre ${targetSem} llevaría ese semestre a ${destCredits + course.credits} SCT.\nEl límite es ${cap} SCT.`,
      'error'
    );
    draggedCourseId = null; return;
  }

  setSemesterOverride(draggedCourseId, targetSem);
  showToast(`"${course.name}" movido al semestre ${targetSem}.`, 'success');
  draggedCourseId = null;
  document.dispatchEvent(new CustomEvent('app:rerender'));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidOffering(course, targetSem) {
  if (course.offering === 'both') return true;
  if (getSemesterParity(targetSem) === course.offering) return true;
  showToast(
    `No puedes mover "${course.name}" aquí.\nSe ofrece solo en ${course.offering === 'first' ? 'primer semestre (Mar–Jul)' : 'segundo semestre (Ago–Dic)'}.`,
    'error'
  );
  return false;
}

function getPrereqConflicts(course, targetSem) {
  const approved = getApproved();
  return course.prerequisites.filter(p => {
    if (approved.has(p)) return false;
    if (getCourseStatus(p) === 'cursando') return false;
    return getEffectiveSemester(p) >= targetSem;
  });
}

function buildSemMap() {
  const map = {};
  const overrides = getAllOverrides();
  COURSES.forEach(c => {
    const s = overrides[c.id] ?? c.semester;
    map[s]  = map[s] ?? [];
    map[s].push(c.id);
  });
  return map;
}

function computeDestinationCreditsFromMap(semMap, targetSem, excludeId) {
  const blocked = getBlocked();
  return (semMap[targetSem] ?? []).filter(id => id !== excludeId).reduce((sum, id) => {
    const c  = getCourseById(id);
    if (!c) return sum;
    if (c.isPracticum) return sum + c.credits;
    const st = getCourseStatus(id);
    if (['reprobado', 'no-tomado', 'adelantado', 'eximido', 'convalidado'].includes(st)) return sum;
    if (blocked.has(id) && st === 'pendiente') return sum;
    return sum + c.credits;
  }, 0);
}

function computeDestinationCredits(targetSem, excludeId) {
  return computeDestinationCreditsFromMap(buildSemMap(), targetSem, excludeId);
}
