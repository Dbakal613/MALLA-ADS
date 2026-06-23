/**
 * Guided tour system.
 * Three independent tours: 'initial', 'projection', 'schedule'.
 * State is persisted in localStorage under TOUR_KEY.
 */

const TOUR_KEY = 'malla-tour-v1';

function _state() {
  try { return JSON.parse(localStorage.getItem(TOUR_KEY) || '{}'); } catch { return {}; }
}
function _save(patch) {
  localStorage.setItem(TOUR_KEY, JSON.stringify({ ..._state(), ...patch }));
}

export function shouldShowInitialTour()    { return !_state().hasSeenInitialTour; }
export function shouldShowProjectionTour() { return !_state().hasSeenProjectionTour; }
export function shouldShowScheduleTour()   { return !_state().hasSeenScheduleTour; }
export function resetAllTours()            { localStorage.removeItem(TOUR_KEY); }
export function isActiveTour()             { return _name !== null; }

// ── Step definitions ──────────────────────────────────────────────────────────

const TOURS = {
  initial: [
    {
      target: '[data-tour="app-header"]',
      title: 'Empecemos paso a paso',
      text: 'Primero marca cómo vas con tus ramos. Con eso podremos proyectar una ruta más precisa.',
      pos: 'bottom',
      btn: 'Comenzar',
    },
    {
      target: '[data-tour="semester-1"]',
      title: 'Parte por tus primeros ramos',
      text: 'Revisa los ramos del Semestre 1 y marca cuáles ya aprobaste, cuáles estás cursando o cuáles quedaron pendientes.',
      pos: 'right',
    },
    {
      target: '[data-tour="first-course-card"]',
      title: 'Marca el estado del ramo',
      text: 'Haz clic en una tarjeta para elegir su estado: aprobado, cursando, pendiente, reprobado o convalidado.',
      pos: 'right',
      btn: 'Ya lo hice →',
    },
    {
      target: '[data-tour="first-course-card"]',
      title: 'Cada estado cambia tu ruta',
      text: 'Los ramos aprobados desbloquean nuevos cursos. Los pendientes o reprobados pueden bloquear los que dependen de ellos.',
      pos: 'right',
    },
    {
      target: '[data-tour="project-route-btn"]',
      title: 'Proyecta tu camino',
      text: 'Cuando tengas tus ramos marcados, usa este botón para calcular una ruta sugerida según tu semestre y ritmo.',
      pos: 'bottom',
      btn: 'Entendido',
    },
  ],
  projection: [
    {
      target: '[data-tour="side-panel"]',
      title: 'Esta es tu ruta sugerida',
      text: 'La app armó una propuesta considerando tus ramos, prerrequisitos, carga SCT y ritmo elegido.',
      pos: 'left',
    },
    {
      target: '[data-tour="free-mode-btn"]',
      title: 'Ajusta la ruta a tu manera',
      text: 'Si quieres mover ramos libremente para explorar otros escenarios, entra a Modo libre. La app te avisará si hay sobrecarga.',
      pos: 'bottom',
    },
    {
      target: '[data-tour="projected-card"]',
      title: 'Mueve ramos para probar',
      text: 'Puedes arrastrar ramos entre semestres para acomodar tu carga. Si algo no calza, la app te lo mostrará.',
      pos: 'top',
    },
    {
      target: '[data-tour="side-panel"]',
      title: 'Mira tus recomendaciones',
      text: 'Aquí verás qué ramos conviene tomar, la carga estimada y consejos para el próximo semestre.',
      pos: 'left',
      btn: 'Entendido',
    },
  ],
  schedule: [
    {
      target: '[data-tour="schedule-grid"]',
      title: 'Ahora arma tu horario',
      text: 'Aquí puedes ver cómo quedarían tus ramos distribuidos a lo largo de la semana.',
      pos: 'right',
    },
    {
      target: '[data-tour="sv-panel"]',
      title: 'Agrega ramos al horario',
      text: 'Desde este panel puedes agregar los ramos que podrías tomar el próximo semestre usando el botón +.',
      pos: 'left',
    },
    {
      target: '[data-tour="sv-suggest-btn"]',
      title: 'Prueba una combinación automática',
      text: 'Este botón intenta armar un horario posible con la mayor cantidad de ramos recomendados sin conflictos.',
      pos: 'left',
    },
    {
      target: '[data-tour="back-to-malla-btn"]',
      title: 'Vuelve cuando quieras',
      text: 'Puedes alternar entre la malla y el horario para revisar tu avance académico y tu semana de clases.',
      pos: 'bottom',
      btn: 'Entendido',
    },
  ],
};

// ── Runtime state ──────────────────────────────────────────────────────────────

let _name  = null;
let _idx   = 0;
let _steps = [];
let _onDone = null;

// ── DOM helpers ────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

// ── Positioning ────────────────────────────────────────────────────────────────

function _position(targetEl, pos) {
  const hl  = $('tour-highlight');
  const tip = $('tour-tooltip');
  if (!tip) return;

  const pad = 8;
  const gap = 12;
  const TW  = 284;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;

  if (!targetEl) {
    if (hl) hl.style.display = 'none';
    tip.style.top       = '50%';
    tip.style.left      = '50%';
    tip.style.transform = 'translate(-50%,-50%)';
    tip.className       = 'tour-tooltip';
    return;
  }

  const r = targetEl.getBoundingClientRect();

  // Highlight box
  if (hl) {
    hl.style.top     = `${r.top    - pad}px`;
    hl.style.left    = `${r.left   - pad}px`;
    hl.style.width   = `${r.width  + pad * 2}px`;
    hl.style.height  = `${r.height + pad * 2}px`;
    hl.style.display = 'block';
  }

  // Measure tooltip height
  tip.style.visibility = 'hidden';
  tip.style.display    = 'block';
  const TH = tip.offsetHeight || 120;
  tip.style.visibility = '';
  tip.style.transform  = '';

  // Pick best fitting position
  const fits = {
    bottom: r.bottom + pad + gap + TH < vh - 8,
    top:    r.top    - pad - gap - TH > 8,
    right:  r.right  + pad + gap + TW < vw - 8,
    left:   r.left   - pad - gap - TW > 8,
  };
  const resolved = fits[pos] ? pos
    : (['bottom', 'top', 'right', 'left'].find(p => fits[p]) || 'bottom');

  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;
  let top, left, arrowClass;

  switch (resolved) {
    case 'bottom':
      top  = r.bottom + pad + gap;
      left = Math.max(8, Math.min(cx - TW / 2, vw - TW - 8));
      arrowClass = 'tour-tooltip--at-top';
      break;
    case 'top':
      top  = r.top - pad - gap - TH;
      left = Math.max(8, Math.min(cx - TW / 2, vw - TW - 8));
      arrowClass = 'tour-tooltip--at-bottom';
      break;
    case 'right':
      top  = Math.max(8, Math.min(cy - TH / 2, vh - TH - 8));
      left = r.right + pad + gap;
      arrowClass = 'tour-tooltip--at-left';
      break;
    case 'left':
      top  = Math.max(8, Math.min(cy - TH / 2, vh - TH - 8));
      left = r.left - pad - gap - TW;
      arrowClass = 'tour-tooltip--at-right';
      break;
    default:
      top = r.bottom + pad + gap;
      left = Math.max(8, Math.min(cx - TW / 2, vw - TW - 8));
      arrowClass = 'tour-tooltip--at-top';
  }

  top  = Math.max(8, Math.min(top,  vh - TH - 8));
  left = Math.max(8, Math.min(left, vw - TW - 8));

  tip.style.top  = `${top}px`;
  tip.style.left = `${left}px`;
  tip.className  = `tour-tooltip ${arrowClass}`;

  // Position arrow along the edge pointing toward the target center
  const tipRect = tip.getBoundingClientRect();
  if (resolved === 'bottom' || resolved === 'top') {
    const xOffset = cx - tipRect.left;
    tip.style.setProperty('--arrow-x', `${Math.max(20, Math.min(xOffset, TW - 20))}px`);
  } else {
    const yOffset = cy - tipRect.top;
    tip.style.setProperty('--arrow-y', `${Math.max(20, Math.min(yOffset, TH - 20))}px`);
  }
}

// ── Render step ────────────────────────────────────────────────────────────────

function _render() {
  const step = _steps[_idx];
  if (!step) { endTour(); return; }

  const tip = $('tour-tooltip');
  if (!tip) return;

  const total  = _steps.length;
  const isLast = _idx === total - 1;
  const label  = step.btn ?? (isLast ? 'Entendido' : 'Siguiente →');

  tip.innerHTML = `
    <div class="tt-header">
      <span class="tt-counter">${_idx + 1} / ${total}</span>
      <button class="tt-skip" data-tour-action="skip">Saltar guía</button>
    </div>
    <div class="tt-title">${step.title}</div>
    <div class="tt-body">${step.text}</div>
    <div class="tt-actions">
      ${_idx > 0
        ? `<button class="tt-back" data-tour-action="back">← Atrás</button>`
        : '<span></span>'}
      <button class="tt-next" data-tour-action="next">${label}</button>
    </div>`;

  tip.style.display = 'block';

  const targetEl = step.target ? document.querySelector(step.target) : null;
  if (targetEl) {
    targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setTimeout(() => _position(targetEl, step.pos || 'bottom'), 180);
  } else {
    _position(null, 'bottom');
  }
}

// ── Click handler (capture phase — runs before app handlers) ─────────────────

function _onClick(e) {
  const btn = e.target.closest('[data-tour-action]');
  if (!btn) return;
  e.stopPropagation();
  const action = btn.dataset.tourAction;
  if (action === 'next') {
    if (_idx >= _steps.length - 1) endTour(); else { _idx++; _render(); }
  } else if (action === 'back') {
    if (_idx > 0) { _idx--; _render(); }
  } else if (action === 'skip') {
    endTour();
  }
}

let _attached = false;

function _attach()  {
  if (_attached) return;
  document.addEventListener('click', _onClick, true);
  window.addEventListener('resize', _onResize);
  _attached = true;
}

function _detach() {
  document.removeEventListener('click', _onClick, true);
  window.removeEventListener('resize', _onResize);
  _attached = false;
}

function _onResize() {
  if (!_name) return;
  const step = _steps[_idx];
  const targetEl = step?.target ? document.querySelector(step.target) : null;
  _position(targetEl, step?.pos || 'bottom');
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function startTour(name, onDone) {
  const steps = TOURS[name];
  if (!steps?.length) return;
  _name   = name;
  _idx    = 0;
  _steps  = steps;
  _onDone = onDone ?? null;
  _attach();
  _render();
}

export function endTour() {
  if (_name === 'initial')    _save({ hasSeenInitialTour:    true });
  if (_name === 'projection') _save({ hasSeenProjectionTour: true });
  if (_name === 'schedule')   _save({ hasSeenScheduleTour:   true });

  _name  = null;
  _steps = [];
  _detach();

  const tip = $('tour-tooltip');
  const hl  = $('tour-highlight');
  if (tip) { tip.style.display = 'none'; tip.style.transform = ''; }
  if (hl)  hl.style.display = 'none';

  _onDone?.();
  _onDone = null;
}
