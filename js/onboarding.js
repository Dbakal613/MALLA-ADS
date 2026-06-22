import { getStudentProfile } from './student-profile.js';

const SEEN_KEY = 'malla-onboarding-v1';
const USER_KEY = 'malla-user-v1';

export function getUserName() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || '{}').name || ''; }
  catch { return ''; }
}

export function getUserPace() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || '{}').pace || ''; }
  catch { return ''; }
}

export function saveUser(name, pace) {
  localStorage.setItem(USER_KEY, JSON.stringify({ name: name.trim(), pace }));
}

export function hasUser() {
  return !!(getUserName());
}

export function initOnboarding() {
  const profile = getStudentProfile();
  if (!profile.hasCompletedOnboarding) {
    document.getElementById('welcome-modal').classList.add('modal-overlay--open');
  }
}

export function closeOnboarding() {
  document.getElementById('onboarding-modal').classList.remove('modal-overlay--open');
  localStorage.setItem(SEEN_KEY, '1');
}

export function clearUserData() {
  try { localStorage.removeItem(USER_KEY); }  catch(_) {}
  try { localStorage.removeItem(SEEN_KEY); }  catch(_) {}
}
