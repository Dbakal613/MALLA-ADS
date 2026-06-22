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

  let meta = `${course.credits} SCT · Sem ${getEffectiveSemester(courseId)} · ${course.area}`;
  if (prereqNames.length) meta += `<br>Requiere: ${prereqNames.join(', ')}`;
  if (unlocks.length) {
    const shown = unlocks.slice(0, 3).join(', ');
    const extra = unlocks.length > 3 ? ` +${unlocks.length - 3} más` : '';
    meta += `<br><span style="color:var(--green)">🔓 Habilita: ${shown}${extra}</span>`;
  }
  if (isBlocked) meta += `<br><span style="color:var(--red)">⏳ Necesitas aprobar los prerrequisitos primero</span>`;

  const isApproved = ['aprobado', 'adelantado', 'eximido', 'convalidado'].includes(status);

  const items = [
    !isApproved
      ? menuButton('set-status', courseId, 'aprobado', 'menu-item--approved', '✓ Marcar como aprobado')
      : '',
    status !== 'cursando' && !course.isPracticum
      ? menuButton('set-status', courseId, 'cursando', '', '📖 Cursando ahora', 'color:var(--blue);font-weight:500')
      : '',
    status !== 'adelantado' && !course.isPracticum
      ? menuButton('set-status', courseId, 'adelantado', '', '⚡ Aprobado por adelantado', 'color:#4338CA')
      : '',
    EXEMPTABLE_COURSE_IDS.has(courseId) && status !== 'eximido'
      ? menuButton('set-status', courseId, 'eximido', '', '⊘ Marcar como eximido', 'color:#166534')
      : '',
    status !== 'convalidado' && !course.isPracticum
      ? menuButton('set-status', courseId, 'convalidado', '', '⇌ Convalidado de otra carrera', 'color:#0891B2')
      : '',
    status !== 'reprobado' && !isBlocked && !course.isPracticum
      ? menuButton('set-status', courseId, 'reprobado', 'menu-item--failed', '✗ Reprobado')
      : '',
    status !== 'no-tomado' && !isBlocked && !course.isPracticum
      ? menuButton('set-status', courseId, 'no-tomado', 'menu-item--not-taken', '⏭ No tomado (atrasado)')
      : '',
    status !== 'pendiente'
      ? menuButton('set-status', courseId, 'pendiente', 'menu-item--muted', '↩ Restablecer a pendiente')
      : '',
    status === 'pendiente' && !isBlocked && !course.isPracticum && !postponed
      ? menuButton('postpone', courseId, '', 'menu-item--muted', '⏸ Posponer este semestre')
      : '',
    postponed
      ? menuButton('resume', courseId, '', 'menu-item--muted', '▶ Retomar en el plan')
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
