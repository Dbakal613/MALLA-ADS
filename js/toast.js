/** Lightweight toast notification utility. */

const DURATION = { error: 4500, warning: 3500, default: 2200 };

let dismissTimer = null;

/**
 * @param {string} message
 * @param {'error'|'warning'|'success'|''} type
 */
export function showToast(message, type = '') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className   = 'toast' + (type ? ` toast--${type}` : '');

  // Force reflow so the CSS transition fires even if toast was already visible.
  void el.offsetWidth;
  el.classList.add('toast--visible');

  clearTimeout(dismissTimer);
  const duration = type === 'error' ? DURATION.error : type === 'warning' ? DURATION.warning : DURATION.default;
  dismissTimer   = setTimeout(() => el.classList.remove('toast--visible'), duration);
}
