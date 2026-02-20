import type { LtiIssuerRegistrationRecord, TenantMembershipRole } from '@credtrail/db';
import type { LtiRoleKind } from '@credtrail/lti';
import { renderPageShell } from '@credtrail/ui-components';

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
    `<style>
      .lti-launch {
        display: grid;
        gap: 1rem;
        max-width: 58rem;
      }

      .lti-launch__hero {
        border: 1px solid rgba(0, 39, 76, 0.16);
        border-radius: 1rem;
        padding: 1rem;
        background:
          radial-gradient(circle at 90% 12%, rgba(255, 203, 5, 0.24), transparent 43%),
          linear-gradient(135deg, rgba(0, 39, 76, 0.95), rgba(12, 83, 158, 0.88));
        color: #f7fcff;
      }

      .lti-launch__hero h1 {
        margin: 0;
        color: #f7fcff;
      }

      .lti-launch__hero p {
        margin: 0.25rem 0 0 0;
        color: rgba(247, 252, 255, 0.88);
      }

      .lti-launch__card {
        border: 1px solid rgba(0, 39, 76, 0.14);
        border-radius: 1rem;
        padding: 1rem;
        background: linear-gradient(165deg, rgba(255, 255, 255, 0.97), rgba(247, 251, 255, 0.94));
        box-shadow: 0 14px 25px rgba(0, 39, 76, 0.12);
      }

      .lti-launch__details {
        margin: 0;
        display: grid;
        grid-template-columns: minmax(12rem, max-content) 1fr;
        gap: 0.45rem 0.8rem;
      }

      .lti-launch__details dt {
        font-weight: 600;
        color: #103861;
      }

      .lti-launch__details dd {
        margin: 0;
        overflow-wrap: anywhere;
        color: #3a587a;
      }
    </style>
    <section class="lti-launch">
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
      <article class="lti-launch__card" style="display:grid;gap:0.45rem;">
        <p style="margin:0;color:#3f5f83;">LTI identity is linked and this browser is now signed into CredTrail.</p>
        <p style="margin:0;">
          <a href="${escapeHtml(input.dashboardPath)}">Open learner dashboard</a>
        </p>
      </article>
    </section>`,
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
    `<style>
      .lti-deep-link {
        display: grid;
        gap: 1rem;
        max-width: 64rem;
      }

      .lti-deep-link__hero {
        border: 1px solid rgba(0, 39, 76, 0.16);
        border-radius: 1rem;
        padding: 1rem;
        background:
          radial-gradient(circle at 88% 14%, rgba(255, 203, 5, 0.26), transparent 42%),
          linear-gradient(135deg, rgba(0, 39, 76, 0.95), rgba(12, 83, 158, 0.88));
        color: #f7fcff;
      }

      .lti-deep-link__hero h1 {
        margin: 0;
        color: #f7fcff;
      }

      .lti-deep-link__hero p {
        margin: 0.3rem 0 0 0;
        color: rgba(247, 252, 255, 0.9);
      }

      .lti-deep-link__details {
        margin: 0;
        display: grid;
        grid-template-columns: minmax(11rem, max-content) 1fr;
        gap: 0.35rem 0.7rem;
      }

      .lti-deep-link__details dt {
        font-weight: 600;
      }

      .lti-deep-link__details dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .lti-deep-link__options {
        display: grid;
        gap: 0.85rem;
      }

      .lti-deep-link__option {
        border: 1px solid rgba(0, 39, 76, 0.14);
        border-radius: 0.9rem;
        padding: 0.9rem;
        background: linear-gradient(165deg, rgba(255, 255, 255, 0.97), rgba(247, 251, 255, 0.94));
        box-shadow: 0 12px 22px rgba(0, 39, 76, 0.1);
        display: grid;
        gap: 0.4rem;
      }

      .lti-deep-link__option h2 {
        margin: 0;
        font-size: 1.08rem;
      }

      .lti-deep-link__meta,
      .lti-deep-link__description {
        margin: 0;
        color: #355577;
        overflow-wrap: anywhere;
      }

      .lti-deep-link__form {
        margin-top: 0.25rem;
      }

      .lti-deep-link__form button {
        border: none;
        border-radius: 0.7rem;
        padding: 0.5rem 0.9rem;
        font-weight: 700;
        color: #f7fbff;
        background: linear-gradient(115deg, #00274c 0%, #0a4c8f 78%);
        cursor: pointer;
      }

      .lti-deep-link__notice {
        margin: 0;
        padding: 0.75rem;
        border-radius: 0.7rem;
        border: 1px solid rgba(173, 94, 0, 0.28);
        background: rgba(255, 245, 230, 0.9);
        color: #7f4a0c;
      }

      .lti-deep-link__empty {
        margin: 0;
        color: #3f5f83;
      }
    </style>
    <section class="lti-deep-link">
      <header class="lti-deep-link__hero">
        <h1>Select badge template placement</h1>
        <p>Choose a badge template and return it to your LMS via LTI Deep Linking.</p>
      </header>
      <article style="border:1px solid rgba(0,39,76,0.14);border-radius:0.9rem;padding:0.9rem;background:rgba(255,255,255,0.94);">
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
      ? '<tr><td colspan="6" style="padding:0.75rem;">No LTI issuer registrations configured.</td></tr>'
      : input.registrations
          .map((registration) => {
            return `<tr>
      <td style="padding:0.5rem;vertical-align:top;word-break:break-word;">${escapeHtml(registration.issuer)}</td>
      <td style="padding:0.5rem;vertical-align:top;">${escapeHtml(registration.tenantId)}</td>
      <td style="padding:0.5rem;vertical-align:top;word-break:break-word;">${escapeHtml(registration.clientId)}</td>
      <td style="padding:0.5rem;vertical-align:top;word-break:break-word;">${escapeHtml(registration.authorizationEndpoint)}</td>
      <td style="padding:0.5rem;vertical-align:top;">${registration.allowUnsignedIdToken ? 'true' : 'false'}</td>
      <td style="padding:0.5rem;vertical-align:top;">
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
    `<section style="display:grid;gap:1rem;max-width:64rem;">
      <h1 style="margin:0;">Manual LTI issuer registration configuration</h1>
      <p style="margin:0;color:#334155;">
        Configure issuer mappings used by LTI 1.3 OIDC login and launch. Stored registrations override env-based defaults.
      </p>
      ${
        input.submissionError === undefined
          ? ''
          : `<p style="margin:0;padding:0.75rem;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;">
              ${escapeHtml(input.submissionError)}
            </p>`
      }
      <form method="post" action="/admin/lti/issuer-registrations" style="display:grid;gap:0.75rem;padding:1rem;border:1px solid #cbd5e1;border-radius:0.5rem;">
        <input type="hidden" name="token" value="${escapeHtml(input.token)}" />
        <label style="display:grid;gap:0.35rem;">
          <span>Issuer URL</span>
          <input name="issuer" type="url" required value="${escapeHtml(input.formState?.issuer ?? '')}" />
        </label>
        <label style="display:grid;gap:0.35rem;">
          <span>Tenant ID</span>
          <input name="tenantId" type="text" required value="${escapeHtml(input.formState?.tenantId ?? '')}" />
        </label>
        <label style="display:grid;gap:0.35rem;">
          <span>Client ID</span>
          <input name="clientId" type="text" required value="${escapeHtml(input.formState?.clientId ?? '')}" />
        </label>
        <label style="display:grid;gap:0.35rem;">
          <span>Authorization endpoint</span>
          <input name="authorizationEndpoint" type="url" required value="${escapeHtml(input.formState?.authorizationEndpoint ?? '')}" />
        </label>
        <label style="display:flex;gap:0.5rem;align-items:center;">
          <input name="allowUnsignedIdToken" type="checkbox" ${
            input.formState?.allowUnsignedIdToken === true ? 'checked' : ''
          } />
          <span>Allow unsigned id_token (test-mode only)</span>
        </label>
        <div>
          <button type="submit">Save registration</button>
        </div>
      </form>
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #cbd5e1;">Issuer</th>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #cbd5e1;">Tenant</th>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #cbd5e1;">Client ID</th>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #cbd5e1;">Authorization endpoint</th>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #cbd5e1;">Unsigned test mode</th>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #cbd5e1;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${registrationRows}
          </tbody>
        </table>
      </div>
    </section>`,
  );
};
