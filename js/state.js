/**
 * Single source of truth for all mutable application state.
 * All mutations go through exported setters so callers never touch raw state.
 * State is persisted to localStorage on every mutation.
 */

const STORAGE_KEY = 'malla-curricular-v1';

/** @type {Record<string, string>} courseId → status */
let courseStatuses = {};

/** @type {Record<string, number>} courseId → semester number (user overrides via drag) */
let semesterOverrides = {};

/** @type {Set<string>} course IDs the user chose to skip this semester */
let postponedCourses = new Set();

/** @type {'rapida'|'equilibrada'|'tranquila'} */
let strategy = 'equilibrada';

/** @type {Set<number>} semester numbers where the user requested +1 SCT extension (33 → 34 SCT) */
let extendedSemesters = new Set();

/** @type {number|null} 1–5 */
let currentYear = null;

/** @type {number|null} 1 | 2 */
let semesterOfYear = null;

// ── Persistence ───────────────────────────────────────────────────────────────

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      courseStatuses,
      semesterOverrides,
      postponedCourses: [...postponedCourses],
      extendedSemesters: [...extendedSemesters],
      strategy,
      currentYear,
      semesterOfYear,
    }));
  } catch (_) { /* storage full or unavailable — degrade gracefully */ }
}

// Load saved state immediately when the module is first imported.
(function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.courseStatuses    && typeof d.courseStatuses === 'object')
      courseStatuses    = d.courseStatuses;
    if (d.semesterOverrides && typeof d.semesterOverrides === 'object')
      semesterOverrides = d.semesterOverrides;
    if (Array.isArray(d.postponedCourses))
      postponedCourses  = new Set(d.postponedCourses);
    if (Array.isArray(d.extendedSemesters))
      extendedSemesters = new Set(d.extendedSemesters.map(Number));
    if (d.strategy)
      strategy          = d.strategy;
    if (d.currentYear    != null) currentYear    = d.currentYear;
    if (d.semesterOfYear != null) semesterOfYear = d.semesterOfYear;
  } catch (_) { /* corrupt data — start fresh */ }
})();

// ── Getters ──────────────────────────────────────────────────────────────────

export const getStrategy        = ()  => strategy;
export const getCurrentYear     = ()  => currentYear;
export const getSemesterOfYear  = ()  => semesterOfYear;
export const isPostponed        = (id)=> postponedCourses.has(id);

export const getCourseStatus = (id) => courseStatuses[id] ?? 'pendiente';

export const getCurrentSemesterNumber = () =>
  currentYear && semesterOfYear ? (currentYear - 1) * 2 + semesterOfYear : null;

/** courseIds whose status is one of the given statuses */
const idsWithStatus = (...statuses) =>
  new Set(Object.entries(courseStatuses).filter(([, s]) => statuses.includes(s)).map(([id]) => id));

/** Courses effectively "passed" — unlock prerequisites for dependents. */
export const getApproved        = () => idsWithStatus('aprobado', 'adelantado', 'eximido', 'convalidado');
export const getFailed          = () => idsWithStatus('reprobado');
export const getNotTaken        = () => idsWithStatus('no-tomado');
export const getCurrentlyStudying = () => idsWithStatus('cursando');
export const getPostponed       = () => new Set(postponedCourses);

export const getSemesterOverride   = (id)  => semesterOverrides[id] ?? null;
export const getAllOverrides       = ()     => ({ ...semesterOverrides });
export const isExtendedSemester   = (sem)  => extendedSemesters.has(sem);
export const getAllExtensions      = ()     => new Set(extendedSemesters);

// ── Setters ──────────────────────────────────────────────────────────────────

export const setCourseStatus = (id, status) => {
  if (status === 'pendiente') {
    delete courseStatuses[id];
  } else {
    courseStatuses[id] = status;
  }
  postponedCourses.delete(id);
  save();
};

export const setSemesterOverride = (id, semester) => {
  semesterOverrides[id] = semester;
  save();
};

export const postponeCourse = (id) => { postponedCourses.add(id);    save(); };
export const resumeCourse   = (id) => { postponedCourses.delete(id); save(); };

export const toggleSemesterExtension = (sem) => {
  const s = Number(sem);
  if (extendedSemesters.has(s)) extendedSemesters.delete(s);
  else extendedSemesters.add(s);
  save();
};

export const setStrategy = (s) => { strategy = s; save(); };

export const setCurrentSemester = (year, semOfYear) => {
  currentYear    = year;
  semesterOfYear = semOfYear;
  save();
};

export const resetAll = () => {
  courseStatuses    = {};
  semesterOverrides = {};
  postponedCourses  = new Set();
  extendedSemesters = new Set();
  strategy          = 'equilibrada';
  currentYear       = null;
  semesterOfYear    = null;
  save();
};

export const getStateSnapshot = () => JSON.stringify({
  courseStatuses,
  semesterOverrides,
  postponedCourses:  [...postponedCourses],
  extendedSemesters: [...extendedSemesters],
  strategy,
  currentYear,
  semesterOfYear,
});

export const restoreStateSnapshot = (json) => {
  try {
    const d           = JSON.parse(json);
    courseStatuses    = d.courseStatuses    ?? {};
    semesterOverrides = d.semesterOverrides ?? {};
    postponedCourses  = new Set(Array.isArray(d.postponedCourses)  ? d.postponedCourses  : []);
    extendedSemesters = new Set(Array.isArray(d.extendedSemesters) ? d.extendedSemesters.map(Number) : []);
    strategy          = d.strategy      ?? 'equilibrada';
    currentYear       = d.currentYear   ?? null;
    semesterOfYear    = d.semesterOfYear ?? null;
    save();
  } catch (_) {}
};
