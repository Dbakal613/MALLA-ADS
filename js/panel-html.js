/**
 * Builds the side panel and summary bar HTML strings.
 * Pure functions — no DOM access, no side effects.
 */

import { COURSES, TOTAL_CREDITS, PRACTICUM_ID } from './data.js';
import { getCourseById, getSemesterParity, getEffectiveSemester, getBlocked } from './planner.js';
import { getFailed, getNotTaken } from './state.js';
import { getUserName } from './onboarding.js';
import { getContextualAcademicMessage } from './contextual-message.js';

const semesterLabel = (s) => getSemesterParity(s) === 'first' ? 'Mar–Jul' : 'Ago–Dic';


const ROUTE_MILESTONES = [
  { max: 25,  icon: '🌱', text: 'Construir una buena base para los próximos semestres.' },
  { max: 50,  icon: '📚', text: 'Consolidar los ramos centrales de la carrera.' },
  { max: 75,  icon: '🎯', text: 'Avanzar hacia los cursos más específicos.' },
  { max: 99,  icon: '🏁', text: 'Prepararte para el tramo final.' },
  { max: 100, icon: '🎓', text: '¡Ruta completada!' },
];

function getMotivation(pct) {
  if (pct >= 100) return 'Felicitaciones, completaste la ruta.';
  if (pct >= 76)  return 'Estás cada vez más cerca del final.';
  if (pct >= 26)  return 'Ya tienes una parte importante del camino avanzado.';
  return 'Lo importante es ordenar bien el punto de partida.';
}

function estimateGraduationDate(maxPlanSem, currentSem) {
  const semsFromNow = maxPlanSem - currentSem;
  if (semsFromNow <= 0) return null;
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  let ord  = (month >= 3 && month <= 7) ? 0 : 1;
  ord     += semsFromNow;
  const gradYear = year + Math.floor(ord / 2);
  const gradSem  = ord % 2;
  return `${gradSem === 0 ? 'Mar–Jul' : 'Ago–Dic'} ${gradYear}`;
}

/**
 * @param {object} ctx
 * @param {Set}    ctx.approved
 * @param {Set}    ctx.studying
 * @param {Set}    ctx.failed
 * @param {Set}    ctx.notTaken
 * @param {Set}    ctx.blocked
 * @param {Set}    ctx.recommended
 * @param {object} ctx.plan
 * @param {Set}    ctx.postponed
 * @param {number|null} ctx.currentSem
 * @param {string} ctx.strategy
 * @returns {string}
 */
export function buildPanelHTML({ approved, studying, failed, notTaken, blocked, recommended, plan, postponed, currentSem, strategy }) {
  const name   = getUserName();
  const ctxMsg = getContextualAcademicMessage({ name, preferredPace: strategy, approved, failed, notTaken, plan, currentSem });

  if (!currentSem) return buildProgressSection(name, approved, studying) + buildContextualMessageCard(ctxMsg);

  const nextSem        = currentSem + 1;
  const recommendedArr = COURSES.filter(c => recommended.has(c.id));
  const blockedArr     = COURSES.filter(c => blocked.has(c.id) && !approved.has(c.id));
  const postponedArr   = COURSES.filter(c => postponed.has(c.id));
  const recommendedSCT = recommendedArr.reduce((sum, c) => sum + c.credits, 0);

  return [
    buildProgressSection(name, approved, studying),
    buildContextualMessageCard(ctxMsg),
    buildNextStepSection(recommendedArr, recommendedSCT, nextSem, strategy, approved, blocked),
    buildStrategySection(strategy),
    postponedArr.length ? buildPostponedSection(postponedArr) : '',
    buildProjectionSection(plan, nextSem),
    blockedArr.length   ? buildBlockedSection(blockedArr) : '',
    buildPanelFooter(name),
  ].join('');
}


function buildProgressSection(name, approved, studying) {
  const total         = COURSES.length;
  const approvedCount = approved.size;
  const studyingCount = studying ? studying.size : 0;
  const pendingCount  = Math.max(0, total - approvedCount - studyingCount);
  const approvedSCT   = COURSES.filter(c => approved.has(c.id)).reduce((sum, c) => sum + c.credits, 0);
  const pct           = Math.round(approvedSCT / TOTAL_CREDITS * 100);

  const intro     = name
    ? `<strong>${name}</strong>, este es tu avance hasta ahora.`
    : 'Este es tu avance hasta ahora.';
  const milestone  = ROUTE_MILESTONES.find(m => pct <= m.max) ?? ROUTE_MILESTONES.at(-1);
  const motivation = getMotivation(pct);

  const studyingMetric = studyingCount > 0 ? `
      <div class="route-metric">
        <div class="route-metric-value" style="color:var(--blue)">${studyingCount}</div>
        <div class="route-metric-label">En curso</div>
      </div>` : '';

  return `
    <div class="route-card">
      <p class="route-intro">${intro}</p>
      <div class="route-pct-row">
        <span class="route-pct-value">${pct}%</span>
        <span class="route-pct-label">completado</span>
      </div>
      <div class="route-progress-bar">
        <div class="route-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="route-metrics">
        <div class="route-metric">
          <div class="route-metric-value" style="color:var(--green)">${approvedCount}</div>
          <div class="route-metric-label">Aprobados</div>
        </div>
        <div class="route-metric">
          <div class="route-metric-value">${pendingCount}</div>
          <div class="route-metric-label">Pendientes</div>
        </div>
        ${studyingMetric}
      </div>
      <div class="route-milestone">
        <span>${milestone.icon}</span>
        <span><strong>Próximo hito:</strong> ${milestone.text}</span>
      </div>
      <p class="route-motivation">${motivation}</p>
    </div>`;
}

function buildContextualMessageCard(msg) {
  if (!msg) return '';
  return `
    <div class="contextual-msg contextual-msg--${msg.type}">
      <div class="contextual-msg-title">${msg.title}</div>
      <p class="contextual-msg-text">${msg.message}</p>
    </div>`;
}

function buildStrategySection(currentStrategy) {
  const options = [
    { key: 'rapida',      label: '🚀 Rápida',      sub: 'Hasta 33 SCT' },
    { key: 'equilibrada', label: '⚖️ Equilibrada', sub: 'Hasta 28 SCT' },
    { key: 'tranquila',   label: '🌿 Tranquila',   sub: 'Hasta 26 SCT' },
  ];
  const buttons = options.map(o => `
    <button class="strategy-option${o.key === currentStrategy ? ' strategy-option--selected' : ''}"
            data-action="set-strategy"
            data-strategy="${o.key}">
      ${o.label}<br>
      <span style="font-weight:400;font-size:8px">${o.sub}</span>
    </button>`).join('');

  return `
    <div>
      <div class="section-title">Ritmo de avance</div>
      <div class="strategy-row">${buttons}</div>
    </div>`;
}

function courseWhyHint(course, approved) {
  const pendingUnlocks = COURSES.filter(c =>
    c.prerequisites.includes(course.id) && !approved.has(c.id)
  ).length;
  if (pendingUnlocks >= 4) return `🔓 Desbloquea ${pendingUnlocks} ramos del tramo siguiente`;
  if (pendingUnlocks >= 2) return `🔓 Desbloquea ${pendingUnlocks} ramos más adelante`;
  if (pendingUnlocks === 1) return '🔓 Desbloquea 1 ramo más adelante';
  if (course.prerequisites.length === 0) return '✓ Sin prerrequisitos — disponible desde el inicio';
  return '✓ Cumple todos los prerrequisitos';
}

function loadInfo(sct, strategy) {
  const caps = { rapida: 33, equilibrada: 28, tranquila: 26 };
  const cap  = caps[strategy] ?? 28;
  const r    = sct / cap;
  if (r <= 0.55) return { key: 'liviana',    label: 'Carga liviana' };
  if (r <= 0.82) return { key: 'liviana',    label: 'Carga moderada' };
  if (r <= 1.0)  return { key: 'equilibrada', label: 'Carga equilibrada' };
  if (r <= 1.15) return { key: 'alta',       label: 'Carga alta' };
  return              { key: 'muy-alta',   label: 'Carga muy alta' };
}

function semesterAdvice(strategy, sct, blockedCount) {
  const caps = { rapida: 33, equilibrada: 28, tranquila: 26 };
  const cap  = caps[strategy] ?? 28;
  const over  = sct > cap;
  const under = sct < cap * 0.6;
  const bloqNote = blockedCount > 0
    ? ` Además, ${blockedCount} ramo${blockedCount !== 1 ? 's' : ''} bloqueado${blockedCount !== 1 ? 's' : ''} depende${blockedCount === 1 ? '' : 'n'} de lo que apruebes este semestre.`
    : '';

  if (strategy === 'rapida') {
    if (over)  return `Esta carga supera el máximo sugerido para una ruta rápida. Revisa si puedes sostenerla sin afectar tus resultados.${bloqNote}`;
    if (under) return `Hay margen para agregar más ramos si quieres aprovechar el semestre al máximo.${bloqNote}`;
    return `Buena selección para ir al ritmo máximo. Mantén los prerrequisitos al día — una cadena rota puede costar semestres.${bloqNote}`;
  }
  if (strategy === 'tranquila') {
    if (over)  return `Con una ruta tranquila, esta carga puede sentirse pesada. Considera posponer algún ramo para avanzar sin agotarte.${bloqNote}`;
    if (under) return `Carga cómoda para tu ritmo. Tómate el tiempo necesario en cada ramo y avanza con calma.${bloqNote}`;
    return `Carga bien ajustada para una ruta tranquila. Calidad sobre cantidad — llegarás igual de lejos.${bloqNote}`;
  }
  if (over)  return `Esta carga supera lo recomendado para una ruta equilibrada. Considera posponer algún ramo.${bloqNote}`;
  if (under) return `Carga liviana para este semestre. Si tienes disponibilidad, podrías agregar otro ramo.${bloqNote}`;
  return `Para una ruta equilibrada, esta carga parece razonable. Buen ritmo para avanzar sin agotarte.${bloqNote}`;
}

function buildNextStepSection(recommendedArr, recommendedSCT, nextSem, strategy, approved, blocked) {
  const label = semesterLabel(nextSem);
  const caps  = { rapida: 33, equilibrada: 28, tranquila: 26 };
  const cap   = caps[strategy] ?? 28;

  if (recommendedArr.length === 0) {
    return `
      <div class="next-step-card">
        <div class="next-step-header">
          <div class="next-step-title">Tu próximo paso</div>
          <div class="next-step-subtitle">No hay ramos disponibles para el próximo semestre con tu configuración actual.</div>
        </div>
      </div>`;
  }

  const load         = loadInfo(recommendedSCT, strategy);
  const barPct       = Math.min(100, Math.round(recommendedSCT / cap * 100));
  const blockedCount = blocked ? blocked.size : 0;
  const advice       = semesterAdvice(strategy, recommendedSCT, blockedCount);
  const paceLabels   = { rapida: 'rápida', equilibrada: 'equilibrada', tranquila: 'tranquila' };

  const anyUnlocks = recommendedArr.some(c =>
    COURSES.some(other => other.prerequisites.includes(c.id) && !approved.has(other.id))
  );

  const whyItems = [
    '✓ Cumplen todos los prerrequisitos del semestre',
    anyUnlocks ? '🔓 Ayudan a desbloquear los próximos cursos de la carrera' : null,
    recommendedSCT <= cap
      ? '⚖️ Mantienen una carga razonable para tu ritmo de avance'
      : '⚠️ La carga total supera el máximo sugerido para tu ritmo',
    `🎯 Se alinean con tu ruta ${paceLabels[strategy] ?? 'equilibrada'}`,
  ].filter(Boolean);

  const recCards = recommendedArr.map(c => {
    const why = courseWhyHint(c, approved);
    return `
      <div class="ns-rec-card">
        <div class="ns-rec-top">
          <div class="ns-rec-name">${c.name}</div>
          <button class="ns-postpone-btn" data-action="postpone" data-course-id="${c.id}" title="Dejar para después">⏸</button>
        </div>
        <div class="ns-rec-meta">${c.credits} SCT · ${c.area}</div>
        <div class="ns-rec-why">${why}</div>
      </div>`;
  }).join('');

  return `
    <div class="next-step-card">
      <div class="next-step-header">
        <div class="next-step-title">Tu próximo paso</div>
        <div class="next-step-subtitle">Estos ramos parecen una buena opción para seguir avanzando.</div>
        <div class="next-step-sem-label">Semestre ${nextSem} · ${label}</div>
      </div>
      <div class="next-step-body">

        <div>
          <div class="ns-section-label">Lo más recomendable ahora</div>
          ${recCards}
        </div>

        <div>
          <div class="ns-section-label">Por qué estos ramos</div>
          <div class="ns-why-box">
            <ul class="ns-why-list">
              ${whyItems.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div>
          <div class="ns-section-label">Carga estimada</div>
          <div class="ns-load-row">
            <span class="ns-load-sct">${recommendedSCT} SCT</span>
            <span class="ns-load-badge ns-load-badge--${load.key}">${load.label}</span>
          </div>
          <div class="ns-load-bar">
            <div class="ns-load-bar-fill ns-load-bar-fill--${load.key}" style="width:${barPct}%"></div>
          </div>
          <div class="ns-load-cap-label">Máximo sugerido: ${cap} SCT</div>
        </div>

        <div>
          <div class="ns-section-label">Consejo para este semestre</div>
          <div class="ns-advice-box">
            <p class="ns-advice-text">${advice}</p>
          </div>
        </div>

      </div>
    </div>`;
}

function buildPostponedSection(postponedArr) {
  const items = postponedArr.map(c => `
    <div class="postponed-item">
      <div class="postponed-name">${c.name}</div>
      <div class="postponed-meta">${c.credits} SCT · ${c.area} · Se puede tomar sem. ${getEffectiveSemester(c.id)}</div>
      <div class="postponed-actions">
        <button class="resume-btn" data-action="resume" data-course-id="${c.id}">↩ Incluir en plan</button>
      </div>
    </div>`).join('');

  return `
    <div>
      <div class="section-title">Pospuestos <span class="count">${postponedArr.length}</span></div>
      <div class="rec-list">${items}</div>
    </div>`;
}

function buildProjectionSection(plan, nextSem) {
  const allPlanSems = Object.keys(plan).map(Number).sort((a, b) => a - b);
  const futureSems  = allPlanSems.filter(s => s > nextSem);
  if (!allPlanSems.length) return '';

  const currentSem    = nextSem - 1;
  const maxPlanSem    = Math.max(...allPlanSems);
  const semsRemaining = maxPlanSem - currentSem;
  const gradDate      = estimateGraduationDate(maxPlanSem, currentSem);

  const gradBadge = gradDate ? `
    <div style="margin-bottom:8px;padding:8px 10px;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:10px;color:var(--blue);font-weight:600">🎓 Titulación estimada</span>
      <span style="font-size:12px;font-weight:700;color:var(--blue)">${gradDate}</span>
    </div>
    <div style="margin-bottom:8px;font-size:10px;color:var(--text-2);text-align:right">
      ${semsRemaining} semestre${semsRemaining !== 1 ? 's' : ''} restante${semsRemaining !== 1 ? 's' : ''}
    </div>` : '';

  if (!futureSems.length) {
    return `<div>${gradBadge}</div>`;
  }

  const items = futureSems.slice(0, 4).map(s => {
    const ids       = plan[s] ?? [];
    const semCredits = ids.reduce((sum, id) => sum + (getCourseById(id)?.credits ?? 0), 0);
    const courses   = ids.map(id => {
      const c = getCourseById(id);
      if (!c) return '';
      return `<div class="projection-course">${c.name}<span class="projection-course-credits">${c.credits}</span></div>`;
    }).join('');

    return `
      <div class="projection-item">
        <div class="projection-semester">Semestre ${s} · ${semesterLabel(s)} · ${semCredits} SCT</div>
        ${courses}
      </div>`;
  }).join('');

  const hiddenCount = futureSems.length > 4 ? futureSems.length - 4 : 0;
  const moreHint = hiddenCount > 0
    ? `<div class="empty-message" style="margin-bottom:6px">+${hiddenCount} semestre${hiddenCount > 1 ? 's' : ''} más en la descarga completa</div>`
    : '';

  return `
    <div>
      <div class="section-title">Proyección futura</div>
      ${gradBadge}
      ${items}
      ${moreHint}
    </div>`;
}

function buildBlockedSection(blockedArr) {
  const items = blockedArr.slice(0, 6).map(c => {
    const bad       = new Set([...getFailed(), ...getNotTaken()]);
    const culprits  = [];
    const findCulprits = (id) => {
      if (bad.has(id)) { culprits.push(id); return; }
      getCourseById(id)?.prerequisites.forEach(p => findCulprits(p));
    };
    c.prerequisites.forEach(p => findCulprits(p));
    const unique = [...new Set(culprits)];

    return `
      <div class="blocked-item">
        <div class="blocked-name">${c.name}</div>
        <div class="blocked-reason">
          Falta aprobar: <strong>${unique.map(id => getCourseById(id)?.name ?? id).join(', ')}</strong>
        </div>
      </div>`;
  }).join('');

  const overflow = blockedArr.length > 6
    ? `<div class="empty-message">+${blockedArr.length - 6} más bloqueados</div>`
    : '';

  return `
    <div>
      <div class="section-title" style="color:var(--red)">
        Bloqueados por atrasos <span class="count">${blockedArr.length}</span>
      </div>
      <div class="bl-list">${items}${overflow}</div>
    </div>`;
}

function buildPanelFooter(name) {
  return `
    <div style="text-align:center;padding-top:4px;border-top:1px solid var(--border)">
      <button style="font-size:9px;color:var(--text-3);background:none;border:none;cursor:pointer;font-family:inherit;padding:6px;transition:color .1s" data-action="change-name"
              onmouseover="this.style.color='var(--text-2)'" onmouseout="this.style.color='var(--text-3)'">
        ✏ Cambiar nombre${name ? ` (${name})` : ''}
      </button>
    </div>`;
}

/**
 * @returns {string}
 */
export function buildSumbarHTML({ approved, studying, failed, notTaken, blocked, recommended, plan = {}, currentSem = null }) {
  const approvedSCT    = COURSES.filter(c => approved.has(c.id)).reduce((sum, c) => sum + c.credits, 0);
  const studyingSCT    = studying ? COURSES.filter(c => studying.has(c.id)).reduce((sum, c) => sum + c.credits, 0) : 0;
  const accumulatedSCT = approvedSCT + studyingSCT;
  const pct            = Math.round(approvedSCT / TOTAL_CREDITS * 100);
  const recommendedSCT = COURSES.filter(c => recommended.has(c.id)).reduce((sum, c) => sum + c.credits, 0);
  const delayed        = failed.size + notTaken.size;

  const planSems       = Object.keys(plan).map(Number);
  const maxPlanSem     = planSems.length ? Math.max(...planSems) : null;
  const semsLeft       = (maxPlanSem && currentSem) ? maxPlanSem - currentSem : null;
  const gradDate       = (maxPlanSem && currentSem) ? estimateGraduationDate(maxPlanSem, currentSem) : null;

  return `
    <div>
      <div style="font-size:9px;color:var(--text-2)">SCT acumulados</div>
      <div class="sumbar-value" style="color:var(--blue)">${accumulatedSCT}${studyingSCT > 0 ? ` (${approvedSCT} apr. + ${studyingSCT} curs.)` : ' SCT'}</div>
    </div>
    <div>
      <div style="font-size:9px;color:var(--text-2)">Atrasados</div>
      <div class="sumbar-value" style="${delayed > 0 ? 'color:var(--red)' : ''}">${failed.size} reprobados · ${notTaken.size} no tomados</div>
    </div>
    <div>
      <div style="font-size:9px;color:var(--text-2)">Bloqueados</div>
      <div class="sumbar-value">${blocked.size}</div>
    </div>
    <div>
      <div style="font-size:9px;color:var(--text-2)">Recomendados</div>
      <div class="sumbar-value" style="color:var(--amber)">${recommended.size} ramos · ${recommendedSCT} SCT</div>
    </div>
    <div class="sumbar-bar"><div class="sumbar-bar-fill" style="width:${pct}%"></div></div>
    <div>
      <div style="font-size:9px;color:var(--text-2)">Avance</div>
      <div class="sumbar-value">${pct}%</div>
    </div>
    ${semsLeft !== null ? `
    <div>
      <div style="font-size:9px;color:var(--text-2)">Semestres restantes</div>
      <div class="sumbar-value" style="color:var(--blue)">${semsLeft}</div>
    </div>` : ''}
    ${gradDate ? `
    <div>
      <div style="font-size:9px;color:var(--text-2)">Titulación estimada</div>
      <div class="sumbar-value" style="color:var(--blue);font-size:12px">🎓 ${gradDate}</div>
    </div>` : ''}`;
}
