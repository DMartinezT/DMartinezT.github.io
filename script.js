(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phrases = [...document.querySelectorAll('.typed-phrase')];
  let timer;

  function completeIntro() {
    clearTimeout(timer);
    for (const phrase of phrases) {
      phrase.textContent = phrase.dataset.phrase;
      phrase.classList.remove('is-typing');
      phrase.parentElement.classList.remove('is-pending');
    }
  }

  // Append each item once. Previously completed items are never cleared or hidden.
  function revealPhrase(index = 0, character = 0) {
    if (motion.matches || document.hidden) return completeIntro();
    const phrase = phrases[index];
    if (!phrase) return;
    phrase.parentElement.classList.remove('is-pending');
    phrase.classList.add('is-typing');
    phrase.textContent = phrase.dataset.phrase.slice(0, character);
    if (character < phrase.dataset.phrase.length) {
      timer = setTimeout(() => revealPhrase(index, character + 1), 29);
    } else {
      phrase.classList.remove('is-typing');
      timer = setTimeout(() => revealPhrase(index + 1), 210);
    }
  }

  if (!motion.matches && !document.hidden) {
    for (const phrase of phrases) {
      phrase.textContent = '';
      phrase.parentElement.classList.add('is-pending');
    }
    timer = setTimeout(revealPhrase, 280);
  }
  motion.addEventListener('change', completeIntro);
  document.addEventListener('visibilitychange', () => { if (document.hidden) completeIntro(); });

  const menuButton = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('#main-navigation');
  const smallScreen = window.matchMedia('(max-width: 700px)');
  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  smallScreen.addEventListener('change', closeMenu);
  document.documentElement.classList.add('js-nav');

  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.navigation a[href^="#"]')];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
  }
})();
