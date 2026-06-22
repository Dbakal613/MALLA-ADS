/**
 * Builds the semester grid HTML string.
 * Pure function — no side effects, no DOM access.
 * All interactivity uses data attributes picked up by event delegation in app.js.
 */

import { COURSES, MAX_CREDITS_PER_SEMESTER, SEMESTER_YEARS, PRACTICUM_ID } from './data.js';
import { getCourseById, getSemesterParity, getEffectiveSemester } from './planner.js';

const semesterLabel = (semNumber) =>
  getSemesterParity(semNumber) === 'first' ? 'Mar–Jul' : 'Ago–Dic';

/** Returns the CSS fill class for the credit track bar. */
const creditsFillClass = (credits, cap = MAX_CREDITS_PER_SEMESTER) => {
  if (credits > cap) return 'credits-fill--over';
  if (credits > 26)  return 'credits-fill--warn';
  return 'credits-fill--ok';
};

/** Determine CSS class(es) for a course card given its state. */
function courseCardClass(course, status, isBlocked, isPlannedBlocked, isRecommended, isPostponed) {
  if (course.isPracticum)       return 'course-card course-card--practicum';
  if (status === 'convalidado') return 'course-card course-card--convalidado';
  if (status === 'aprobado' || status === 'adelantado' || status === 'eximido')
                                return 'course-card course-card--approved';
  if (status === 'cursando')    return 'course-card course-card--studying';
  if (status === 'reprobado')   return 'course-card course-card--failed';
  if (status === 'no-tomado')   return 'course-card course-card--not-taken';
  if (isBlocked && !isPlannedBlocked) return 'course-card course-card--blocked';
  if (isPlannedBlocked)         return 'course-card course-card--blocked';
  if (isPostponed)              return 'course-card course-card--postponed';
  if (isRecommended)            return 'course-card course-card--recommended';
  return 'course-card';
}

/** Status dot class for the corner indicator. */
function statusDotClass(status, isRecommended) {
  if (status === 'convalidado') return 'status-dot' ;
  if (['aprobado', 'adelantado', 'eximido'].includes(status)) return 'status-dot status-dot--approved';
  if (status === 'reprobado')   return 'status-dot status-dot--failed';
  if (status === 'no-tomado')   return 'status-dot status-dot--not-taken';
  if (status === 'cursando' || isRecommended) return 'status-dot status-dot--recommended';
  return '';
}

function buildStatusChips(status, isBlocked, isPlannedBlocked, isRecommended, isPostponed) {
  const chips = [];
  if (isRecommended)   chips.push(`<span class="course-chip course-chip--recommended">✦ rec.</span>`);
  if (isBlocked && !isPlannedBlocked) chips.push(`<span class="course-chip course-chip--blocked">bloqueado</span>`);
  if (isPlannedBlocked) chips.push(`
    <span class="course-chip course-chip--blocked">bloqueado</span>
    <span class="course-chip" style="background:#F0FDF4;color:#166534;border:1px solid #86EFAC;margin-left:2px">✓ programado</span>`);
  if (isPostponed)     chips.push(`<span class="course-chip course-chip--postponed">pospuesto</span>`);
  if (status === 'aprobado')   chips.push(`<span class="course-chip course-chip--approved">✓ aprobado</span>`);
  if (status === 'adelantado')   chips.push(`<span class="course-chip" style="background:#EEF2FF;color:#4338CA;border:1px solid #A5B4FC">⚡ adelantado</span>`);
  if (status === 'eximido')      chips.push(`<span class="course-chip" style="background:#F0FDF4;color:#166534;border:1px solid #86EFAC">⊘ eximido</span>`);
  if (status === 'convalidado')  chips.push(`<span class="course-chip" style="background:#ECFEFF;color:#0891B2;border:1px solid #67E8F9">⇌ convalidado</span>`);
  if (status === 'cursando')   chips.push(`<span class="course-chip" style="background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-border)">📖 cursando</span>`);
  if (status === 'reprobado')  chips.push(`<span class="course-chip course-chip--failed">✗ reprobado</span>`);
  if (status === 'no-tomado')  chips.push(`<span class="course-chip course-chip--not-taken">no tomado</span>`);
  return chips.join('');
}

function buildCourseCard({ course, status, isBlocked, isPlannedBlocked, isRecommended, isPostponed, approved }) {
  const cardClass = courseCardClass(course, status, isBlocked, isPlannedBlocked, isRecommended, isPostponed);
  const dotClass  = statusDotClass(status, isRecommended);
  const chips     = buildStatusChips(status, isBlocked, isPlannedBlocked, isRecommended, isPostponed);

  const isDraggable = !course.isPracticum && (!isBlocked || isPlannedBlocked);
  const planStyle   = isPlannedBlocked ? 'border-style:dashed;border-color:#86EFAC;background:#F0FDF4;' : '';

  return `
    <div class="${cardClass}"
         id="c-${course.id}"
         style="${planStyle}"
         ${isDraggable ? 'draggable="true"' : ''}
         data-course-id="${course.id}"
         data-action="open-context-menu">
      ${dotClass ? `<div class="${dotClass}"></div>` : ''}
      <div class="course-name">${course.name}</div>
      <div class="course-meta">
        <span class="course-credits">${course.credits} SCT</span>
        ${chips}
      </div>
    </div>`;
}

function buildProjectedCard({ course, status, semNumber }) {
  const isRepeatOrMissed = status === 'reprobado' || status === 'no-tomado';

  const chipLabel = isRepeatOrMissed
    ? (status === 'no-tomado' ? '↩ retomar' : '↩ recursar')
    : 'proyectado';

  const chipStyle = isRepeatOrMissed
    ? `background:${status === 'no-tomado' ? 'var(--orange-bg)' : 'var(--red-bg)'};color:${status === 'no-tomado' ? 'var(--orange)' : 'var(--red)'};border:1px solid ${status === 'no-tomado' ? 'var(--orange-border)' : 'var(--red-border)'}`
    : 'background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-border)';

  const cardStyle = isRepeatOrMissed
    ? `border-style:dashed;border-color:${status === 'no-tomado' ? 'var(--orange-border)' : 'var(--red-border)'};background:${status === 'no-tomado' ? 'var(--orange-bg)' : '#FFF5F5'}`
    : 'border-style:dashed;border-color:var(--blue-border);background:var(--blue-bg)';

  const nameColor = isRepeatOrMissed
    ? (status === 'no-tomado' ? 'var(--orange)' : 'var(--red)')
    : 'var(--blue)';

  return `
    <div class="course-card course-card--projected"
         style="${cardStyle};opacity:.82"
         draggable="true"
         data-course-id="${course.id}"
         data-projected-from-sem="${semNumber}"
         data-action="open-context-menu">
      <div class="course-name" style="color:${nameColor}">${course.name}</div>
      <div class="course-meta">
        <span class="course-credits">${course.credits} SCT</span>
        <span class="course-chip" style="${chipStyle}">${chipLabel}</span>
      </div>
    </div>`;
}

/**
 * @param {object} ctx
 * @param {Set}    ctx.approved
 * @param {Set}    ctx.failed
 * @param {Set}    ctx.notTaken
 * @param {Set}    ctx.blocked
 * @param {Set}    ctx.recommended
 * @param {object} ctx.plan         — { semNumber: courseId[] }
 * @param {number|null} ctx.currentSem
 * @param {Set}    ctx.postponed
 * @param {function} ctx.getCourseStatus
 * @param {object} ctx.semMap       — pre-computed by app.js via buildSemMap()
 * @returns {string} HTML string
 */
export function buildGridHTML({ approved, failed, notTaken, blocked, recommended, plan, currentSem, postponed, getCourseStatus, semMap, overrides = {}, semExtensions = new Set() }) {
  const nextSem = currentSem ? currentSem + 1 : null;

  // semMap is passed in from app.js (built via planner.buildSemMap) so there is
  // no need to recompute it here or write it to window.

  // Filter plan to future semesters only; skip already-approved courses.
  const planMap = {};
  if (nextSem && plan) {
    Object.entries(plan).forEach(([key, ids]) => {
      const s = Number(key);
      if (s <= currentSem) return;
      ids.forEach(id => {
        const c = getCourseById(id);
        if (!c || approved.has(id) || getCourseStatus(id) === 'cursando') return;
        planMap[s] = planMap[s] ?? [];
        if (!planMap[s].includes(id)) planMap[s].push(id);
      });
    });
  }

  // True when the user has run the projection (at least one future semester is planned).
  const hasAnyPlan = Object.keys(planMap).length > 0;

  const maxSem = Math.max(9,
    ...Object.keys(semMap).map(Number).filter(s => semMap[s].length > 0),
    ...Object.keys(planMap).map(Number)
  );

  let html = '';

  for (let s = 1; s <= maxSem; s++) {
    const ids   = semMap[s] ?? [];
    const pIds  = planMap[s] ?? [];
    if (!ids.length && !pIds.length) continue;

    const isCurrent  = s === currentSem;
    const isNext     = s === nextSem;
    const isPast     = currentSem && s < currentSem;
    const isFuture   = currentSem && s > currentSem;
    const isPracticum = ids.includes(PRACTICUM_ID) || pIds.includes(PRACTICUM_ID);
    const hasProjection = isFuture && pIds.length > 0;

    // Compute credits for the SCT track bar.
    const nativeCredits = ids.reduce((sum, id) => {
      // Skip native courses not in the plan, unless the user manually placed them here.
      if (isFuture && pIds.length > 0 && !pIds.includes(id) && !overrides[id]) return sum;
      const c = getCourseById(id);
      if (!c) return sum;
      const st = getCourseStatus(id);
      if (c.isPracticum) return ['aprobado','adelantado','eximido'].includes(st) ? sum : sum + c.credits;
      if (['reprobado','no-tomado','adelantado','eximido','convalidado'].includes(st)) return sum;
      // Blocked-pending courses that aren't in the plan cannot be taken — skip them.
      // Planned-blocked courses (pIds.includes) still count since they're scheduled.
      // Blocked-pending not in plan and not manually overridden here — skip.
      if (blocked.has(id) && st === 'pendiente' && !pIds.includes(id) && !overrides[id]) return sum;
      return sum + c.credits;
    }, 0);

    const projectedCredits = isFuture ? pIds.reduce((sum, id) => {
      const c = getCourseById(id);
      if (!c || (!c.isPracticum && approved.has(id)) || ids.includes(id)) return sum;
      return sum + c.credits;
    }, 0) : 0;

    const totalCredits  = nativeCredits + projectedCredits;
    const effectiveCap  = MAX_CREDITS_PER_SEMESTER + (semExtensions.has(s) ? 1 : 0);
    const pct           = Math.min(110, Math.round(totalCredits / effectiveCap * 100));
    const fillClass     = creditsFillClass(totalCredits, effectiveCap);

    // Column modifier classes.
    let colClasses = 'sem-col';
    if (isCurrent)                            colClasses += ' sem-col--current';
    else if (isNext)                          colClasses += ' sem-col--next';
    else if (isPast)                          colClasses += ' sem-col--past';
    if (hasProjection && !isCurrent && !isNext) colClasses += ' sem-col--projected';

    const semBadge = isCurrent ? '<span class="sem-badge sem-badge--current">ACTUAL</span>'
      : isNext      ? '<span class="sem-badge sem-badge--next">PRÓXIMO</span>'
      : isPracticum && !isCurrent && !isNext ? '<span class="sem-badge sem-badge--prac">PRÁCTICA</span>'
      : hasProjection ? '<span class="sem-badge" style="background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-border)">plan</span>'
      : '';

    const creditLabel = totalCredits > effectiveCap
      ? `<div class="credits-label" style="color:var(--red);font-weight:700">${totalCredits}/${effectiveCap} SCT${hasProjection ? ' · plan' : ''}</div>`
      : `<div class="credits-label">${totalCredits}/${effectiveCap} SCT${hasProjection ? ' · plan' : ''}</div>`;

    html += `
      <div class="${colClasses}" id="sem-${s}" data-sem="${s}">
        <div class="sem-header">
          <div class="sem-header-top">
            <span class="sem-number">Semestre ${s}</span>
            ${semBadge}
          </div>
          <div class="sem-subtitle">${SEMESTER_YEARS[s - 1] ?? ''} · ${semesterLabel(s)}</div>
          <div class="credits-track">
            <div class="credits-fill ${fillClass}" style="width:${Math.min(100, pct)}%"></div>
          </div>
          ${creditLabel}
          ${!isPracticum ? `<button class="mark-semester-btn" data-action="mark-semester" data-sem="${s}">✓ Aprobar sem.</button>` : ''}
          ${(isCurrent || !currentSem) && !isPracticum ? `<button class="mark-semester-btn" style="margin-top:3px;background:var(--blue-bg);color:var(--blue);border-color:var(--blue-border)" data-action="mark-semester-studying" data-sem="${s}">📖 Cursando ahora</button>` : ''}
          ${currentSem && !isPast && !isPracticum ? `<button class="mark-semester-btn" style="margin-top:3px;${semExtensions.has(s) ? 'background:#F0FDF4;color:#166534;border-color:#86EFAC' : 'background:var(--surface-2);color:var(--text-2)'}" data-action="extend-semester" data-sem="${s}">${semExtensions.has(s) ? '34 SCT ✓' : '+1 SCT'}</button>` : ''}
        </div>
        <div class="drop-zone" id="drop-${s}">`;

    // Render courses for this semester.
    ids.forEach(id => {
      const course          = getCourseById(id);
      if (!course) return;
      const status          = getCourseStatus(id);
      const isBlocked       = blocked.has(id) && status === 'pendiente';
      const isPlannedBlocked = isFuture && isBlocked && pIds.includes(id);
      const isRecommended   = recommended.has(id) && status === 'pendiente' && !isBlocked && !postponed.has(id);
      const isPostponed     = postponed.has(id) && status === 'pendiente';

      // When the projection is active, blocked courses are hidden from the current
      // semester — they will appear as "proyectado" in their assigned future semester.
      if (isCurrent && isBlocked && hasAnyPlan) return;

      if (isFuture && pIds.length > 0) {
        // Future semester with a plan: hide native courses the plan moved elsewhere.
        if (!pIds.includes(id) && !overrides[id]) return;
        // Plan courses (blocked or not) → always show as projected (blue dashed).
        // A blocked course is assumed to be unblocked by the time its semester arrives.
        if ((pIds.includes(id) || overrides[id]) && !isPostponed) {
          html += buildProjectedCard({ course, status, semNumber: s });
          return;
        }
      }

      html += buildCourseCard({ course, status, isBlocked, isPlannedBlocked, isRecommended, isPostponed, approved });
    });

    // Non-native plan courses (plan put them here, default semester is elsewhere).
    if (isFuture && pIds.length) {
      const nonNative = pIds.filter(id => !ids.includes(id));
      if (nonNative.length) {
        if (ids.length) html += `<div class="drop-zone-divider"></div>`;
        nonNative.forEach(id => {
          const course = getCourseById(id);
          if (!course) return;
          const status = getCourseStatus(id);
          html += buildProjectedCard({ course, status, semNumber: s });
        });
      }
    }

    html += `</div></div>`;
  }

  return html;
}
