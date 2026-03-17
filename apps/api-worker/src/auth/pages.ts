import { renderPageShell } from '@credtrail/ui-components';
import { renderPageAssetTags } from '../ui/page-assets';
import { escapeHtml } from '../utils/display-format';

export const magicLinkLoginPage = (input: {
  tenantId: string;
  nextPath: string;
  reason?: string;
  localLoginAllowed?: boolean;
  enterpriseProviders?: readonly {
    id: string;
    label: string;
    protocol: 'oidc' | 'saml';
    isDefault: boolean;
    startPath: string;
  }[];
  notice?: string;
}): string => {
  const adminPathMatch = /^\/tenants\/([^/]+)\/admin(?:$|[/?#])/.exec(input.nextPath);
  let adminTenantLabel = input.tenantId.trim();

  if (adminPathMatch?.[1] !== undefined) {
    try {
      adminTenantLabel = decodeURIComponent(adminPathMatch[1]);
    } catch {
      adminTenantLabel = adminPathMatch[1];
    }
  }

  const effectiveTenantId =
    input.tenantId.trim().length === 0 && adminTenantLabel.trim().length > 0
      ? adminTenantLabel.trim()
      : input.tenantId.trim();

  const accessContextNotice =
    adminPathMatch === null
      ? ''
      : `<p class="ct-login__context">
          ${input.reason === 'auth_required' ? 'Sign in required.' : 'Continue sign-in.'}
          You are opening <strong>${escapeHtml(adminTenantLabel)}</strong> institution admin. Use an email that already has access to this tenant.
        </p>`;
  const tenantLinkHref =
    effectiveTenantId.length === 0
      ? '/'
      : `/showcase/${encodeURIComponent(effectiveTenantId)}`;
  const tenantLinkLabel =
    effectiveTenantId.length === 0
      ? 'Back to home'
      : `View ${escapeHtml(effectiveTenantId)} badge showcase`;
  const enterpriseProviders = input.enterpriseProviders ?? [];
  const localLoginAllowed = input.localLoginAllowed ?? true;
  const loginReasonNotice =
    input.reason === 'sso_failed'
      ? '<p class="ct-login__context">Institution sign-in did not complete. Try again or contact your CredTrail administrator.</p>'
      : input.reason === 'sso_required'
        ? '<p class="ct-login__context">Institution sign-in is required for this tenant.</p>'
        : '';
  const enterpriseSignInMarkup =
    enterpriseProviders.length === 0
      ? ''
      : `<section class="ct-stack" aria-labelledby="enterprise-sso-title">
          <h2 id="enterprise-sso-title" class="ct-login__form-title">Institution sign-in</h2>
          <p class="ct-login__form-text">
            Continue through your institution identity provider to access this tenant.
          </p>
          <div id="enterprise-sso-options" class="ct-stack">
            ${enterpriseProviders
              .map((provider) => {
                const suffix = provider.protocol === 'oidc' ? 'OIDC' : 'SAML';
                return `<a class="ct-login__submit" href="${escapeHtml(provider.startPath)}">
                  Continue with ${escapeHtml(provider.label)}${provider.isDefault ? '' : ` (${escapeHtml(suffix)})`}
                </a>`;
              })
              .join('')}
          </div>
        </section>`;
  const localLoginMarkup = !localLoginAllowed
    ? ''
    : `<section class="ct-stack" aria-labelledby="magic-link-login-title">
          <h2 id="magic-link-login-title" class="ct-login__form-title">Email me a sign-in link</h2>
          <p class="ct-login__form-text">
            Enter your tenant ID and institution email. We will send the sign-in link from a CredTrail email address.
          </p>
          ${accessContextNotice}
          <form id="magic-link-login-form" class="ct-login__form ct-stack">
            <label class="ct-login__field ct-stack">
              <span>Tenant ID</span>
              <input name="tenantId" type="text" required value="${escapeHtml(effectiveTenantId)}" placeholder="sakai" />
            </label>
            <label class="ct-login__field ct-stack">
              <span>Institution email</span>
              <span class="ct-login__field-help">Use the email your institution already uses for CredTrail access.</span>
              <input name="email" type="email" required placeholder="name@institution.edu" />
            </label>
            <input name="next" type="hidden" value="${escapeHtml(input.nextPath)}" />
            <button type="submit" class="ct-login__submit">Send sign-in link</button>
          </form>
          <p class="ct-login__help">
            The sign-in email comes from CredTrail, works for this tenant flow, and expires in 10 minutes.
          </p>
          <p id="magic-link-login-status" class="ct-login__status" hidden></p>
          <p id="magic-link-dev-link" class="ct-login__dev"></p>
        </section>`;
  const loginIntroText =
    enterpriseProviders.length > 0 && !localLoginAllowed
      ? 'Use your institution sign-in to continue into this CredTrail tenant.'
      : 'Use your tenant ID and institution email to receive a secure sign-in link from CredTrail.';

  return renderPageShell(
    'Sign In · CredTrail',
    `<section class="ct-login ct-stack">
      <div class="ct-login__card ct-grid">
        <div class="ct-login__hero ct-stack">
          <p class="ct-login__eyebrow">Secure sign-in</p>
          <h1 class="ct-login__title">Access your CredTrail tenant</h1>
          <p class="ct-login__lede">
            ${loginIntroText}
          </p>
          <ol class="ct-login__steps">
            <li class="ct-login__step">
              <strong>${enterpriseProviders.length > 0 ? 'Choose your sign-in method.' : 'Enter your details.'}</strong>
              ${enterpriseProviders.length > 0 ? 'Continue with institution SSO, or use a local hosted sign-in link when your tenant allows it.' : 'Use the email your institution already uses for CredTrail access.'}
            </li>
            <li class="ct-login__step">
              <strong>${enterpriseProviders.length > 0 ? 'Complete identity verification.' : 'Check your inbox.'}</strong>
              ${enterpriseProviders.length > 0 ? 'Your institution identity provider handles the authentication challenge.' : 'The sign-in email comes from CredTrail and expires in 10 minutes.'}
            </li>
            <li class="ct-login__step">
              <strong>Open the link on this browser.</strong>
              We will return you to the tenant page you were trying to reach.
            </li>
          </ol>
        </div>
        <div class="ct-login__form-wrap ct-stack">
          ${loginReasonNotice}
          ${input.notice === undefined || input.notice.trim().length === 0 ? '' : `<p class="ct-login__context">${escapeHtml(input.notice)}</p>`}
          ${enterpriseSignInMarkup}
          ${localLoginMarkup}
          <p class="ct-login__back">
            <a href="${tenantLinkHref}">${tenantLinkLabel}</a>
          </p>
        </div>
      </div>
    </section>`,
    renderPageAssetTags(['foundationCss', 'authLoginCss', 'authLoginJs']),
  );
};
