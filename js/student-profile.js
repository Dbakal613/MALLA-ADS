/**
 * Student profile — persistent layer using localStorage.
 *
 * Stores a single JSON object under PROFILE_KEY.
 * All other modules can read/write the profile through this API
 * without touching raw localStorage directly.
 *
 * Profile shape:
 *   {
 *     name:                   string,
 *     currentSemester:        number | null,   // absolute semester number 1–10
 *     preferredPace:          'rapida' | 'equilibrada' | 'tranquila' | null,
 *     hasCompletedOnboarding: boolean
 *   }
 *
 * NOTE: preferredPace uses the same values as state.js strategy ('rapida',
 * 'equilibrada', 'tranquila') for consistency across the codebase.
 */

const PROFILE_KEY       = 'malla-profile-v1';
const LEGACY_USER_KEY   = 'malla-user-v1';
const LEGACY_STATE_KEY  = 'malla-curricular-v1';
const LEGACY_ONBOARD_KEY = 'malla-onboarding-v1';

// ── Default shape ─────────────────────────────────────────────────────────────

/** @returns {StudentProfile} */
function defaultProfile() {
  return {
    name:                   '',
    currentSemester:        null,
    preferredPace:          null,
    hasCompletedOnboarding: false,
  };
}

// ── In-memory cache ───────────────────────────────────────────────────────────

/** @type {StudentProfile} */
let _profile = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read the profile directly from localStorage (bypasses in-memory cache).
 * Returns a complete profile object with defaults for any missing fields.
 * @returns {StudentProfile}
 */
export function getStudentProfileFromStorage() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch (_) { /* corrupt JSON — return defaults */ }
  return defaultProfile();
}

/**
 * Write a complete profile object to localStorage.
 * @param {StudentProfile} profile
 */
export function saveStudentProfileToStorage(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (_) { /* storage full — degrade gracefully */ }
}

/**
 * Remove the profile from localStorage and reset the in-memory cache.
 * After this call, getStudentProfile() returns a blank default profile.
 */
export function clearStudentProfile() {
  try { localStorage.removeItem(PROFILE_KEY); } catch (_) {}
  _profile = defaultProfile();
}

/**
 * Merge a partial update into the current profile and persist.
 * Existing fields not included in `partial` are preserved.
 *
 * @param {Partial<StudentProfile>} partial
 * @returns {StudentProfile} the updated profile (a copy)
 */
export function updateStudentProfile(partial) {
  _profile = { ..._profile, ...partial };
  saveStudentProfileToStorage(_profile);
  return { ..._profile };
}

/**
 * Return the current in-memory profile without re-reading localStorage.
 * This is the fast path for reads during a session.
 * @returns {StudentProfile} a copy of the current profile
 */
export function getStudentProfile() {
  return { ..._profile };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Runs once when the module is first imported.
// Priority: malla-profile-v1 > migration from legacy keys > defaults.

(function _init() {
  // 1. Try to load from the new key.
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) {
    try {
      _profile = { ...defaultProfile(), ...JSON.parse(raw) };
      return;
    } catch (_) { /* corrupt — fall through to migration */ }
  }

  // 2. One-time migration from legacy localStorage keys.
  //    This ensures existing users don't lose their name, semester, or pace.
  const migrated = defaultProfile();

  try {
    const user = JSON.parse(localStorage.getItem(LEGACY_USER_KEY) || '{}');
    if (typeof user.name === 'string' && user.name.trim())
      migrated.name = user.name.trim();
    if (user.pace)
      migrated.preferredPace = user.pace;
  } catch (_) {}

  try {
    const state = JSON.parse(localStorage.getItem(LEGACY_STATE_KEY) || '{}');
    if (state.currentYear != null && state.semesterOfYear != null)
      migrated.currentSemester = (Number(state.currentYear) - 1) * 2 + Number(state.semesterOfYear);
    // state.strategy takes precedence over onboarding pace if both exist.
    if (state.strategy)
      migrated.preferredPace = state.strategy;
  } catch (_) {}

  try {
    if (localStorage.getItem(LEGACY_ONBOARD_KEY))
      migrated.hasCompletedOnboarding = true;
  } catch (_) {}

  _profile = migrated;

  // Persist the migrated profile only if there is actual data to save,
  // so we don't create a blank entry for brand-new visitors.
  if (migrated.name || migrated.currentSemester || migrated.preferredPace) {
    saveStudentProfileToStorage(migrated);
  }
})();
