export const AUTH_LOGIN_JS = `
(() => {
  const form = document.getElementById('magic-link-login-form');
  const statusEl = document.getElementById('magic-link-login-status');
  const devLinkEl = document.getElementById('magic-link-dev-link');

  if (!(form instanceof HTMLFormElement) || !(statusEl instanceof HTMLElement) || !(devLinkEl instanceof HTMLElement)) {
    return;
  }

  const setStatus = (text, isError) => {
    statusEl.hidden = false;
    statusEl.textContent = text;
    statusEl.dataset.tone = isError ? 'error' : 'success';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('Sending magic link...', false);
    devLinkEl.textContent = '';
    const data = new FormData(form);
    const tenantIdRaw = data.get('tenantId');
    const emailRaw = data.get('email');
    const nextRaw = data.get('next');
    const tenantId = typeof tenantIdRaw === 'string' ? tenantIdRaw.trim() : '';
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    const next = typeof nextRaw === 'string' ? nextRaw.trim() : '';

    if (tenantId.length === 0 || email.length === 0) {
      setStatus('Tenant ID and email are required.', true);
      return;
    }

    try {
      const response = await fetch('/v1/auth/magic-link/request', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          email,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = payload && typeof payload.error === 'string' ? payload.error : 'Request failed';
        setStatus(detail, true);
        return;
      }

      const deliveryStatus =
        payload && typeof payload.deliveryStatus === 'string'
          ? payload.deliveryStatus
          : 'sent';
      setStatus(
        deliveryStatus === 'sent'
          ? 'Magic link sent. Check your inbox.'
          : deliveryStatus === 'failed'
            ? 'Magic link created, but email delivery failed. Contact support.'
            : 'Magic link created.',
        deliveryStatus === 'failed',
      );

      if (payload && typeof payload.magicLinkUrl === 'string' && payload.magicLinkUrl.length > 0) {
        const url = new URL(payload.magicLinkUrl);
        if (next.length > 0 && next.startsWith('/')) {
          url.searchParams.set('next', next);
        }
        devLinkEl.innerHTML = '<a href="' + url.toString() + '">Open magic link (development helper)</a>';
      }
    } catch {
      setStatus('Unable to request magic link right now.', true);
    }
  });
})();
`;
