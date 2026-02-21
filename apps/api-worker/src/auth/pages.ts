import { renderPageShell } from '@credtrail/ui-components';
import { renderPageAssetTags } from '../ui/page-assets';
import { escapeHtml } from '../utils/display-format';

export const magicLinkLoginPage = (input: {
  tenantId: string;
  nextPath: string;
}): string => {
  return renderPageShell(
    'Sign In · CredTrail',
    `<section class="ct-login ct-stack">
      <div class="ct-login__card ct-grid">
        <aside class="ct-login__hero ct-stack">
          <p class="ct-login__eyebrow">Institution Access</p>
          <h1 class="ct-login__title">Sign in to your CredTrail tenant</h1>
          <p class="ct-login__lede">
            We send a one-click secure magic link to your email. No password, no copy/paste token flow.
          </p>
          <div class="ct-login__chips ct-cluster">
            <span class="ct-login__chip">Magic Link</span>
            <span class="ct-login__chip">Tenant-Scoped</span>
            <span class="ct-login__chip">Session Secured</span>
          </div>
        </aside>
        <div class="ct-login__form-wrap ct-stack">
          <h2 class="ct-login__form-title">Request sign-in link</h2>
          <p class="ct-login__form-text">Enter your tenant ID and institution email.</p>
          <form id="magic-link-login-form" class="ct-login__form ct-stack">
            <label class="ct-login__field ct-stack">
              <span>Tenant ID</span>
              <input name="tenantId" type="text" required value="${escapeHtml(input.tenantId)}" placeholder="sakai" />
            </label>
            <label class="ct-login__field ct-stack">
              <span>Email</span>
              <input name="email" type="email" required placeholder="name@institution.edu" />
            </label>
            <input name="next" type="hidden" value="${escapeHtml(input.nextPath)}" />
            <button type="submit" class="ct-login__submit">Send magic link</button>
          </form>
          <p id="magic-link-login-status" class="ct-login__status"></p>
          <p id="magic-link-dev-link" class="ct-login__dev"></p>
        </div>
      </div>
    </section>`,
    renderPageAssetTags(['foundationCss', 'authLoginCss', 'authLoginJs']),
  );
};
