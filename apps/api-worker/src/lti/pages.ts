import type { LtiIssuerRegistrationRecord, TenantMembershipRole } from '@credtrail/db';
import type { LtiRoleKind } from '@credtrail/lti';
import { renderPageShell } from '@credtrail/ui-components';
import { renderPageAssetTags } from '../ui/page-assets';

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const ltiRoleLabel = (roleKind: LtiRoleKind): string => {
  if (roleKind === 'instructor') {
    return 'Instructor';
  }

  if (roleKind === 'learner') {
    return 'Learner';
  }

  return 'Unknown role';
};

const LTI_PAGE_HEAD_TAGS = renderPageAssetTags(['foundationCss', 'ltiPagesCss']);

export const ltiLaunchResultPage = (input: {
  roleKind: LtiRoleKind;
  tenantId: string;
  userId: string;
  membershipRole: TenantMembershipRole;
  learnerProfileId: string;
  issuer: string;
  deploymentId: string;
  subjectId: string;
  targetLinkUri: string;
  messageType: string;
  dashboardPath: string;
}): string => {
  return renderPageShell(
    'LTI Launch Complete | CredTrail',
    `<section class="lti-launch">
      <header class="lti-launch__hero">
        <h1>LTI 1.3 launch complete</h1>
        <p>Launch accepted for <strong>${escapeHtml(ltiRoleLabel(input.roleKind))}</strong>.</p>
      </header>
      <article class="lti-launch__card">
        <dl class="lti-launch__details">
          <dt>Issuer</dt>
          <dd>${escapeHtml(input.issuer)}</dd>
          <dt>Deployment ID</dt>
          <dd>${escapeHtml(input.deploymentId)}</dd>
          <dt>Tenant</dt>
          <dd>${escapeHtml(input.tenantId)}</dd>
          <dt>User ID</dt>
          <dd>${escapeHtml(input.userId)}</dd>
          <dt>Membership role</dt>
          <dd>${escapeHtml(input.membershipRole)}</dd>
          <dt>Learner profile</dt>
          <dd>${escapeHtml(input.learnerProfileId)}</dd>
          <dt>LTI subject</dt>
          <dd>${escapeHtml(input.subjectId)}</dd>
          <dt>Message type</dt>
          <dd>${escapeHtml(input.messageType)}</dd>
          <dt>Target link URI</dt>
          <dd>${escapeHtml(input.targetLinkUri)}</dd>
        </dl>
      </article>
      <article class="lti-launch__card lti-launch__card--stack">
        <p class="lti-launch__hint">LTI identity is linked and this browser is now signed into CredTrail.</p>
        <p class="lti-launch__link-row">
          <a href="${escapeHtml(input.dashboardPath)}">Open learner dashboard</a>
        </p>
      </article>
    </section>`,
    LTI_PAGE_HEAD_TAGS,
  );
};

export const ltiDeepLinkSelectionPage = (input: {
  tenantId: string;
  userId: string;
  membershipRole: TenantMembershipRole;
  issuer: string;
  deploymentId: string;
  deepLinkReturnUrl: string;
  targetLinkUri: string;
  isUnsignedResponseJwt: boolean;
  options: readonly {
    badgeTemplateId: string;
    title: string;
    description: string | null;
    launchUrl: string;
    deepLinkResponseJwt: string;
  }[];
}): string => {
  const optionRows =
    input.options.length === 0
      ? '<p class="lti-deep-link__empty">No active badge templates are available for this tenant.</p>'
      : input.options
          .map((option) => {
            const description =
              option.description === null
                ? '<p class="lti-deep-link__description">No template description provided.</p>'
                : `<p class="lti-deep-link__description">${escapeHtml(option.description)}</p>`;

            return `<article class="lti-deep-link__option">
              <h2>${escapeHtml(option.title)}</h2>
              <p class="lti-deep-link__meta">Template ID: ${escapeHtml(option.badgeTemplateId)}</p>
              ${description}
              <p class="lti-deep-link__meta">
                Launch URL:
                <a href="${escapeHtml(option.launchUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(option.launchUrl)}</a>
              </p>
              <form method="post" action="${escapeHtml(input.deepLinkReturnUrl)}" class="lti-deep-link__form">
                <input type="hidden" name="JWT" value="${escapeHtml(option.deepLinkResponseJwt)}" />
                <button type="submit">Place Template in LMS</button>
              </form>
            </article>`;
          })
          .join('\n');

  return renderPageShell(
    'LTI Deep Linking | CredTrail',
    `<section class="lti-deep-link">
      <header class="lti-deep-link__hero">
        <h1>Select badge template placement</h1>
        <p>Choose a badge template and return it to your LMS via LTI Deep Linking.</p>
      </header>
      <article class="lti-deep-link__details-card">
        <dl class="lti-deep-link__details">
          <dt>Issuer</dt>
          <dd>${escapeHtml(input.issuer)}</dd>
          <dt>Deployment ID</dt>
          <dd>${escapeHtml(input.deploymentId)}</dd>
          <dt>Tenant</dt>
          <dd>${escapeHtml(input.tenantId)}</dd>
          <dt>User ID</dt>
          <dd>${escapeHtml(input.userId)}</dd>
          <dt>Membership role</dt>
          <dd>${escapeHtml(input.membershipRole)}</dd>
          <dt>Deep link return URL</dt>
          <dd>${escapeHtml(input.deepLinkReturnUrl)}</dd>
          <dt>Target link URI</dt>
          <dd>${escapeHtml(input.targetLinkUri)}</dd>
        </dl>
      </article>
      ${
        input.isUnsignedResponseJwt
          ? '<p class="lti-deep-link__notice">This environment is returning unsigned JWT responses (alg=none). Use signed launch/response verification before production LMS rollout.</p>'
          : ''
      }
      <section class="lti-deep-link__options">
        ${optionRows}
      </section>
    </section>`,
    LTI_PAGE_HEAD_TAGS,
  );
};

export interface LtiIssuerRegistrationFormState {
  issuer?: string;
  tenantId?: string;
  authorizationEndpoint?: string;
  clientId?: string;
  allowUnsignedIdToken?: boolean;
}

export const ltiIssuerRegistrationAdminPage = (input: {
  token: string;
  registrations: readonly LtiIssuerRegistrationRecord[];
  submissionError?: string;
  formState?: LtiIssuerRegistrationFormState;
}): string => {
  const registrationRows =
    input.registrations.length === 0
      ? '<tr><td colspan="6" class="lti-registration__empty">No LTI issuer registrations configured.</td></tr>'
      : input.registrations
          .map((registration) => {
            return `<tr>
      <td class="lti-registration__wrap-anywhere">${escapeHtml(registration.issuer)}</td>
      <td>${escapeHtml(registration.tenantId)}</td>
      <td class="lti-registration__wrap-anywhere">${escapeHtml(registration.clientId)}</td>
      <td class="lti-registration__wrap-anywhere">${escapeHtml(registration.authorizationEndpoint)}</td>
      <td>${registration.allowUnsignedIdToken ? 'true' : 'false'}</td>
      <td>
        <form method="post" action="/admin/lti/issuer-registrations/delete">
          <input type="hidden" name="token" value="${escapeHtml(input.token)}" />
          <input type="hidden" name="issuer" value="${escapeHtml(registration.issuer)}" />
          <button type="submit">Delete</button>
        </form>
      </td>
    </tr>`;
          })
          .join('\n');

  return renderPageShell(
    'LTI Issuer Registrations | CredTrail',
    `<section class="lti-registration">
      <h1 class="lti-registration__title">Manual LTI issuer registration configuration</h1>
      <p class="lti-registration__lede">
        Configure issuer mappings used by LTI 1.3 OIDC login and launch. Stored registrations override env-based defaults.
      </p>
      ${
        input.submissionError === undefined
          ? ''
          : `<p class="lti-registration__error">
              ${escapeHtml(input.submissionError)}
            </p>`
      }
      <form method="post" action="/admin/lti/issuer-registrations" class="lti-registration__form">
        <input type="hidden" name="token" value="${escapeHtml(input.token)}" />
        <label class="lti-registration__field">
          <span>Issuer URL</span>
          <input name="issuer" type="url" required value="${escapeHtml(input.formState?.issuer ?? '')}" />
        </label>
        <label class="lti-registration__field">
          <span>Tenant ID</span>
          <input name="tenantId" type="text" required value="${escapeHtml(input.formState?.tenantId ?? '')}" />
        </label>
        <label class="lti-registration__field">
          <span>Client ID</span>
          <input name="clientId" type="text" required value="${escapeHtml(input.formState?.clientId ?? '')}" />
        </label>
        <label class="lti-registration__field">
          <span>Authorization endpoint</span>
          <input name="authorizationEndpoint" type="url" required value="${escapeHtml(input.formState?.authorizationEndpoint ?? '')}" />
        </label>
        <label class="lti-registration__checkbox">
          <input name="allowUnsignedIdToken" type="checkbox" ${
            input.formState?.allowUnsignedIdToken === true ? 'checked' : ''
          } />
          <span>Allow unsigned id_token (test-mode only)</span>
        </label>
        <div class="lti-registration__actions">
          <button type="submit">Save registration</button>
        </div>
      </form>
      <div class="lti-registration__table-wrap">
        <table class="lti-registration__table">
          <thead>
            <tr>
              <th>Issuer</th>
              <th>Tenant</th>
              <th>Client ID</th>
              <th>Authorization endpoint</th>
              <th>Unsigned test mode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${registrationRows}
          </tbody>
        </table>
      </div>
    </section>`,
    LTI_PAGE_HEAD_TAGS,
  );
};
