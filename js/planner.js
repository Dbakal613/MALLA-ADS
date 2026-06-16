/**
 * Planning algorithm.
 *
 * Given current state, calculates which courses should go in each future semester.
 * Returns { recommended: Set<id>, plan: { semNumber: id[] } }
 *
 * Key design decisions:
 *  - earliestAvailable is the true topological minimum (prereq chain + offering period),
 *    NOT the default curriculum semester. This allows courses to be taken as soon as
 *    constraints permit.
 *  - rapida: greedy critical-path fill, extends semesters until every course is placed.
 *  - equilibrada/tranquila: soft credit cap, extend by maxExtra if needed.
 *  - Practicum (30 SCT) is placed after simulation; displaced courses are bumped forward.
 *  - Fallback guarantees every non-practicum course is scheduled (rule #1: finish the degree).
 */

import {
  COURSES, STRATEGIES, MAX_EXTRA_SEMESTERS,
  DIFFICULT_COURSE_IDS, PRACTICUM_ID, PRACTICUM_CREDITS,
  PRACTICUM_MIN_SCT, PRACTICUM_MAX_COMPANION_CREDITS,
} from './data.js';
import {
  getApproved, getFailed, getNotTaken, getCurrentlyStudying,
  getCurrentSemesterNumber, getStrategy, getPostponed, getAllOverrides, getCourseStatus,
  isExtendedSemester,
} from './state.js';

// ── Pure helpers ──────────────────────────────────────────────────────────────

export const getCourseById = (id) => COURSES.find(c => c.id === id);

/** Returns 'first' for odd semesters, 'second' for even. */
export const getSemesterParity = (semNumber) => semNumber % 2 === 1 ? 'first' : 'second';

/** Semester number respecting user drag overrides. */
export const getEffectiveSemester = (id) => {
  const overrides = getAllOverrides();
  return overrides[id] ?? getCourseById(id)?.semester;
};

/**
 * Groups all courses by their effective semester (respecting user overrides).
 * Exported so app.js can use it for the mark-semester action.
 */
export const buildSemMap = () => {
  const overrides = getAllOverrides();
  const map = {};
  COURSES.forEach(c => {
    const s = overrides[c.id] ?? c.semester;
    map[s] = map[s] ?? [];
    map[s].push(c.id);
  });
  return map;
};

/**
 * Blocked courses = any course whose prerequisite chain includes a failed or
 * not-taken course (computed transitively).
 */
export const getBlocked = () => {
  const blocked = new Set();
  const problematic = new Set([...getFailed(), ...getNotTaken()]);
  const approved    = getApproved();

  const blockTransitively = (id) => {
    COURSES.forEach(course => {
      if (course.prerequisites.includes(id) && !blocked.has(course.id)) {
        // If the course is already approved it is not blocked, and its dependents
        // are not blocked through this path — approved courses break the chain.
        if (approved.has(course.id)) return;
        blocked.add(course.id);
        blockTransitively(course.id);
      }
    });
  };

  problematic.forEach(blockTransitively);
  return blocked;
};

/**
 * Next semester (≥ current) where a failed/not-taken course can be retaken,
 * respecting its offering period.
 */
export const getRetakeSemester = (id) => {
  const course = getCourseById(id);
  if (!course) return null;
  const currentSem = getCurrentSemesterNumber() ?? 0;
  const earliest   = Math.max(getEffectiveSemester(id) + 1, currentSem + 1);
  for (let s = earliest; s <= 20; s++) {
    if (course.offering === 'both' || getSemesterParity(s) === course.offering) return s;
  }
  return null;
};

// ── Planner ───────────────────────────────────────────────────────────────────

export const calculatePlan = () => {
  const currentSem = getCurrentSemesterNumber();
  if (!currentSem) return { recommended: new Set(), plan: {} };

  const nextSem   = currentSem + 1;
  const approved  = getApproved();
  const studying  = getCurrentlyStudying();
  const strategy  = getStrategy();
  const postponed = getPostponed();
  const overrides = getAllOverrides();
  const { maxSemester, preferredCredits } = STRATEGIES[strategy];

  // ── Dependency helpers ─────────────────────────────────────────────────────

  // How many future pending courses (transitively) depend on this course.
  const countDependents = (id) => {
    let count = 0;
    const visit = (x) => COURSES.forEach(r => {
      if (r.prerequisites.includes(x) && !approved.has(r.id)) { count++; visit(r.id); }
    });
    visit(id);
    return count;
  };

  // ── Earliest available (topological) ──────────────────────────────────────
  //
  // For each pending course, the earliest semester it can be taken is determined
  // solely by:
  //   1. User drag override (hard anchor)
  //   2. Retake window for reprobado/no-tomado courses
  //   3. nextSem, adjusted to the correct offering period
  //
  // The default curriculum semester is NOT used as a floor — courses can be
  // advanced as soon as prerequisites permit. Prerequisite ordering is enforced
  // inside isEligible() via approvedAccumulated.

  const earliestAvailable = {};
  COURSES.forEach(course => {
    if (approved.has(course.id) || course.isPracticum) return;
    const status = getCourseStatus(course.id);
    if (status === 'cursando') return;

    let earliest;
    if (overrides[course.id]) {
      earliest = Math.max(overrides[course.id], nextSem);
    } else if (status === 'reprobado' || status === 'no-tomado') {
      earliest = getRetakeSemester(course.id) ?? nextSem;
    } else {
      // No artificial floor — start from nextSem, adjust for offering period.
      earliest = nextSem;
    }

    // Respect offering period (skip to next valid semester if needed).
    if (course.offering !== 'both' && !overrides[course.id]) {
      while (getSemesterParity(earliest) !== course.offering) {
        earliest++;
      }
    }

    earliestAvailable[course.id] = earliest;
  });

  // ── Simulation ─────────────────────────────────────────────────────────────

  function simulate(semLimit) {
    const plan                = {};
    // Start with all already-approved + currently-studying courses as "done".
    const approvedAccumulated = new Set([...approved, ...studying]);
    const scheduled           = new Set();

    for (let s = nextSem; s <= semLimit; s++) {
      const parity  = getSemesterParity(s);
      const hardCap = 33 + (isExtendedSemester(s) ? 1 : 0);

      const isEligible = (c) => {
        if (approved.has(c.id) || c.isPracticum || scheduled.has(c.id) || studying.has(c.id)) return false;
        const sd = earliestAvailable[c.id];
        if (sd === undefined || sd > s) return false;
        // Hard pin: if the user manually dragged this course to a future semester,
        // only allow it in that exact semester so it stays where they put it.
        if (overrides[c.id] && overrides[c.id] >= nextSem && s !== overrides[c.id]) return false;
        if (c.offering !== 'both' && c.offering !== parity) return false;
        if (postponed.has(c.id) && s === nextSem) return false;
        return c.prerequisites.every(p => approvedAccumulated.has(p));
      };

      const fitsInSemester = (c, usedCredits, coursesInSem) => {
        if (usedCredits + c.credits > hardCap) return false;
        if (strategy === 'tranquila') {
          const heavyCount = coursesInSem.filter(id => (getCourseById(id)?.credits ?? 0) >= 5).length;
          if (c.credits >= 5 && heavyCount >= 2) return false;
          if (countDependents(c.id) < 2 && usedCredits + c.credits > preferredCredits) return false;
          if (DIFFICULT_COURSE_IDS.has(c.id) && coursesInSem.some(id => DIFFICULT_COURSE_IDS.has(id))) return false;
        } else if (strategy === 'equilibrada') {
          if (countDependents(c.id) < 2 && usedCredits + c.credits > preferredCredits) return false;
        }
        // rapida: no soft cap — fill up to hardCap (33 SCT).
        return true;
      };

      // Sort: most dependents first (critical path), then heaviest courses.
      const candidates = COURSES.filter(isEligible)
        .sort((a, b) => countDependents(b.id) - countDependents(a.id) || b.credits - a.credits);

      const coursesInSem = [];
      let usedCredits    = 0;

      for (const c of candidates) {
        if (!fitsInSemester(c, usedCredits, coursesInSem)) continue;
        coursesInSem.push(c.id);
        usedCredits += c.credits;
        scheduled.add(c.id);
      }

      // Anti-lone-course: when only 1 course was placed, try to add a companion.
      if (coursesInSem.length === 1) {
        COURSES
          .filter(c => isEligible(c) && !coursesInSem.includes(c.id))
          .sort((a, b) => b.credits - a.credits)
          .forEach(c => {
            if (!fitsInSemester(c, usedCredits, coursesInSem)) return;
            coursesInSem.push(c.id);
            usedCredits += c.credits;
            scheduled.add(c.id);
          });
      }

      // Accumulate so subsequent semesters see these as approved.
      coursesInSem.forEach(id => approvedAccumulated.add(id));
      if (coursesInSem.length > 0) plan[s] = coursesInSem;
    }

    return { plan, scheduled, approvedAccumulated };
  }

  // ── Total pending (used to determine if extension is needed) ───────────────

  const totalPending = Object.keys(earliestAvailable).length;

  // ── Run simulation, extend until all courses are scheduled ─────────────────

  let { plan, scheduled, approvedAccumulated } = simulate(maxSemester);

  if (strategy === 'rapida') {
    // rapida: keep extending until every course is placed (no fixed cap).
    // This guarantees the degree finishes, adding semesters only when truly needed.
    let semLimit = maxSemester;
    while (scheduled.size < totalPending && semLimit < nextSem + 30) {
      semLimit++;
      const result = simulate(semLimit);
      plan                = result.plan;
      scheduled           = result.scheduled;
      approvedAccumulated = result.approvedAccumulated;
    }
  } else {
    // equilibrada / tranquila: try up to maxExtra additional semesters.
    const maxExtra = MAX_EXTRA_SEMESTERS[strategy];
    if (scheduled.size < totalPending) {
      for (let extra = 1; extra <= maxExtra; extra++) {
        const prev   = scheduled.size;
        const result = simulate(maxSemester + extra);
        plan                = result.plan;
        scheduled           = result.scheduled;
        approvedAccumulated = result.approvedAccumulated;
        if (result.scheduled.size >= totalPending || result.scheduled.size === prev) break;
      }
    }
  }

  // ── Absolute fallback: guarantee every course gets a slot ──────────────────
  //
  // If anything is still unscheduled (extreme edge cases or very tight offerings),
  // force-place it in the first semester that fits within 33 SCT, regardless of
  // strategy soft caps.  This upholds rule #1: the degree must always be completable.

  COURSES
    .filter(c => {
      if (approved.has(c.id) || c.isPracticum || getCourseStatus(c.id) === 'cursando') return false;
      return earliestAvailable.hasOwnProperty(c.id) && !scheduled.has(c.id);
    })
    .sort((a, b) => countDependents(b.id) - countDependents(a.id) || b.credits - a.credits)
    .forEach(c => {
      // Hard-pinned course: respect the override instead of drifting to another semester.
      // Without this guard, the fallback would place the course wherever credits fit,
      // creating a mismatch between semMap[override] and planMap[fallback_sem] → duplication.
      if (overrides[c.id] && overrides[c.id] >= nextSem) {
        const s = overrides[c.id];
        if (c.offering === 'both' || getSemesterParity(s) === c.offering) {
          plan[s] = plan[s] ?? [];
          if (!plan[s].includes(c.id)) plan[s].push(c.id);
          scheduled.add(c.id);
        }
        return;
      }
      const start = earliestAvailable[c.id];
      for (let s = start; s <= start + 30; s++) {
        if (c.offering !== 'both' && getSemesterParity(s) !== c.offering) continue;
        const semCredits = (plan[s] ?? []).reduce(
          (sum, id) => sum + (getCourseById(id)?.credits ?? 0), 0
        );
        if (semCredits + c.credits <= 33) {
          plan[s] = plan[s] ?? [];
          plan[s].push(c.id);
          scheduled.add(c.id);
          break;
        }
      }
      if (!scheduled.has(c.id)) {
        console.warn('[planner] Could not schedule', c.id, '— curriculum may have irresolvable credit conflicts');
      }
    });

  // ── Compaction (rapida only): pull courses earlier to minimize semesters ─────
  //
  // After the greedy simulation, iterate the last planned semester and try to
  // move each course into an earlier semester.  Repeat until nothing moves —
  // this can eliminate one or more trailing semesters entirely.

  if (strategy === 'rapida') {
    let compacted = true;
    while (compacted) {
      compacted = false;
      const planSems = Object.keys(plan).map(Number).sort((a, b) => a - b);
      if (planSems.length < 2) break;
      const lastSem = planSems[planSems.length - 1];

      for (const id of [...(plan[lastSem] ?? [])]) {
        const c = getCourseById(id);
        if (!c || c.isPracticum) continue;
        const ea = earliestAvailable[id];
        if (ea === undefined) continue;

        for (let t = ea; t < lastSem; t++) {
          if (c.offering !== 'both' && getSemesterParity(t) !== c.offering) continue;

          const prereqsMet = c.prerequisites.every(p => {
            if (approved.has(p) || studying.has(p)) return true;
            return planSems.some(s => s < t && (plan[s] ?? []).includes(p));
          });
          if (!prereqsMet) continue;

          const tCredits = (plan[t] ?? []).reduce(
            (sum, rid) => sum + (getCourseById(rid)?.credits ?? 0), 0
          );
          const tCap = 33 + (isExtendedSemester(t) ? 1 : 0);
          if (tCredits + c.credits > tCap) continue;

          plan[t] = [...(plan[t] ?? []), id];
          plan[lastSem] = plan[lastSem].filter(x => x !== id);
          if (plan[lastSem].length === 0) delete plan[lastSem];
          compacted = true;
          break;
        }
      }
    }
  }

  // ── Place practicum (30 SCT) ───────────────────────────────────────────────
  //
  // The practicum is handled after simulation because its 30 SCT take up almost
  // an entire semester.  We find the first semester ≥ nextSem where all its
  // prerequisites are cumulatively satisfied by the plan, then:
  //   - Insert it at the start of that semester.
  //   - Keep only companions ≤ 7 SCT (PRACTICUM_MAX_COMPANION_CREDITS).
  //   - Bump displaced courses to the nearest subsequent fitting semester.

  const practicum = getCourseById(PRACTICUM_ID);
  if (practicum && !approved.has(PRACTICUM_ID) && getCourseStatus(PRACTICUM_ID) !== 'cursando') {
    const plannedSems = Object.keys(plan).map(Number).sort((a, b) => a - b);

    for (let s = nextSem; s <= nextSem + 20; s++) {
      // Build the set of courses approved up to (but not including) semester s.
      const approvedUntil = new Set([...approved, ...studying]);
      plannedSems.forEach(ps => {
        if (ps < s) (plan[ps] ?? []).forEach(id => approvedUntil.add(id));
      });

      if (!practicum.prerequisites.every(p => approvedUntil.has(p))) continue;

      // Check accumulated non-practicum SCT ≥ PRACTICUM_MIN_SCT (220).
      const approvedUntilCredits = [...approvedUntil].reduce((sum, id) => {
        const c = getCourseById(id);
        return c && !c.isPracticum ? sum + c.credits : sum;
      }, 0);
      if (approvedUntilCredits < PRACTICUM_MIN_SCT) continue;

      // Found the first valid semester.
      plan[s] = plan[s] ?? [];
      plan[s].unshift(PRACTICUM_ID);

      // Keep companions that fit within PRACTICUM_MAX_COMPANION_CREDITS (7 SCT).
      const allowed        = [PRACTICUM_ID];
      let   remaining      = PRACTICUM_MAX_COMPANION_CREDITS;
      plan[s]
        .filter(id => id !== PRACTICUM_ID)
        .forEach(id => {
          const c = getCourseById(id);
          if (c && c.credits <= remaining) { allowed.push(id); remaining -= c.credits; }
        });

      // Displaced companions get bumped to subsequent semesters.
      const displaced = plan[s].filter(id => !allowed.includes(id));
      plan[s] = allowed;

      displaced.forEach(id => {
        const c = getCourseById(id);
        if (!c) return;
        for (let s2 = s + 1; s2 <= s + 15; s2++) {
          if (c.offering !== 'both' && getSemesterParity(s2) !== c.offering) continue;
          const s2Credits = (plan[s2] ?? [])
            .reduce((sum, rid) => sum + (getCourseById(rid)?.credits ?? 0), 0);
          if (s2Credits + c.credits <= 33) {
            plan[s2] = plan[s2] ?? [];
            plan[s2].push(id);
            break;
          }
        }
      });

      break;
    }
  }

  const recommended = new Set((plan[nextSem] ?? []).filter(id => id !== PRACTICUM_ID));
  return { recommended, plan };
};

export const safeCalculatePlan = () => {
  try { return calculatePlan(); }
  catch (e) { console.error('calculatePlan error:', e); return { recommended: new Set(), plan: {} }; }
};
