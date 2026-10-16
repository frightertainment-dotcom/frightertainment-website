/* FrightNews: credited original-source links, without rehosting third-party artwork. */
(() => {
  const roots = [...document.querySelectorAll('[data-frightnews]')];
  if (!roots.length) return;
  const el = (tag, cls, value) => {
    const x = document.createElement(tag);
    if (cls) x.className = cls;
    if (value !== undefined) x.textContent = value;
    return x;
  };
  const timeAgo = value => {
    const n = Date.parse(value);
    if (!Number.isFinite(n)) return '';
    const minutes = Math.max(0, Math.floor((Date.now() - n) / 60000));
    if (minutes < 2) return 'JUST NOW';
    if (minutes < 60) return minutes + ' MIN AGO';
    if (minutes < 1440) return Math.floor(minutes / 60) + ' HOURS AGO';
    if (minutes < 10080) return Math.floor(minutes / 1440) + ' DAYS AGO';
    return new Date(n).toLocaleDateString('en-GB').toUpperCase();
  };
  function makeRow(item) {
    let url;
    try { url = new URL(item.url); } catch { return null; }
    if (url.protocol !== 'https:' || !item.title || url.username || url.password) return null;
    const category = String(item.category || 'MOVIE NEWS').slice(0, 40);
    const source = String(item.source || 'Original publisher').slice(0, 80);
    const link = el('a', 'frightnews__row');
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', item.title + ' — ' + source + ' (opens a new tab)');
    const image = el('span', 'frightnews__thumb');
    image.setAttribute('aria-hidden', 'true');
    image.dataset.kind = category.toLowerCase().replace(/[^a-z]+/g, '-');
    image.append(el('span', 'frightnews__thumb-mark', category.includes('TV') ? 'TV' : category.includes('GAME') ? 'GM' : 'FN'));
    const copy = el('span', 'frightnews__copy');
    const meta = el('span', 'frightnews__meta');
    meta.append(el('span', 'frightnews__category', category), el('span', 'frightnews__bullet', ' • '), el('span', 'frightnews__publisher', source));
    const when = el('time', '', timeAgo(item.publishedAt));
    if (Number.isFinite(Date.parse(item.publishedAt))) when.dateTime = item.publishedAt;
    const foot = el('span', 'frightnews__time');
    foot.append(when, el('span', 'frightnews__outlink', 'READ STORY ↗'));
    copy.append(meta, el('strong', 'frightnews__headline', item.title),
      el('span', 'frightnews__excerpt', item.excerpt || 'Read the original publisher report.'), foot);
    link.append(image, copy);
    return link;
  }
  function fail(root) {
    const list = root.querySelector('[data-frightnews-list]');
    const state = root.querySelector('[data-frightnews-state]');
    if (list) list.replaceChildren(el('p', 'frightnews__empty',
      'Latest publisher-linked horror headlines are temporarily unavailable. Please try again shortly.'));
    if (state) state.textContent = 'FEED TEMPORARILY UNAVAILABLE';
  }
  fetch('/api/frightnews', {headers:{accept:'application/json'},cache:'no-store',
    signal:AbortSignal.timeout(13000)})
    .then(r => r.ok ? r.json() : Promise.reject(new Error('News unavailable')))
    .then(data => {
      if (data.status !== 'ok' || !Array.isArray(data.items)) throw Error('Invalid feed');
      const rows = data.items.map(makeRow).filter(Boolean);
      if (!rows.length) throw Error('Empty feed');
      roots.forEach(root => {
        const list = root.querySelector('[data-frightnews-list]');
        const end = root.querySelector('[data-frightnews-end]');
        const state = root.querySelector('[data-frightnews-state]');
        if (!list || !end) return;
        const home = root.dataset.frightnews === 'home';
        let visible = 0;
        const show = () => {
          const until = Math.min(visible + 40, rows.length);
          list.append(...rows.slice(visible, until).map(row => row.cloneNode(true)));
          visible = until;
        };
        list.replaceChildren(); show(); end.replaceChildren(); end.hidden = false;
        if (home) {
          const all = el('a', 'frightnews__all-link', 'VIEW ALL FRIGHTNEWS  →');
          all.href = '/frightnews.html';
          end.append(el('span', 'frightnews__end-note', 'THERE IS ALWAYS MORE IN THE DARK'), all);
        } else if (visible < rows.length) {
          const more = el('button', 'frightnews__load-more', 'SHOW 40 MORE STORIES  ↓');
          more.type = 'button';
          more.addEventListener('click', () => {
            show();
            if (visible >= rows.length) more.replaceWith(el('span', 'frightnews__end-note', 'END OF THE LATEST HEADLINES'));
          });
          end.append(more);
        } else end.append(el('span', 'frightnews__end-note', 'END OF THE LATEST HEADLINES'));
        if (state) state.textContent = rows.length + ' SOURCE-LINKED STORIES · UPDATED ' + timeAgo(data.updatedAt);
      });
    }).catch(() => roots.forEach(fail));
})();