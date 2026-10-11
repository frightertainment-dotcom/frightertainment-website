(() => {
  'use strict';
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#contact-status');
  if (!form || !status) return;
  const errorReference = value => typeof value === 'string' && /^FT-[A-Z0-9-]{1,50}$/.test(value) ? value : null;
  const emailLink = fields => {
    const text = 'Nickname: ' + (fields.nickname.trim() || 'Anonymous') + '\n\n' + fields.message;
    return 'mailto:Frightertainment@gmail.com?subject=' +
      encodeURIComponent('Frightertainment direct enquiry') + '&body=' + encodeURIComponent(text);
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const fields = {
      nickname: String(values.get('nickname') || ''),
      message: String(values.get('message') || ''),
      ft_trap_blank: String(values.get('ft_trap_blank') || '')
    };
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    status.textContent = 'Sending your private message…';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'content-type': 'application/json', accept: 'application/json'},
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
        throw new Error(errorReference(result?.code) || 'FT-HTTP-' + response.status +
          (response.ok ? '-UNCONFIRMED' : ''));
      }
      form.reset();
      status.textContent = 'Your message has been accepted for delivery. Thank you! No reply is possible through this form.';
    } catch (error) {
      const reference = errorReference(error?.message) || 'FT-NETWORK';
      status.replaceChildren(document.createTextNode(
        'The form could not confirm delivery. Your message has not been marked as sent. '));
      const link = document.createElement('a');
      link.href = emailLink(fields);
      link.textContent = 'Use your email app instead';
      status.append(link, document.createTextNode(
        ' (this reveals your sender email address). Your message is still in the form. Reference: ' +
        reference + '.'));
    } finally {
      submit.disabled = false;
    }
  });
})();
