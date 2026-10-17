/* FrightWatch private preview: no demo catalogue, no fake watch actions. */
(() => {
  'use strict';
  const link = document.querySelector('.fw-nav a[href="#movies"]');
  const movies = document.querySelector('#movies');
  if (!link || !movies || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) link.setAttribute('aria-current', 'page');
  }, {rootMargin: '-40% 0px -40% 0px'});
  observer.observe(movies);
})();
