(() => {
  'use strict';
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#contact-status');
  if (!form || !status) return;
  const emailLink = fields => {
    const text = 'From: ' + fields.title + '\nReply email: ' + fields.email + '\n\n' + fields.message;
    return 'mailto:Frightertainment@gmail.com?subject=' + encodeURIComponent(fields.subject) + '&body=' + encodeURIComponent(text);
  };
  const errorReference = value => typeof value === 'string' && /^FT-[A-Z0-9-]{1,50}$/.test(value) ? value : null;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form));
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    status.replaceChildren(document.createTextNode('Sending your message…'));
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(fields)
      });
      const responseType = (response.headers.get('content-type') || '').toLowerCase();
      if (!responseType.includes('application/json')) {
        throw new Error(response.redirected ? 'FT-AUTH-REDIRECT' : 'FT-NONJSON-' + response.status);
      }
      let result;
      try { result = await response.json(); }
      catch { throw new Error('FT-INVALID-RESPONSE-' + response.status); }
      if (!response.ok || result?.ok !== true || result?.delivered !== true) {
        throw new Error(errorReference(result?.code) || 'FT-HTTP-' + response.status + (response.ok ? '-UNCONFIRMED' : ''));
      }
      form.reset();
      status.textContent = 'Your message has been accepted for delivery. Thank you for getting in touch!';
    } catch (error) {
      const reference = errorReference(error?.message) || 'FT-NETWORK';
      status.replaceChildren(document.createTextNode('The form could not confirm delivery. Your message has not been marked as sent. '));
      const link = document.createElement('a');
      link.href = emailLink(fields);
      link.textContent = 'Open your email app with your message ready';
      status.append(link, document.createTextNode(' — your form text is still here if you want to copy it. Reference: ' + reference + '.'));
    } finally {
      submit.disabled = false;
    }
  });
})();
