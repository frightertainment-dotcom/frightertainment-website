/*
 * Frightertainment AFTER DARK — ambient scene enhancement.
 * Progressive, decorative only. Never delays, replaces, or fetches content.
 * Slow opacity/transform layers, stopped when reduced motion is requested.
 */
(() => {
  'use strict';
  const body = document.body;
  if (!body || !body.classList.contains('fr-v5')) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = '.hub-page-intro, .fr-home-intro, .editorial-pick, .fr-cinema-concept__region, .hub-showcase__lead>.hub-feature';
  const span = className => {
    const node = document.createElement('span');
    node.className = 'fr-atmosphere__' + className;
    node.setAttribute('aria-hidden', 'true');
    return node;
  };
  const enhance = () => {
    for (const scene of document.querySelectorAll(scenes)) {
      if (scene.querySelector(':scope > .fr-atmosphere')) continue;
      const atmosphere = document.createElement('div');
      atmosphere.className = 'fr-atmosphere';
      atmosphere.setAttribute('aria-hidden', 'true');
      atmosphere.append(span('veil'), span('mist'), span('beam'), span('particles'));
      scene.append(atmosphere);
    }
  };

  const syncPreference = () => body.classList.toggle('fr-motion-paused', motion.matches);
  const setupMotionControl = () => {
    if (motion.matches || document.querySelector('.fr-motion-toggle')) return;
    const host = document.querySelector('.hub-footer .footer__bottom') || document.querySelector('.hub-footer');
    if (!host) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fr-motion-toggle';
    button.setAttribute('aria-label', 'Pause atmospheric visual effects');
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'PAUSE ATMOSPHERE';
    button.addEventListener('click', () => {
      const paused = body.classList.toggle('fr-motion-paused');
      button.setAttribute('aria-pressed', String(paused));
      button.setAttribute('aria-label', paused ? 'Resume atmospheric visual effects' : 'Pause atmospheric visual effects');
      button.textContent = paused ? 'RESUME ATMOSPHERE' : 'PAUSE ATMOSPHERE';
    });
    host.append(button);
  };
  const start = () => {
    syncPreference();
    enhance();
    setupMotionControl();
    const root = document.querySelector('main');
    if (root) {
      const observer = new MutationObserver(enhance);
      observer.observe(root, {childList:true,subtree:true});
      window.addEventListener('pagehide', () => observer.disconnect(), {once:true});
    }
  };
  motion.addEventListener?.('change', syncPreference);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
