const SEEN_KEY = 'malla-onboarding-v1';

export function initOnboarding() {
  if (localStorage.getItem(SEEN_KEY)) return;
  document.getElementById('onboarding-modal').classList.add('modal-overlay--open');
}

export function closeOnboarding() {
  document.getElementById('onboarding-modal').classList.remove('modal-overlay--open');
  localStorage.setItem(SEEN_KEY, '1');
}
