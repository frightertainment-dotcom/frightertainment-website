/* A date-safe Home excerpt of the source-checked UK cinema diary. */
(() => {
  const note = document.querySelector('.fr-home-cinema-note');
  if (!note) return;
  const heading = note.querySelector('h3');
  const description = note.querySelector('p');
  const source = note.querySelector('.fr-home-cinema-note__source');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  fetch('/data/cinema-screenings.json')
    .then(response => {
      if (!response.ok) throw new Error('Cinema diary unavailable');
      return response.json();
    })
    .then(data => {
      const sourceURL = value => {
        try {
          const url = new URL(value);
          return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
        } catch { return ''; }
      };
      const candidates = (data?.territories?.GB?.screenings || []).filter(item => {
        if (!item || typeof item.title !== 'string' || !item.title.trim() ||
            typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || item.date < today ||
            !['general', 'limited'].includes(item.reach) ||
            ['disputed', 'provisional'].includes(item.dateConfidence)) return false;
        return Boolean(sourceURL(item.sourceUrl));
      });
      // Match the diary's month-first, confirmed studio/special/indie policy.
      const priority = item => ({ studio: 0, special: 1, independent: 2 })[item.tier] ?? 3;
      candidates.sort((a, b) => a.date.slice(0, 7).localeCompare(b.date.slice(0, 7)) ||
        priority(a) - priority(b) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
      const item = candidates[0];
      if (!item) return; // The evergreen, useful no-JS copy stays honest.
      const date = new Date(item.date + 'T12:00:00Z');
      if (Number.isNaN(date.getTime())) return;
      const shown = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric'
      }).format(date);
      heading.textContent = item.title;
      description.textContent = item.reach === 'general'
        ? `UK cinema release from ${shown}. Check local listings.`
        : `Selected UK screenings from ${shown}. Check your venue.`;
      source.href = sourceURL(item.sourceUrl);
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      source.setAttribute('aria-label', 'Release source for ' + item.title);
      source.hidden = false;
      note.dataset.screeningId = item.id || '';
    })
    .catch(() => { /* Keep the evergreen diary link when the source is unavailable. */ });
})();
