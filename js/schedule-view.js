import { SCHEDULE_2S_2026, blocksOverlap } from './schedule-data.js';
import { COURSES, OPTATIVO_IDS } from './data.js';
import { safeCalculatePlan, getBlocked } from './planner.js';
import { getStrategy, getCurrentSemesterNumber } from './state.js';
import { showToast } from './toast.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'malla-schedule-v1';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const DAY_ABBR  = { 'Lunes':'Lunes', 'Martes':'Mar', 'Miércoles':'Mié', 'Jueves':'Jue', 'Viernes':'Vie' };
const DAY_COL   = { 'Lunes':2, 'Martes':3, 'Miércoles':4, 'Jueves':5, 'Viernes':6 };

const MODULE_LABELS = ['08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30'];

const START_TO_ROW = {
  '08:30':2, '09:30':3, '10:30':4, '11:30':5, '12:30':6,
  '13:30':7, '14:30':8, '15:30':9, '16:30':10, '17:30':11, '18:30':12,
};
const END_TO_ROW = {
  '09:20':3, '10:20':4, '11:20':5, '12:20':6, '13:20':7,
  '14:20':8, '15:20':9, '16:20':10, '17:20':11, '18:20':12, '19:20':13,
};

const BLOCK_COLORS = [
  { bg:'#EEF2FF', border:'#818CF8', text:'#3730A3' },
  { bg:'#F0FDF4', border:'#4ADE80', text:'#166534' },
  { bg:'#FFF7ED', border:'#FB923C', text:'#9A3412' },
  { bg:'#F5F3FF', border:'#A78BFA', text:'#5521B5' },
  { bg:'#FFF1F2', border:'#FDA4AF', text:'#881337' },
  { bg:'#ECFEFF', border:'#22D3EE', text:'#155E75' },
  { bg:'#FEFCE8', border:'#EAB308', text:'#713F12' },
  { bg:'#FDF4FF', border:'#E879F9', text:'#701A75' },
];

const MAX_SCT = { rapida: 33, equilibrada: 28, tranquila: 26 };
const OPT_SLOTS = ['opt6a', 'opt6b', 'opt8a', 'opt8b'];

// ── State ──────────────────────────────────────────────────────────────────────

let _selected = [];        // [{ entry, colorIdx, selKey }]
let _usedColorIdxs = new Set();
let _listenerAttached = false;

// ── Key helpers ────────────────────────────────────────────────────────────────

function _selKey(entry) {
  if (entry.optativoKey) return 'opt:' + entry.optativoKey;
  if (entry.section)    return entry.courseId + ':' + entry.section;
  return entry.courseId;
}

function _nextColorIdx() {
  for (let i = 0; i < BLOCK_COLORS.length; i++) {
    if (!_usedColorIdxs.has(i)) return i;
  }
  return _selected.length % BLOCK_COLORS.length;
}

function _nextFreeColor(used) {
  for (let i = 0; i < BLOCK_COLORS.length; i++) {
    if (!used.has(i)) return i;
  }
  return used.size % BLOCK_COLORS.length;
}

// ── Persistence ────────────────────────────────────────────────────────────────

function _save() {
  const data = _selected.map(s => ({ selKey: s.selKey, colorIdx: s.colorIdx }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    _selected = [];
    _usedColorIdxs = new Set();
    data.forEach(({ selKey, colorIdx }) => {
      const entry = SCHEDULE_2S_2026.find(e => _selKey(e) === selKey);
      if (entry) {
        _selected.push({ entry, colorIdx, selKey });
        _usedColorIdxs.add(colorIdx);
      }
    });
  } catch {
    _selected = [];
    _usedColorIdxs = new Set();
  }
}

// ── Pre-populate from projection ──────────────────────────────────────────────

function _prePopulateFromProjection() {
  const currentSem = getCurrentSemesterNumber();
  if (!currentSem) return;

  const nextSem = currentSem + 1;
  const { plan } = safeCalculatePlan();
  const nextCourseIds = plan[nextSem] ?? [];
  if (!nextCourseIds.length) return;

  nextCourseIds.forEach(courseId => {
    if (OPTATIVO_IDS.has(courseId)) return; // user picks specific offering

    const entries = SCHEDULE_2S_2026.filter(e => e.courseId === courseId);
    if (!entries.length) return; // not offered this semester

    const entry = entries[0]; // first section if multiple exist
    const key   = _selKey(entry);
    if (_selected.some(s => s.selKey === key)) return;
    if (_selected.some(s => s.entry.courseId === courseId)) return;

    const colorIdx = _nextColorIdx();
    _selected.push({ entry, colorIdx, selKey: key });
    _usedColorIdxs.add(colorIdx);
  });

  _save();
}

// ── Conflict detection ─────────────────────────────────────────────────────────

function _detectConflicts() {
  const pairs = [];
  for (let i = 0; i < _selected.length; i++) {
    for (let j = i + 1; j < _selected.length; j++) {
      const a = _selected[i], b = _selected[j];
      const clash = a.entry.blocks.some(ba => b.entry.blocks.some(bb => blocksOverlap(ba, bb)));
      if (clash) pairs.push([a.selKey, b.selKey]);
    }
  }
  return pairs;
}

function _conflictingKeys() {
  const keys = new Set();
  _detectConflicts().forEach(([a, b]) => { keys.add(a); keys.add(b); });
  return keys;
}

// ── Display helpers ────────────────────────────────────────────────────────────

function _getDisplayName(entry) {
  if (entry.optativoName) return entry.optativoName;
  const c = COURSES.find(c => c.id === entry.courseId);
  return c ? c.name : entry.courseId;
}

function _getCredits(entry) {
  if (entry.optativoKey) return 3;
  const c = COURSES.find(c => c.id === entry.courseId);
  return c ? c.credits : 0;
}

function _dayChips(entry) {
  const ABBR = { 'Lunes':'Lun', 'Martes':'Mar', 'Miércoles':'Mié', 'Jueves':'Jue', 'Viernes':'Vie' };
  const unique = [...new Set(entry.blocks.map(b => ABBR[b.day] || b.day))];
  return unique.join(' · ');
}

function _truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// ── Grid builder ───────────────────────────────────────────────────────────────

function _buildGrid() {
  const conflictKeys = _conflictingKeys();
  let html = '<div class="sv-grid">';

  // Row 1: corner + day headers
  html += `<div class="sg-corner" style="grid-column:1;grid-row:1"></div>`;
  DAYS.forEach((day, i) => {
    html += `<div class="sg-day-header" style="grid-column:${i + 2};grid-row:1">${DAY_ABBR[day]}</div>`;
  });

  // Rows 2–12: time labels + background cells
  MODULE_LABELS.forEach((time, i) => {
    const row = i + 2;
    html += `<div class="sg-time" style="grid-column:1;grid-row:${row}">${time}</div>`;
    DAYS.forEach((_, j) => {
      html += `<div class="sg-cell${i % 2 !== 0 ? ' sg-cell--alt' : ''}" style="grid-column:${j + 2};grid-row:${row}"></div>`;
    });
  });

  // Course blocks
  _selected.forEach(({ entry, colorIdx, selKey }) => {
    const color = BLOCK_COLORS[colorIdx];
    const isConflict = conflictKeys.has(selKey);
    const name = _getDisplayName(entry);
    const short = _truncate(name, 24);
    const conflictClass = isConflict ? ' sg-block--conflict' : '';

    entry.blocks.forEach(block => {
      const col      = DAY_COL[block.day];
      const rowStart = START_TO_ROW[block.start];
      const rowEnd   = END_TO_ROW[block.end];
      if (!col || !rowStart || !rowEnd) return;

      html += `<div class="sg-block${conflictClass}"
        style="grid-column:${col};grid-row:${rowStart}/${rowEnd};background:${color.bg};border-color:${color.border};color:${color.text}">
        <span class="sg-block-name">${short}</span>
        ${entry.sectionLabel ? `<span class="sg-block-sec">${entry.sectionLabel}</span>` : ''}
      </div>`;
    });
  });

  html += '</div>';
  return html;
}

// ── Panel builder ──────────────────────────────────────────────────────────────

function _buildPanel() {
  const { recommended } = safeCalculatePlan();
  const blocked  = getBlocked();
  const strategy = getStrategy();
  const maxSCT   = MAX_SCT[strategy] ?? 28;

  const conflictPairs  = _detectConflicts();
  const conflictKeys   = new Set(conflictPairs.flatMap(p => p));
  const selectedKeys   = new Set(_selected.map(s => s.selKey));
  const selectedIds    = new Set(_selected.filter(s => s.entry.courseId).map(s => s.entry.courseId));

  const totalSCT = _selected.reduce((sum, s) => sum + _getCredits(s.entry), 0);
  const loadClass = totalSCT === 0 ? 'zero' : totalSCT <= maxSCT ? 'ok' : 'over';
  const loadLabel = totalSCT === 0 ? 'sin ramos'
    : totalSCT <= 10          ? 'liviana'
    : totalSCT <= maxSCT * .7 ? 'moderada'
    : totalSCT <= maxSCT      ? 'equilibrada'
    : 'sobrecarga';

  // Availability per entry
  function classify(entry) {
    const key        = _selKey(entry);
    const isSelected = selectedKeys.has(key);
    let isBlocked, isRecommended;
    if (entry.courseId) {
      isBlocked     = blocked.has(entry.courseId);
      isRecommended = recommended.has(entry.courseId);
    } else {
      isBlocked     = OPT_SLOTS.every(id => blocked.has(id));
      isRecommended = OPT_SLOTS.some(id => recommended.has(id));
    }
    const hasSibling = !isSelected && entry.courseId && selectedIds.has(entry.courseId);
    return { entry, key, isSelected, isBlocked, isRecommended, hasSibling };
  }

  const all           = SCHEDULE_2S_2026.map(classify);
  const inSchedule    = all.filter(a => a.isSelected);
  const recItems      = all.filter(a => !a.isSelected && !a.hasSibling && a.isRecommended && !a.isBlocked);
  const availItems    = all.filter(a => !a.isSelected && !a.isRecommended && !a.isBlocked && !a.hasSibling);
  const siblingItems  = all.filter(a => a.hasSibling);
  const blockedItems  = all.filter(a => !a.isSelected && a.isBlocked);

  function courseItem({ entry, key, isBlocked, hasSibling }) {
    const name    = _getDisplayName(entry);
    const credits = _getCredits(entry);
    const days    = _dayChips(entry);
    const isSelected  = selectedKeys.has(key);
    const isConflict  = isSelected && conflictKeys.has(key);
    const sel         = isSelected ? _selected.find(s => s.selKey === key) : null;
    const color       = sel ? BLOCK_COLORS[sel.colorIdx] : null;

    let actionHtml = '';
    if (isSelected) {
      actionHtml = `<button class="sv-remove-btn" data-sv-action="sv-remove" data-sv-key="${key}" title="Quitar">×</button>`;
    } else if (hasSibling) {
      const sib = _selected.find(s => s.entry.courseId === entry.courseId);
      const sibLabel = sib?.entry?.sectionLabel || 'ya agregada';
      actionHtml = `<span class="sv-sibling-note">${sibLabel}</span>`;
    } else if (!isBlocked) {
      actionHtml = `<button class="sv-add-btn" data-sv-action="sv-add" data-sv-key="${key}" title="Agregar">+</button>`;
    }

    const dotHtml = color
      ? `<span class="sv-course-dot" style="background:${color.border}"></span>`
      : `<span class="sv-course-dot sv-course-dot--empty"></span>`;

    const conflictClass = isConflict ? ' sv-course-item--conflict' : '';

    return `<div class="sv-course-item${conflictClass}">
      ${dotHtml}
      <div class="sv-course-info">
        <div class="sv-course-name">${name}${entry.sectionLabel ? `<span class="sv-sec-tag">${entry.sectionLabel}</span>` : ''}</div>
        <div class="sv-course-meta">${credits} SCT · ${days}</div>
      </div>
      ${actionHtml}
    </div>`;
  }

  let html = '';

  // Summary
  html += `<div class="sv-summary">
    <span class="sv-summary-stat"><strong>${_selected.length}</strong> ramos</span>
    <span class="sv-summary-stat"><strong>${totalSCT}</strong> SCT</span>
    <span class="sv-load-badge sv-load-badge--${loadClass}">${loadLabel}</span>
    ${conflictPairs.length > 0 ? `<span class="sv-topes-badge">${conflictPairs.length} tope${conflictPairs.length > 1 ? 's' : ''}</span>` : ''}
  </div>`;

  // Conflict details
  if (conflictPairs.length > 0) {
    html += `<div class="sv-conflict-box">
      <div class="sv-conflict-title">⚠ ${conflictPairs.length} tope${conflictPairs.length > 1 ? 's' : ''} de horario</div>`;
    conflictPairs.forEach(([k1, k2]) => {
      const s1 = _selected.find(s => s.selKey === k1);
      const s2 = _selected.find(s => s.selKey === k2);
      if (!s1 || !s2) return;
      let overlapDay = '';
      outer: for (const b1 of s1.entry.blocks) {
        for (const b2 of s2.entry.blocks) {
          if (blocksOverlap(b1, b2)) { overlapDay = b1.day; break outer; }
        }
      }
      html += `<div class="sv-conflict-item">
        ${_getDisplayName(s1.entry)} · ${_getDisplayName(s2.entry)}
        ${overlapDay ? `<span class="sv-conflict-day">(${overlapDay})</span>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // Suggest button
  html += `<button class="sv-suggest-btn" data-sv-action="sv-suggest">✦ Sugerir horario sin topes</button>`;

  // Clear all
  if (_selected.length > 0) {
    html += `<button class="sv-clear-btn" data-sv-action="sv-clear">Limpiar todo</button>`;
  }

  // En tu horario
  if (inSchedule.length > 0) {
    html += `<div class="sv-section">
      <div class="sv-section-title">En tu horario <span class="sv-section-count">${inSchedule.length}</span></div>
      ${inSchedule.map(courseItem).join('')}
    </div>`;
  }

  // Recomendados
  if (recItems.length > 0) {
    html += `<div class="sv-section">
      <div class="sv-section-title sv-section-title--rec">✦ Recomendados <span class="sv-section-count">${recItems.length}</span></div>
      ${recItems.map(courseItem).join('')}
    </div>`;
  }

  // Disponibles (+ siblings with disabled button)
  const allAvailable = [...availItems, ...siblingItems];
  if (allAvailable.length > 0) {
    html += `<div class="sv-section">
      <div class="sv-section-title">Disponibles <span class="sv-section-count">${availItems.length}</span></div>
      ${allAvailable.map(courseItem).join('')}
    </div>`;
  }

  // Sin disponibilidad
  if (blockedItems.length > 0) {
    html += `<div class="sv-section sv-section--blocked">
      <div class="sv-section-title sv-section-title--muted">Sin disponibilidad · ${blockedItems.length}</div>
      ${blockedItems.map(courseItem).join('')}
    </div>`;
  }

  return html;
}

// ── Render ─────────────────────────────────────────────────────────────────────

export function renderScheduleView() {
  const container = document.getElementById('schedule-view');
  if (!container) return;

  container.innerHTML = `
    <div class="sv-layout">
      <div class="sv-grid-wrapper">${_buildGrid()}</div>
      <div class="sv-panel">
        <div class="sv-panel-header">
          <h3>Arma tu horario</h3>
          <p>2° Semestre 2026 — Administración de Servicios</p>
        </div>
        <div class="sv-panel-body">${_buildPanel()}</div>
      </div>
    </div>`;
}

// ── Actions ────────────────────────────────────────────────────────────────────

function _addEntry(key) {
  if (_selected.some(s => s.selKey === key)) return;

  const entry = SCHEDULE_2S_2026.find(e => _selKey(e) === key);
  if (!entry) return;

  if (entry.courseId) {
    const existing = _selected.find(s => s.entry.courseId === entry.courseId);
    if (existing) {
      showToast(`Ya tienes ${_getDisplayName(existing.entry)}${existing.entry.sectionLabel ? ' (' + existing.entry.sectionLabel + ')' : ''} en tu horario.`, 'warning');
      return;
    }
  }

  const colorIdx = _nextColorIdx();
  _selected.push({ entry, colorIdx, selKey: key });
  _usedColorIdxs.add(colorIdx);

  const conflicts = _detectConflicts();
  if (conflicts.length > 0) {
    showToast('¡Tope de horario detectado! Los bloques en conflicto aparecen en rojo.', 'warning');
  }

  _save();
  renderScheduleView();
}

function _removeEntry(key) {
  const idx = _selected.findIndex(s => s.selKey === key);
  if (idx === -1) return;
  const removed = _selected.splice(idx, 1)[0];
  _usedColorIdxs.delete(removed.colorIdx);
  _save();
  renderScheduleView();
}

function _clearAll() {
  _selected = [];
  _usedColorIdxs = new Set();
  _save();
  renderScheduleView();
}

function _suggestSchedule() {
  const { recommended } = safeCalculatePlan();
  const blocked  = getBlocked();
  const strategy = getStrategy();
  const maxSCT   = MAX_SCT[strategy] ?? 28;

  const available = SCHEDULE_2S_2026.filter(entry => {
    if (entry.courseId) return !blocked.has(entry.courseId);
    return !OPT_SLOTS.every(id => blocked.has(id));
  }).sort((a, b) => {
    const aRec = a.courseId ? recommended.has(a.courseId) : OPT_SLOTS.some(id => recommended.has(id));
    const bRec = b.courseId ? recommended.has(b.courseId) : OPT_SLOTS.some(id => recommended.has(id));
    if (aRec !== bRec) return aRec ? -1 : 1;
    return _getCredits(b) - _getCredits(a);
  });

  const newSelected = [];
  const usedColors  = new Set();
  const usedIds     = new Set();
  let totalSCT      = 0;

  for (const entry of available) {
    const credits = _getCredits(entry);
    if (totalSCT + credits > maxSCT) continue;
    if (entry.courseId && usedIds.has(entry.courseId)) continue;

    const hasConflict = newSelected.some(({ entry: e }) =>
      entry.blocks.some(b1 => e.blocks.some(b2 => blocksOverlap(b1, b2)))
    );
    if (hasConflict) continue;

    const colorIdx = _nextFreeColor(usedColors);
    usedColors.add(colorIdx);
    newSelected.push({ entry, colorIdx, selKey: _selKey(entry) });
    totalSCT += credits;
    if (entry.courseId) usedIds.add(entry.courseId);
  }

  _selected     = newSelected;
  _usedColorIdxs = usedColors;
  _save();
  renderScheduleView();
  showToast(`Horario sugerido: ${newSelected.length} ramos · ${totalSCT} SCT`, 'success');
}

// ── Event handling ─────────────────────────────────────────────────────────────

function _handleScheduleClick(e) {
  const svEl = document.getElementById('schedule-view');
  if (!svEl || svEl.style.display === 'none') return;

  const el = e.target.closest('[data-sv-action]');
  if (!el) return;

  switch (el.dataset.svAction) {
    case 'sv-add':     _addEntry(el.dataset.svKey);    break;
    case 'sv-remove':  _removeEntry(el.dataset.svKey); break;
    case 'sv-suggest': _suggestSchedule();              break;
    case 'sv-clear':   _clearAll();                    break;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function initScheduleView() {
  const firstOpen = localStorage.getItem(STORAGE_KEY) === null;
  _load();
  if (firstOpen) {
    _prePopulateFromProjection();
  }
  if (!_listenerAttached) {
    document.addEventListener('click', _handleScheduleClick);
    _listenerAttached = true;
  }
  renderScheduleView();
}

export function destroyScheduleView() {
  document.removeEventListener('click', _handleScheduleClick);
  _listenerAttached = false;
}
