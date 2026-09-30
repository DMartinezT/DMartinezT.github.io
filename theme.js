(() => {
  'use strict';
  const key = 'dmt-color-theme';
  const root = document.documentElement;
  const normalize = value => value === 'day' || value === 'night' ? value : null;
  let preference = readPreference();
  let timer;

  function readPreference(fallback = null) {
    try { return normalize(localStorage.getItem(key)); }
    catch { return fallback; }
  }

  function localTheme() {
    // Date uses the visitor's device time zone; no location lookup is needed.
    const hour = new Date().getHours();
    return hour >= 7 && hour < 19 ? 'day' : 'night';
  }

  function refresh() {
    const theme = preference || localTheme();
    const changed = root.dataset.theme !== theme;
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'night' ? '#000000' : '#f7f8fa';

    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const next = theme === 'night' ? 'day' : 'night';
      button.setAttribute('aria-label', `Switch to ${next} mode`);
      button.title = `Switch to ${next} mode`;
      button.querySelector('[data-theme-icon]').textContent = next === 'day' ? '☀︎' : '☾';
      button.querySelector('[data-theme-label]').textContent = next === 'day' ? 'Day' : 'Night';
    });
    document.querySelectorAll('[data-theme-auto]').forEach(button => {
      button.setAttribute('aria-pressed', String(preference === null));
    });
    if (changed) document.dispatchEvent(new Event('themechange'));

    clearTimeout(timer);
    // Check for time/zone changes while visible, with no timer in manual mode.
    if (preference === null && !document.hidden) timer = setTimeout(refresh, 60000);
  }

  function choose(value) {
    preference = value;
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch { /* The switch still works when browser storage is unavailable. */ }
    refresh();
  }

  function initializeControls() {
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => choose(root.dataset.theme === 'night' ? 'day' : 'night'));
    });
    document.querySelectorAll('[data-theme-auto]').forEach(button => {
      button.addEventListener('click', () => choose(null));
    });
    document.querySelectorAll('.theme-controls').forEach(controls => { controls.hidden = false; });
    refresh();
  }

  // This file loads in the head, before styles, to avoid a wrong-theme flash.
  refresh();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeControls, { once: true });
  else initializeControls();

  function resume() {
    preference = readPreference(preference);
    refresh();
  }
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = normalize(event.newValue);
    refresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else resume();
  });
})();
