/**
 * Builds the side panel and summary bar HTML strings.
 * Pure functions — no DOM access, no side effects.
 */

import { COURSES, TOTAL_CREDITS, PRACTICUM_ID } from './data.js';
import { getCourseById, getSemesterParity, getEffectiveSemester, getBlocked } from './planner.js';
import { getFailed, getNotTaken } from './state.js';

const semesterLabel = (s) => getSemesterParity(s) === 'first' ? 'Mar–Jul' : 'Ago–Dic';

function estimateGraduationDate(maxPlanSem, currentSem) {
  const semsFromNow = maxPlanSem - currentSem;
  if (semsFromNow <= 0) return null;
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  // 0 = first sem (Mar–Jul), 1 = second sem (Ago–Dic)
  let ord  = (month >= 3 && month <= 7) ? 0 : 1;
  ord     += semsFromNow;
  const gradYear = year + Math.floor(ord / 2);
  const gradSem  = ord % 2;
  return `${gradSem === 0 ? 'Mar–Jul' : 'Ago–Dic'} ${gradYear}`;
}

/**
 * @param {object} ctx
 * @param {Set}    ctx.approved
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
  if (!currentSem) return buildUnconfiguredPanel();

  const nextSem        = currentSem + 1;
  const approvedSCT    = COURSES.filter(c => approved.has(c.id)).reduce((sum, c) => sum + c.credits, 0);
  const studyingSCT    = studying ? COURSES.filter(c => studying.has(c.id)).reduce((sum, c) => sum + c.credits, 0) : 0;
  const progressPct    = Math.round(approvedSCT / TOTAL_CREDITS * 100);
  const recommendedArr = COURSES.filter(c => recommended.has(c.id));
  const blockedArr     = COURSES.filter(c => blocked.has(c.id) && !approved.has(c.id));
  const postponedArr   = COURSES.filter(c => postponed.has(c.id));
  const recommendedSCT = recommendedArr.reduce((sum, c) => sum + c.credits, 0);

  return [
    buildProgressSection(approved, failed, notTaken, blockedArr, approvedSCT, studyingSCT, progressPct),
    buildStrategySection(strategy),
    buildRecommendedSection(recommendedArr, recommendedSCT, nextSem),
    postponedArr.length ? buildPostponedSection(postponedArr) : '',
    buildProjectionSection(plan, nextSem),
    blockedArr.length  ? buildBlockedSection(blockedArr) : '',
  ].join('');
}

function buildUnconfiguredPanel() {
  return `
    <div>
      <div class="section-title">Configura tu semestre</div>
      <p style="font-size:11px;color:var(--text-2);line-height:1.6;margin-bottom:10px">
        Dinos dónde estás para recibir un plan personalizado.
      </p>
      <button class="btn btn--primary" style="width:100%;padding:9px" data-action="open-config">
        ⚙ Configurar ahora →
      </button>
    </div>`;
}

function buildProgressSection(approved, failed, notTaken, blockedArr, approvedSCT, studyingSCT, pct) {
  const delayed        = failed.size + notTaken.size;
  const accumulatedSCT = approvedSCT + studyingSCT;
  return `
    <div>
      <div class="section-title">Tu avance</div>
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
      <div style="margin-top:8px;padding:7px 10px;background:var(--surface-2);border-radius:6px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--text-2)">SCT acumulados</span>
        <span style="font-size:13px;font-weight:600">${accumulatedSCT}${studyingSCT > 0 ? ` <span style="font-size:10px;color:var(--blue);font-weight:400">(+${studyingSCT} cursando)</span>` : ''}</span>
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${pct}% · ${approvedSCT}/${TOTAL_CREDITS} SCT aprobados</div>
    </div>`;
}

function buildStrategySection(currentStrategy) {
  const options = [
    { key: 'rapida',      label: '🚀 Rápida',      sub: 'Max 33 SCT' },
    { key: 'equilibrada', label: '⚖️ Equilibrada', sub: 'Max 28 SCT' },
    { key: 'tranquila',   label: '🌿 Tranquila',   sub: 'Max 26 SCT' },
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

function buildRecommendedSection(recommendedArr, recommendedSCT, nextSem) {
  const label = `${getSemesterParity(nextSem) === 'first' ? 'Mar–Jul' : 'Ago–Dic'}`;

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
      <div style="font-size:9px;color:var(--text-2);margin-bottom:6px">Semestre ${nextSem} (${label})</div>
      <div class="rec-list">${items}</div>
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
    <div style="margin-bottom:8px;padding:8px 10px;background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:7px;display:flex;justify-content:space-between;align-items:center">
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

function buildDownloadButton() {
  return `
    <div>
      <button class="btn" style="width:100%;padding:9px;text-align:center" data-action="download-projection">
        ↓ Descargar proyección completa
      </button>
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
