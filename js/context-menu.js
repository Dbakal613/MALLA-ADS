/**
 * Context menu shown when the user clicks a course card.
 * Uses data attributes; actual state mutations happen in app.js via the rerender event.
 */

import { COURSES, EXEMPTABLE_COURSE_IDS } from './data.js';
import { getCourseById, getBlocked, getEffectiveSemester } from './planner.js';
import { getCourseStatus, isPostponed } from './state.js';

export function openContextMenu(event, courseId) {
  event.preventDefault();
  event.stopPropagation();
  closeContextMenu();

  const course   = getCourseById(courseId);
  if (!course) return;

  const status   = getCourseStatus(courseId);
  const blocked  = getBlocked();
  const isBlocked = blocked.has(courseId) && status === 'pendiente';
  const postponed = isPostponed(courseId);
  const prereqNames = course.prerequisites.map(p => getCourseById(p)?.name ?? p);
  const unlocks  = COURSES.filter(c => c.prerequisites.includes(courseId)).map(c => c.name);

  const meta = `${course.credits} SCT · Sem ${getEffectiveSemester(courseId)} · ${course.area}`;
  const description = buildDescription(course, status, isBlocked, prereqNames, unlocks);

  const isApproved = ['aprobado', 'adelantado', 'eximido', 'convalidado'].includes(status);

  const items = [
    !isApproved
      ? menuButton('set-status', courseId, 'aprobado', 'menu-item--approved', '✓ Ya lo aprobé')
      : '',
    status !== 'cursando' && !course.isPracticum
      ? menuButton('set-status', courseId, 'cursando', '', '📖 Lo estoy cursando ahora', 'color:var(--blue);font-weight:500')
      : '',
    status !== 'adelantado' && !course.isPracticum
      ? menuButton('set-status', courseId, 'adelantado', '', '⚡ Lo tomé por adelantado', 'color:#4338CA')
      : '',
    EXEMPTABLE_COURSE_IDS.has(courseId) && status !== 'eximido'
      ? menuButton('set-status', courseId, 'eximido', '', '⊘ Estoy eximido de este ramo', 'color:#166534')
      : '',
    status !== 'convalidado' && !course.isPracticum
      ? menuButton('set-status', courseId, 'convalidado', '', '⇌ Lo convalidé de otra carrera', 'color:#0891B2')
      : '',
    status !== 'reprobado' && !isBlocked && !course.isPracticum
      ? menuButton('set-status', courseId, 'reprobado', 'menu-item--failed', '↩ Lo reprobé')
      : '',
    status !== 'no-tomado' && !isBlocked && !course.isPracticum
      ? menuButton('set-status', courseId, 'no-tomado', 'menu-item--not-taken', '⏭ No lo tomé este semestre')
      : '',
    status !== 'pendiente'
      ? menuButton('set-status', courseId, 'pendiente', 'menu-item--muted', '← Aún no lo he tomado')
      : '',
    status === 'pendiente' && !isBlocked && !course.isPracticum && !postponed
      ? menuButton('postpone', courseId, '', 'menu-item--muted', '⏸ Dejarlo para después')
      : '',
    postponed
      ? menuButton('resume', courseId, '', 'menu-item--muted', '▶ Retomarlo en el plan')
      : '',
    isBlocked
      ? `<div class="menu-item menu-item--muted" style="cursor:default;opacity:.5;font-size:10px">🔒 Disponible cuando apruebes los prerrequisitos</div>`
      : '',
  ].filter(Boolean).join('');

  const menu = document.getElementById('context-menu');
  menu.innerHTML = `
    <div class="context-menu-header">
      <div class="context-menu-title">${course.name}</div>
      <div class="context-menu-meta">${meta}</div>
      ${description ? `<div class="context-menu-description">${description}</div>` : ''}
    </div>
    <div class="menu-divider"></div>
    ${items}
    <div class="menu-divider"></div>
    <button class="menu-item menu-item--muted" data-action="close-menu">Cerrar</button>`;

  positionMenu(menu, event);
  menu.style.display = 'block';
}

export function closeContextMenu() {
  document.getElementById('context-menu').style.display = 'none';
}

function menuButton(action, courseId, status, extraClass, label, style = '') {
  const statusAttr = status ? `data-status="${status}"` : '';
  return `
    <button class="menu-item ${extraClass}" style="${style}"
            data-action="${action}"
            data-course-id="${courseId}"
            ${statusAttr}>
      ${label}
    </button>`;
}

function buildDescription(course, status, isBlocked, prereqNames, unlocks) {
  if (course.isPracticum) {
    return 'Corresponde a la práctica profesional obligatoria de la carrera.';
  }

  const parts = [];

  if (isBlocked && prereqNames.length) {
    parts.push(`Para tomarlo necesitas aprobar primero: ${prereqNames.join(', ')}.`);
  } else if (prereqNames.length === 0 && !['aprobado','adelantado','eximido','convalidado'].includes(status)) {
    parts.push('No tiene prerrequisitos — puedes tomarlo en cualquier momento.');
  }

  if (unlocks.length) {
    const shown = unlocks.slice(0, 2).join(' y ');
    const extra = unlocks.length > 2 ? ` (+${unlocks.length - 2} más)` : '';
    parts.push(`Aprobarlo te habilita: ${shown}${extra}.`);
  }

  return parts.join(' ');
}

function positionMenu(menu, event) {
  // event.currentTarget is `document` (event delegation) — not an Element.
  // Use the actual card element clicked instead.
  const card  = event.target.closest('.course-card') ?? event.target;
  const rect  = card.getBoundingClientRect();
  let top     = rect.bottom + 3;
  let left    = rect.left;
  if (top  + 260 > window.innerHeight) top  = rect.top - 260;
  if (left + 228 > window.innerWidth)  left = window.innerWidth - 234;
  menu.style.top  = Math.max(3, top)  + 'px';
  menu.style.left = Math.max(3, left) + 'px';
}
