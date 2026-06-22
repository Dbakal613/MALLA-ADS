/**
 * Schedule data for 2° Semestre 2026 — Administración de Servicios.
 * Source: Horarios ADS 2° Sem. 2026 (PDF oficial).
 *
 * Block format: { day, start, end }  — start/end are 'HH:MM' strings.
 * "Pdte. Ayudantía Cálculo y Costos" means those tutorial blocks are TBD.
 */

export const MODULE_TIMES = {
  1:  { start: '08:30', end: '09:20' },
  2:  { start: '09:30', end: '10:20' },
  3:  { start: '10:30', end: '11:20' },
  4:  { start: '11:30', end: '12:20' },
  5:  { start: '12:30', end: '13:20' },
  6:  { start: '13:30', end: '14:20' },
  7:  { start: '14:30', end: '15:20' },
  8:  { start: '15:30', end: '16:20' },
  9:  { start: '16:30', end: '17:20' },
  10: { start: '17:30', end: '18:20' },
  11: { start: '18:30', end: '19:20' },
};

/**
 * Schedule entries for all courses in 2° Semestre 2026.
 *
 * Fields:
 *   courseId     — ID from data.js; null for standalone optativo offerings
 *   section      — section string ('1', '2', 'online') or null
 *   sectionLabel — human label or null
 *   optativoKey  — unique key for specific optativo offering or null
 *   optativoName — display name for specific optativo or null
 *   blocks       — [{ day, start, end }]
 */
export const SCHEDULE_2S_2026 = [

  // ── Semestre 2 (1° año) ────────────────────────────────────────────────────
  {
    courseId: 'ingles1', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',     start: '08:30', end: '10:20' },
      { day: 'Miércoles', start: '08:30', end: '10:20' },
    ],
  },
  {
    courseId: 'gest_serv', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',  start: '10:30', end: '12:20' },
      { day: 'Jueves', start: '14:30', end: '15:20' },
    ],
  },
  {
    courseId: 'teologia1', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Miércoles', start: '10:30', end: '11:20' },
    ],
  },
  {
    courseId: 'calculo', section: '1', sectionLabel: 'Sec. 1',
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',     start: '13:30', end: '14:20' },
      { day: 'Miércoles', start: '13:30', end: '14:20' },
    ],
  },
  {
    courseId: 'calculo', section: '2', sectionLabel: 'Sec. 2',
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',   start: '08:30', end: '10:20' },
      { day: 'Viernes', start: '12:30', end: '14:20' },
    ],
  },
  {
    courseId: 'salud_ocup', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Martes', start: '13:30', end: '14:20' },
    ],
  },
  {
    courseId: 'taller_herr', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Viernes', start: '14:30', end: '15:20' },
    ],
  },
  {
    courseId: 'costos', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Martes', start: '15:30', end: '17:20' },
      { day: 'Jueves', start: '15:30', end: '17:20' },
    ],
  },

  // ── Semestre 4 (2° año) ────────────────────────────────────────────────────
  {
    courseId: 'estadistica2', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Martes', start: '08:30', end: '10:20' },
      { day: 'Jueves', start: '08:30', end: '10:20' },
    ],
  },
  {
    courseId: 'economia2', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Miércoles', start: '08:30', end: '10:20' },
      { day: 'Jueves',    start: '10:30', end: '12:20' },
    ],
  },
  {
    courseId: 'creaneg1', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',     start: '10:30', end: '12:20' },
      { day: 'Miércoles', start: '10:30', end: '12:20' },
    ],
  },
  {
    courseId: 'intro_ops', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Martes',    start: '10:30', end: '12:20' },
      { day: 'Miércoles', start: '15:30', end: '17:20' },
    ],
  },
  {
    courseId: 'tt2', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',  start: '13:30', end: '15:20' },
      { day: 'Jueves', start: '13:30', end: '15:20' },
    ],
  },

  // ── Semestre 6 (3° año) ────────────────────────────────────────────────────
  {
    courseId: 'comportcons', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Martes',  start: '08:30', end: '10:20' },
      { day: 'Viernes', start: '08:30', end: '10:20' },
    ],
  },
  {
    courseId: 'adm_estrateg', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',  start: '10:30', end: '12:20' },
      { day: 'Jueves', start: '13:30', end: '15:20' },
    ],
  },
  {
    courseId: 'gest_ops2', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Martes',    start: '10:30', end: '12:20' },
      { day: 'Miércoles', start: '15:30', end: '17:20' },
    ],
  },
  {
    courseId: 'des_org', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',     start: '13:30', end: '15:20' },
      { day: 'Miércoles', start: '13:30', end: '15:20' },
    ],
  },

  // ── Optativos de Servicios (sem 6 y 8) ────────────────────────────────────
  {
    courseId: null, section: null, sectionLabel: null,
    optativoKey: 'opt_exp_colaborador', optativoName: 'Exp. del Colaborador',
    blocks: [{ day: 'Jueves', start: '10:30', end: '12:20' }],
  },
  {
    courseId: null, section: null, sectionLabel: null,
    optativoKey: 'opt_hospitalidad', optativoName: 'Gestión de Hospitalidad',
    blocks: [{ day: 'Lunes', start: '15:30', end: '17:20' }],
  },
  {
    courseId: null, section: null, sectionLabel: null,
    optativoKey: 'opt_exp_paciente', optativoName: 'Exp. del Paciente',
    blocks: [{ day: 'Viernes', start: '14:30', end: '16:20' }],
  },
  {
    courseId: null, section: null, sectionLabel: null,
    optativoKey: 'opt_data_science', optativoName: 'Data Science p/ Servicios',
    blocks: [{ day: 'Lunes', start: '17:30', end: '19:20' }],
  },

  // ── Semestre 8 (4° año) ────────────────────────────────────────────────────
  {
    courseId: 'creaneg2', section: '1', sectionLabel: 'Sec. 1 · Presencial',
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes',  start: '08:30', end: '10:20' },
      { day: 'Jueves', start: '08:30', end: '10:20' },
    ],
  },
  {
    courseId: 'creaneg2', section: '2', sectionLabel: 'Sec. 2 · Online',
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Lunes', start: '12:30', end: '13:20' },
    ],
  },
  {
    courseId: 'etica_prof', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Miércoles', start: '10:30', end: '12:20' },
    ],
  },
  {
    courseId: 'der_laboral', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Miércoles', start: '12:30', end: '13:20' },
      { day: 'Viernes',   start: '12:30', end: '14:20' },
    ],
  },
  {
    courseId: 'adm_instal', section: null, sectionLabel: null,
    optativoKey: null, optativoName: null,
    blocks: [
      { day: 'Jueves', start: '13:30', end: '15:20' },
    ],
  },
];

/** Convert 'HH:MM' string to minutes from midnight. */
export function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Returns true if two blocks overlap in time. */
export function blocksOverlap(b1, b2) {
  if (b1.day !== b2.day) return false;
  return Math.max(toMinutes(b1.start), toMinutes(b2.start)) <
         Math.min(toMinutes(b1.end),   toMinutes(b2.end));
}

/** All course IDs that have at least one entry in this semester. */
export const SCHEDULED_COURSE_IDS = new Set(
  SCHEDULE_2S_2026.filter(e => e.courseId).map(e => e.courseId)
);

/** All entries for a given courseId (multiple = multiple sections). */
export function getSchedulesForCourse(courseId) {
  return SCHEDULE_2S_2026.filter(e => e.courseId === courseId);
}

/** All optativo offering entries. */
export function getOptativoEntries() {
  return SCHEDULE_2S_2026.filter(e => e.optativoKey !== null);
}
