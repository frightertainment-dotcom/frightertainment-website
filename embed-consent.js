(() => {
  'use strict';
  document.addEventListener('click', event => {
    const button = event.target.closest('.fr-player-gate__button');
    if (!button) return;
    const gate = button.closest('.fr-player-gate');
    if (!gate || gate.classList.contains('is-loaded')) return;
    const provider = gate.dataset.playerProvider;
    const source = gate.dataset.playerUrl || '';
    let parsed;
    try { parsed = new URL(source); } catch { parsed = null; }
    const apple = provider === 'apple' && parsed?.origin === 'https://embed.podcasts.apple.com' &&
      /^\/gb\/podcast\/id\d+$/.test(parsed.pathname);
    const steam = provider === 'steam' && parsed?.origin === 'https://store.steampowered.com' &&
      /^\/widget\/\d+\/$/.test(parsed.pathname);
    if ((!apple && !steam) || parsed.search || parsed.hash || parsed.username || parsed.password) {
      button.textContent = 'PLAYER UNAVAILABLE'; button.disabled = true; return;
    }
    // A third-party network request is made only after the visitor presses LOAD.
    const frame = document.createElement('iframe');
    frame.className = apple ? 'podcast-player' : 'game-store-widget';
    frame.title = gate.dataset.playerTitle || 'External player';
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.tabIndex = 0;
    if (apple) frame.allow = 'encrypted-media; fullscreen';
    frame.src = source;
    gate.classList.add('is-loaded');
    gate.replaceChildren(frame);
    frame.focus();
  });
})();
