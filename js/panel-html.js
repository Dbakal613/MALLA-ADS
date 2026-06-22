/**
 * Builds the side panel and summary bar HTML strings.
 * Pure functions — no DOM access, no side effects.
 */

import { COURSES, TOTAL_CREDITS, PRACTICUM_ID } from './data.js';
import { getCourseById, getSemesterParity, getEffectiveSemester, getBlocked } from './planner.js';
import { getFailed, getNotTaken } from './state.js';
import { getUserName } from './onboarding.js';

const semesterLabel = (s) => getSemesterParity(s) === 'first' ? 'Mar–Jul' : 'Ago–Dic';

const PACE_CTX = {
  rapida:      {
    emoji: '🚀', label: 'Rápida',
    next_msg: 'Al ritmo máximo, aquí están todos los ramos disponibles para el próximo semestre.',
    advice: 'Aprovecha cada semestre al tope. Mantén los prerrequisitos al día para no bloquear ramos clave — una cadena rota puede retrasar mucho.',
  },
  equilibrada: {
    emoji: '⚖️', label: 'Equilibrada',
    next_msg: 'Selección balanceada para el próximo semestre. Buena carga sin saturarte.',
    advice: 'El ritmo equilibrado te permite avanzar bien sin desgastarte. Es el ritmo que más estudiantes sostienen hasta el final.',
  },
  tranquila:   {
    emoji: '🌿', label: 'Tranquila',
    next_msg: 'Carga liviana para el próximo semestre. Calidad sobre cantidad.',
    advice: 'Ir a tu propio ritmo es una decisión inteligente. Menos ramos, más aprendizaje. Cuida tu bienestar y llegarás igual de lejos.',
  },
};

const MILESTONES = [
  { min: 90, icon: '🏁', msg: 'Casi en la meta — la práctica profesional se asoma.' },
  { min: 75, icon: '🌟', msg: 'Recta final. Solo queda el último tramo.' },
  { min: 50, icon: '⭐', msg: '¡Mitad de la carrera completada!' },
  { min: 25, icon: '✨', msg: 'Construyendo bases sólidas.' },
];

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
  const name = getUserName();

  if (!currentSem) return buildUnconfiguredPanel(name);

  const nextSem        = currentSem + 1;
  const approvedSCT    = COURSES.filter(c => approved.has(c.id)).reduce((sum, c) => sum + c.credits, 0);
  const studyingSCT    = studying ? COURSES.filter(c => studying.has(c.id)).reduce((sum, c) => sum + c.credits, 0) : 0;
  const progressPct    = Math.round(approvedSCT / TOTAL_CREDITS * 100);
  const recommendedArr = COURSES.filter(c => recommended.has(c.id));
  const blockedArr     = COURSES.filter(c => blocked.has(c.id) && !approved.has(c.id));
  const postponedArr   = COURSES.filter(c => postponed.has(c.id));
  const recommendedSCT = recommendedArr.reduce((sum, c) => sum + c.credits, 0);

  return [
    buildProgressSection(name, approved, failed, notTaken, blockedArr, approvedSCT, studyingSCT, progressPct),
    buildRecommendedSection(recommendedArr, recommendedSCT, nextSem, strategy),
    buildStrategySection(strategy),
    buildPaceAdvice(strategy),
    postponedArr.length ? buildPostponedSection(postponedArr) : '',
    buildProjectionSection(plan, nextSem),
    blockedArr.length   ? buildBlockedSection(blockedArr) : '',
    buildPanelFooter(name),
  ].join('');
}

function buildUnconfiguredPanel(name) {
  const greeting = name ? `Hola, <strong>${name}</strong> — ` : '';
  return `
    <div>
      <p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${greeting}configura tu semestre actual</p>
      <p style="font-size:11px;color:var(--text-2);line-height:1.6;margin-bottom:12px">
        Dinos en qué punto estás para calcular tu ruta personalizada y ver los ramos recomendados para el próximo semestre.
      </p>
      <button class="btn btn--primary" style="width:100%;padding:10px" data-action="open-config">
        ⚙ Configurar ahora →
      </button>
    </div>`;
}

function buildProgressSection(name, approved, failed, notTaken, blockedArr, approvedSCT, studyingSCT, pct) {
  const delayed        = failed.size + notTaken.size;
  const accumulatedSCT = approvedSCT + studyingSCT;
  const greeting       = name ? `Hola, <strong>${name}</strong> 👋` : 'Tu avance';

  const milestone      = MILESTONES.find(m => pct >= m.min);
  const milestoneHtml  = milestone
    ? `<div style="margin-top:7px;padding:6px 9px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:8px;font-size:10px;color:var(--amber);line-height:1.4">${milestone.icon} ${milestone.msg}</div>`
    : '';

  return `
    <div>
      <div class="panel-greeting">${greeting}</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${approved.size}</div>
          <div class="stat-label">Aprobados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="${delayed > 0 ? 'color:var(--red)' : ''}">${delayed}</div>
          <div class="stat-label">Atrasados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${blockedArr.length}</div>
          <div class="stat-label">Bloqueados</div>
        </div>
      </div>
      <div style="margin-top:8px;padding:7px 10px;background:var(--surface-2);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--text-2)">SCT acumulados</span>
        <span style="font-size:13px;font-weight:600">${accumulatedSCT}${studyingSCT > 0 ? ` <span style="font-size:10px;color:var(--blue);font-weight:400">(+${studyingSCT} cursando)</span>` : ''}</span>
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${pct}% · ${approvedSCT}/${TOTAL_CREDITS} SCT aprobados</div>
      ${milestoneHtml}
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

function buildRecommendedSection(recommendedArr, recommendedSCT, nextSem, strategy) {
  const ctx   = PACE_CTX[strategy] || PACE_CTX.equilibrada;
  const label = semesterLabel(nextSem);

  const items = recommendedArr.length === 0
    ? `<div class="empty-message">No hay ramos disponibles para el próximo semestre.</div>`
    : recommendedArr.map(c => `
        <div class="recommended-item" id="ri-${c.id}">
          <div class="recommended-name">${c.name}</div>
          <div class="recommended-meta">${c.credits} SCT · ${c.area}</div>
          <div class="recommended-actions">
            <button class="action-btn action-btn--muted" data-action="postpone" data-course-id="${c.id}">
              ⏭ Posponer
            </button>
          </div>
        </div>`).join('');

  return `
    <div>
      <div class="section-title">
        Para tu próximo semestre
        <span class="count">${recommendedArr.length} ramos · ${recommendedSCT} SCT</span>
      </div>
      <div style="font-size:9px;color:var(--text-2);margin-bottom:6px">Semestre ${nextSem} · ${label}</div>
      ${recommendedArr.length > 0 ? `<div style="font-size:10px;color:var(--text-2);line-height:1.5;padding:6px 9px;background:var(--surface-2);border-radius:7px;margin-bottom:7px">${ctx.next_msg}</div>` : ''}
      <div class="rec-list">${items}</div>
    </div>`;
}

function buildPaceAdvice(strategy) {
  const ctx = PACE_CTX[strategy] || PACE_CTX.equilibrada;
  return `
    <div style="padding:10px 12px;background:var(--surface-2);border-radius:9px;border-left:3px solid var(--blue)">
      <div style="font-size:9px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Ritmo ${ctx.emoji} ${ctx.label}</div>
      <div style="font-size:10px;color:var(--text-2);line-height:1.55">${ctx.advice}</div>
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
