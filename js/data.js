/**
 * Course catalogue for Administración de Servicios.
 *
 * Fields:
 *  id           — unique slug
 *  name         — display name
 *  credits      — SCT credits
 *  semester     — default semester number (1–9)
 *  offering     — 'first' | 'second' | 'both'  (which semester of the year it is offered)
 *  prerequisites — ids that must be approved before taking this course
 *  area         — academic area label
 *  isPracticum  — true only for the professional internship
 */
export const COURSES = [
  // ── Semester 1 ──────────────────────────────────────────────────
  { id: 'intro_serv',   name: 'Introducción a los Servicios',         credits: 6,  semester: 1, offering: 'first',  prerequisites: [],                                                      area: 'Gestión Serv.' },
  { id: 'intro_adm',   name: 'Introducción a la Administración',      credits: 5,  semester: 1, offering: 'first',  prerequisites: [],                                                      area: 'Estrategia' },
  { id: 'contabilidad',name: 'Contabilidad',                           credits: 6,  semester: 1, offering: 'first',  prerequisites: [],                                                      area: 'Finanzas' },
  { id: 'algebra',     name: 'Álgebra',                               credits: 6,  semester: 1, offering: 'first',  prerequisites: [],                                                      area: 'Cuantitativas' },
  { id: 'tt1',         name: 'Taller Trabajo Equipo I',               credits: 1,  semester: 1, offering: 'first',  prerequisites: [],                                                      area: 'Habilidades' },
  { id: 'taller_com',  name: 'Taller de Comunicación',                credits: 3,  semester: 1, offering: 'first',  prerequisites: [],                                                      area: 'Expresión' },
  { id: 'antropo',     name: 'Antropología',                          credits: 3,  semester: 1, offering: 'first',  prerequisites: [],                                                      area: 'Form. General' },

  // ── Semester 2 ──────────────────────────────────────────────────
  { id: 'gest_serv',   name: 'Gestión de Servicios',                  credits: 5,  semester: 2, offering: 'second', prerequisites: ['intro_serv'],                                          area: 'Gestión Serv.' },
  { id: 'salud_ocup',  name: 'Salud Ocupacional',                     credits: 3,  semester: 2, offering: 'second', prerequisites: [],                                                      area: 'Personas' },
  { id: 'calculo',     name: 'Cálculo',                               credits: 6,  semester: 2, offering: 'second', prerequisites: ['algebra'],                                             area: 'Cuantitativas' },
  { id: 'taller_herr', name: 'Taller Herramientas Informáticas',      credits: 3,  semester: 2, offering: 'second', prerequisites: [],                                                      area: 'Cuantitativas' },
  { id: 'ingles1',     name: 'Inglés I',                              credits: 4,  semester: 2, offering: 'second', prerequisites: [],                                                      area: 'Expresión' },
  { id: 'teologia1',   name: 'Teología I',                            credits: 3,  semester: 2, offering: 'second', prerequisites: [],                                                      area: 'Form. General' },
  { id: 'costos',      name: 'Contabilidad de Costos',                credits: 6,  semester: 2, offering: 'second', prerequisites: ['contabilidad'],                                        area: 'Finanzas' },

  // ── Semester 3 ──────────────────────────────────────────────────
  { id: 'economia1',   name: 'Economía I',                            credits: 5,  semester: 3, offering: 'first',  prerequisites: ['intro_adm'],                                           area: 'Estrategia' },
  { id: 'dir_personas',name: 'Dirección de Personas',                 credits: 5,  semester: 3, offering: 'first',  prerequisites: ['salud_ocup'],                                          area: 'Personas' },
  { id: 'estadistica1',name: 'Estadística I',                         credits: 5,  semester: 3, offering: 'first',  prerequisites: [],                                                      area: 'Cuantitativas' },
  { id: 'intro_mkt',   name: 'Introducción al Marketing',             credits: 4,  semester: 3, offering: 'first',  prerequisites: ['intro_adm'],                                           area: 'Clientes' },
  { id: 'ingles2',     name: 'Inglés II',                             credits: 4,  semester: 3, offering: 'first',  prerequisites: ['ingles1'],                                             area: 'Expresión' },
  { id: 'minor3',      name: 'Minor',                                 credits: 4,  semester: 3, offering: 'both',   prerequisites: [],                                                      area: 'Minor' },
  { id: 'teologia2',   name: 'Teología II',                           credits: 3,  semester: 3, offering: 'first',  prerequisites: ['teologia1'],                                           area: 'Form. General' },

  // ── Semester 4 ──────────────────────────────────────────────────
  { id: 'creaneg1',    name: 'Creación de Negocios I',                credits: 5,  semester: 4, offering: 'second', prerequisites: ['intro_mkt', 'gest_serv', 'contabilidad'],              area: 'Gestión Serv.' },
  { id: 'economia2',   name: 'Economía II',                           credits: 5,  semester: 4, offering: 'second', prerequisites: ['economia1'],                                           area: 'Estrategia' },
  { id: 'intro_ops',   name: 'Intro. Gestión de Operaciones',         credits: 5,  semester: 4, offering: 'second', prerequisites: ['intro_adm'],                                           area: 'Operaciones' },
  { id: 'estadistica2',name: 'Estadística II',                        credits: 5,  semester: 4, offering: 'second', prerequisites: ['estadistica1'],                                        area: 'Cuantitativas' },
  { id: 'tt2',         name: 'Taller Trabajo Equipo II',              credits: 3,  semester: 4, offering: 'second', prerequisites: ['tt1'],                                                 area: 'Habilidades' },
  { id: 'minor4',      name: 'Minor',                                 credits: 4,  semester: 4, offering: 'both',   prerequisites: [],                                                      area: 'Minor' },
  { id: 'peg4',        name: 'PEG Electivo',                          credits: 3,  semester: 4, offering: 'both',   prerequisites: [],                                                      area: 'Form. General' },

  // ── Semester 5 ──────────────────────────────────────────────────
  { id: 'comp_org',    name: 'Comportamiento Organizacional',         credits: 5,  semester: 5, offering: 'first',  prerequisites: ['dir_personas'],                                        area: 'Personas' },
  { id: 'dis_espacios',name: 'Diseño de Espacios',                    credits: 3,  semester: 5, offering: 'first',  prerequisites: ['intro_serv'],                                          area: 'Operaciones' },
  { id: 'gest_ops1',   name: 'Gestión de Operaciones Serv. I',        credits: 5,  semester: 5, offering: 'first',  prerequisites: ['intro_ops'],                                           area: 'Operaciones' },
  { id: 'inv_mercados',name: 'Investigación de Mercados',             credits: 5,  semester: 5, offering: 'first',  prerequisites: ['estadistica2'],                                        area: 'Clientes' },
  { id: 'finanzas',    name: 'Finanzas',                              credits: 5,  semester: 5, offering: 'first',  prerequisites: ['costos'],                                              area: 'Finanzas' },
  { id: 'etica',       name: 'Ética',                                 credits: 3,  semester: 5, offering: 'first',  prerequisites: ['antropo'],                                             area: 'Form. General' },
  { id: 'minor5',      name: 'Minor',                                 credits: 4,  semester: 5, offering: 'both',   prerequisites: [],                                                      area: 'Minor' },

  // ── Semester 6 ──────────────────────────────────────────────────
  { id: 'adm_estrateg',name: 'Administración Estratégica',            credits: 5,  semester: 6, offering: 'second', prerequisites: ['intro_adm'],                                           area: 'Estrategia' },
  { id: 'des_org',     name: 'Desarrollo Org. y Gestión del Cambio',  credits: 5,  semester: 6, offering: 'second', prerequisites: ['comp_org'],                                            area: 'Personas' },
  { id: 'gest_ops2',   name: 'Gestión de Operaciones Serv. II',       credits: 6,  semester: 6, offering: 'second', prerequisites: ['gest_ops1'],                                           area: 'Operaciones' },
  { id: 'comportcons', name: 'Comportamiento del Consumidor',         credits: 5,  semester: 6, offering: 'second', prerequisites: ['inv_mercados'],                                        area: 'Clientes' },
  { id: 'opt6a',       name: 'Optativo de Servicios',                 credits: 3,  semester: 6, offering: 'both',   prerequisites: ['intro_serv'],                                          area: 'Gestión Serv.' },
  { id: 'opt6b',       name: 'Optativo de Servicios',                 credits: 3,  semester: 6, offering: 'both',   prerequisites: ['intro_serv'],                                          area: 'Gestión Serv.' },
  { id: 'peg6',        name: 'PEG Electivo',                          credits: 3,  semester: 6, offering: 'both',   prerequisites: [],                                                      area: 'Form. General' },

  // ── Semester 7 ──────────────────────────────────────────────────
  { id: 'dis_exp',     name: 'Diseño Experiencia de Servicios',       credits: 5,  semester: 7, offering: 'first',  prerequisites: ['creaneg1'],                                            area: 'Gestión Serv.' },
  { id: 'tec_serv',    name: 'Tecnología en los Servicios',           credits: 4,  semester: 7, offering: 'first',  prerequisites: ['gest_serv'],                                           area: 'Gestión Serv.' },
  { id: 'innov',       name: 'Innovación y Emprendimiento',           credits: 4,  semester: 7, offering: 'first',  prerequisites: ['creaneg1'],                                            area: 'Estrategia' },
  { id: 'hab_dir',     name: 'Habilidades Directivas',                credits: 4,  semester: 7, offering: 'first',  prerequisites: ['dir_personas'],                                        area: 'Personas' },
  { id: 'mkt_estrateg',name: 'Marketing Estratégico',                 credits: 5,  semester: 7, offering: 'first',  prerequisites: ['intro_mkt'],                                           area: 'Clientes' },
  { id: 'eval_proy',   name: 'Evaluación de Proyectos',               credits: 5,  semester: 7, offering: 'first',  prerequisites: ['finanzas'],                                            area: 'Finanzas' },
  { id: 'teologia3',   name: 'Teología III',                          credits: 3,  semester: 7, offering: 'first',  prerequisites: ['teologia2'],                                           area: 'Form. General' },

  // ── Semester 8 ──────────────────────────────────────────────────
  { id: 'creaneg2',    name: 'Creación de Negocios II',               credits: 12, semester: 8, offering: 'second', prerequisites: ['dis_exp', 'adm_estrateg', 'eval_proy', 'inv_mercados'],area: 'Gestión Serv.' },
  { id: 'opt8a',       name: 'Optativo de Servicios',                 credits: 3,  semester: 8, offering: 'both',   prerequisites: ['intro_serv'],                                          area: 'Gestión Serv.' },
  { id: 'opt8b',       name: 'Optativo de Servicios',                 credits: 3,  semester: 8, offering: 'both',   prerequisites: ['intro_serv'],                                          area: 'Gestión Serv.' },
  { id: 'der_laboral', name: 'Derecho Laboral',                       credits: 3,  semester: 8, offering: 'second', prerequisites: ['dir_personas'],                                        area: 'Personas' },
  { id: 'etica_prof',  name: 'Ética Profesional',                     credits: 3,  semester: 8, offering: 'second', prerequisites: ['etica'],                                               area: 'Form. General' },
  { id: 'adm_instal',  name: 'Administración de Instalaciones',       credits: 3,  semester: 8, offering: 'second', prerequisites: ['dis_espacios'],                                        area: 'Operaciones' },
  { id: 'peg8',        name: 'PEG Electivo',                          credits: 3,  semester: 8, offering: 'both',   prerequisites: [],                                                      area: 'Form. General' },

  // ── Semester 9 — Practicum ────────────────────────────────────────
  { id: 'practica',    name: 'Práctica Profesional',                  credits: 30, semester: 9, offering: 'both',   prerequisites: ['creaneg2', 'innov', 'hab_dir'],                        area: 'Práctica', isPracticum: true },
];

export const MAX_CREDITS_PER_SEMESTER = 33;
export const TOTAL_CREDITS = COURSES.reduce((sum, c) => sum + c.credits, 0);

/** Only these courses can be marked as "eximido" (exempted via placement test). */
export const EXEMPTABLE_COURSE_IDS = new Set(['ingles1', 'ingles2']);

/** Courses that should not be paired with each other in the same semester. */
export const DIFFICULT_COURSE_IDS = new Set(['creaneg2']);

export const PRACTICUM_ID = 'practica';
export const PRACTICUM_CREDITS = 30;
/** Minimum non-practicum SCT that must be approved/in-progress before practicum can be scheduled. */
export const PRACTICUM_MIN_SCT = 220;
/** Maximum companion credits allowed in the same semester as practicum (30 + 7 = 37 SCT total). */
export const PRACTICUM_MAX_COMPANION_CREDITS = 7;

export const STRATEGIES = {
  rapida:       { maxSemester: 9,  preferredCredits: 33 },
  equilibrada:  { maxSemester: 12, preferredCredits: 28 },
  tranquila:    { maxSemester: 13, preferredCredits: 26 },
};

export const MAX_EXTRA_SEMESTERS = {
  rapida: 0, equilibrada: 1, tranquila: 3,
};

/** Maps semester index (0-based) to academic year string. */
export const SEMESTER_YEARS = [
  '2025','2025','2026','2026','2027','2027','2028','2028','2029','2029',
  '2030','2030','2031','2031','2032','2032',
];
