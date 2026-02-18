import type {
  BadgeTemplateRecord,
  TenantApiKeyRecord,
  TenantMembershipRole,
  TenantOrgUnitRecord,
  TenantRecord,
} from '@credtrail/db';
import { renderPageShell } from '@credtrail/ui-components';
import { escapeHtml, formatIsoTimestamp } from '../utils/display-format';

const formatScopesSummary = (scopesJson: string): string => {
  try {
    const parsed = JSON.parse(scopesJson) as unknown;

    if (!Array.isArray(parsed)) {
      return scopesJson;
    }

    return parsed
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0)
      .join(', ');
  } catch {
    return scopesJson;
  }
};

export const institutionAdminDashboardPage = (input: {
  tenant: TenantRecord;
  userId: string;
  membershipRole: TenantMembershipRole;
  badgeTemplates: readonly BadgeTemplateRecord[];
  orgUnits: readonly TenantOrgUnitRecord[];
  activeApiKeys: readonly TenantApiKeyRecord[];
  revokedApiKeyCount: number;
}): string => {
  const templateRows =
    input.badgeTemplates.length === 0
      ? `<tr><td colspan="5" class="ct-admin__empty">No badge templates found.</td></tr>`
      : input.badgeTemplates
          .map((template) => {
            const showcaseHref = `/showcase/${encodeURIComponent(
              input.tenant.id,
            )}?badgeTemplateId=${encodeURIComponent(template.id)}`;
            const image =
              template.imageUri === null
                ? '<span class="ct-admin__template-placeholder">No image</span>'
                : `<img class="ct-admin__template-image" src="${escapeHtml(template.imageUri)}" alt="${escapeHtml(
                    template.title,
                  )} artwork" loading="lazy" />`;

            return `<tr>
              <td>${image}</td>
              <td>
                <strong>${escapeHtml(template.title)}</strong>
                <div class="ct-admin__meta">${escapeHtml(template.id)}</div>
              </td>
              <td>${escapeHtml(template.slug)}</td>
              <td>${escapeHtml(formatIsoTimestamp(template.updatedAt))}</td>
              <td><a href="${escapeHtml(showcaseHref)}" target="_blank" rel="noopener noreferrer">Showcase</a></td>
            </tr>`;
          })
          .join('\n');

  const orgUnitRows =
    input.orgUnits.length === 0
      ? `<tr><td colspan="4" class="ct-admin__empty">No org units found.</td></tr>`
      : input.orgUnits
          .map((orgUnit) => {
            return `<tr>
              <td>${escapeHtml(orgUnit.displayName)}</td>
              <td>${escapeHtml(orgUnit.unitType)}</td>
              <td>${escapeHtml(orgUnit.id)}</td>
              <td>${orgUnit.isActive ? 'Active' : 'Inactive'}</td>
            </tr>`;
          })
          .join('\n');

  const apiKeyRows =
    input.activeApiKeys.length === 0
      ? `<tr><td colspan="4" class="ct-admin__empty">No active API keys found.</td></tr>`
      : input.activeApiKeys
          .map((apiKey) => {
            return `<tr>
              <td>${escapeHtml(apiKey.label)}</td>
              <td>${escapeHtml(apiKey.keyPrefix)}</td>
              <td>${escapeHtml(formatScopesSummary(apiKey.scopesJson))}</td>
              <td>${escapeHtml(apiKey.expiresAt === null ? 'Never' : formatIsoTimestamp(apiKey.expiresAt))}</td>
            </tr>`;
          })
          .join('\n');

  const tenantAdminPath = `/tenants/${encodeURIComponent(input.tenant.id)}/admin`;
  const manualIssueApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/assertions/manual-issue`;
  const createApiKeyPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/api-keys`;
  const badgeTemplateCount = String(input.badgeTemplates.length);
  const orgUnitCount = String(input.orgUnits.length);
  const activeApiKeyCount = String(input.activeApiKeys.length);
  const revokedApiKeyCount = String(input.revokedApiKeyCount);
  const templateOptions = input.badgeTemplates
    .map((template, index) => {
      return `<option value="${escapeHtml(template.id)}"${index === 0 ? ' selected' : ''}>${escapeHtml(
        `${template.title} (${template.id})`,
      )}</option>`;
    })
    .join('\n');

  return renderPageShell(
    `Institution Admin · ${input.tenant.displayName}`,
    `<style>
      .ct-admin {
        display: grid;
        gap: 1rem;
      }
      .ct-admin__hero {
        display: grid;
        gap: 0.9rem;
        padding: 1.2rem;
        border-radius: 1rem;
        border: 1px solid rgba(0, 39, 76, 0.22);
        background: linear-gradient(130deg, rgba(0, 39, 76, 0.95), rgba(8, 87, 162, 0.9));
        color: #f5fbff;
        box-shadow: 0 14px 28px rgba(0, 25, 51, 0.24);
      }
      .ct-admin__hero h1 {
        margin: 0;
        font-size: clamp(1.4rem, 3vw, 2rem);
      }
      .ct-admin__meta-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .ct-admin__pill {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        background: rgba(255, 255, 255, 0.14);
      }
      .ct-admin__layout {
        display: grid;
        gap: 1rem;
      }
      .ct-admin__panel {
        display: grid;
        gap: 0.7rem;
        background: linear-gradient(170deg, rgba(255, 255, 255, 0.95), rgba(245, 250, 255, 0.92));
        border: 1px solid rgba(0, 39, 76, 0.14);
        border-radius: 1rem;
        padding: 1rem;
      }
      .ct-admin__panel h2 {
        margin: 0;
        font-size: 1rem;
      }
      .ct-admin__panel p {
        margin: 0;
        color: #355577;
      }
      .ct-admin__grid {
        display: grid;
        gap: 1rem;
      }
      .ct-admin__form {
        display: grid;
        gap: 0.65rem;
      }
      .ct-admin__form label {
        display: grid;
        gap: 0.28rem;
        font-size: 0.9rem;
        color: #183a61;
      }
      .ct-admin__form input,
      .ct-admin__form select {
        border: 1px solid rgba(0, 39, 76, 0.26);
        border-radius: 0.65rem;
        padding: 0.52rem 0.62rem;
        font-size: 0.94rem;
      }
      .ct-admin__form button {
        justify-self: start;
        border: none;
        border-radius: 0.7rem;
        padding: 0.52rem 0.9rem;
        font-weight: 700;
        color: #f7fbff;
        background: linear-gradient(115deg, #00274c 0%, #0a4c8f 78%);
        cursor: pointer;
      }
      .ct-admin__status {
        margin: 0;
        font-size: 0.88rem;
        color: #355577;
      }
      .ct-admin__secret {
        margin: 0;
        font-size: 0.84rem;
        line-height: 1.4;
        padding: 0.6rem;
        border-radius: 0.6rem;
        background: #eef5ff;
        border: 1px solid rgba(0, 39, 76, 0.2);
        overflow-wrap: anywhere;
      }
      .ct-admin__table-wrap {
        overflow: auto;
      }
      .ct-admin__table {
        width: 100%;
        border-collapse: collapse;
      }
      .ct-admin__table th,
      .ct-admin__table td {
        text-align: left;
        border-bottom: 1px solid rgba(0, 39, 76, 0.13);
        padding: 0.55rem;
        vertical-align: top;
        font-size: 0.9rem;
      }
      .ct-admin__empty {
        color: #537194;
      }
      .ct-admin__meta {
        color: #4e6c8f;
        font-size: 0.82rem;
      }
      .ct-admin__template-image {
        width: 3.2rem;
        height: 3.2rem;
        border-radius: 0.5rem;
        object-fit: cover;
        border: 1px solid rgba(0, 39, 76, 0.24);
      }
      .ct-admin__template-placeholder {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3.2rem;
        height: 3.2rem;
        border-radius: 0.5rem;
        border: 1px dashed rgba(0, 39, 76, 0.35);
        font-size: 0.72rem;
        color: #537194;
      }
      @media (min-width: 980px) {
        .ct-admin__layout {
          grid-template-columns: 360px 1fr;
          align-items: start;
        }
      }
    </style>
    <section class="ct-admin">
      <header class="ct-admin__hero">
        <h1>Institution Admin</h1>
        <p>Browser-first control surface for tenant operations and badge issuance.</p>
        <div class="ct-admin__meta-grid">
          <span class="ct-admin__pill">Tenant: ${escapeHtml(input.tenant.id)}</span>
          <span class="ct-admin__pill">Plan: ${escapeHtml(input.tenant.planTier)}</span>
          <span class="ct-admin__pill">Role: ${escapeHtml(input.membershipRole)}</span>
          <span class="ct-admin__pill">User: ${escapeHtml(input.userId)}</span>
        </div>
      </header>
      <section class="ct-admin__layout">
        <div class="ct-admin__grid">
          <article class="ct-admin__panel">
            <h2>Manual Issue Badge</h2>
            <p>Issue a badge now from this page without curl.</p>
            <form id="manual-issue-form" class="ct-admin__form">
              <label>
                Badge template
                <select name="badgeTemplateId" required>
                  ${templateOptions}
                </select>
              </label>
              <label>
                Recipient email
                <input name="recipientIdentity" type="email" required placeholder="csev@umich.edu" />
              </label>
              <button type="submit">Issue badge</button>
            </form>
            <p id="manual-issue-status" class="ct-admin__status"></p>
          </article>
          <article class="ct-admin__panel">
            <h2>Create Tenant API Key</h2>
            <p>Create a scoped key and reveal the secret once.</p>
            <form id="api-key-form" class="ct-admin__form">
              <label>
                Label
                <input name="label" type="text" required value="Institution integration key" />
              </label>
              <label>
                Scopes (comma separated)
                <input name="scopes" type="text" value="queue.issue, queue.revoke" />
              </label>
              <button type="submit">Create API key</button>
            </form>
            <p id="api-key-status" class="ct-admin__status"></p>
            <pre id="api-key-secret" class="ct-admin__secret" hidden></pre>
          </article>
        </div>
        <div class="ct-admin__grid">
          <article class="ct-admin__panel">
            <h2>Badge Templates (${badgeTemplateCount})</h2>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Template</th>
                    <th>Slug</th>
                    <th>Updated</th>
                    <th>Links</th>
                  </tr>
                </thead>
                <tbody>
                  ${templateRows}
                </tbody>
              </table>
            </div>
          </article>
          <article class="ct-admin__panel">
            <h2>Org Units (${orgUnitCount})</h2>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${orgUnitRows}
                </tbody>
              </table>
            </div>
          </article>
          <article class="ct-admin__panel">
            <h2>Active API Keys (${activeApiKeyCount})</h2>
            <p>Revoked keys: ${revokedApiKeyCount}</p>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Prefix</th>
                    <th>Scopes</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  ${apiKeyRows}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
      <script>
        (() => {
          const tenantId = ${JSON.stringify(input.tenant.id)};
          const tenantAdminPath = ${JSON.stringify(tenantAdminPath)};
          const manualIssueApiPath = ${JSON.stringify(manualIssueApiPath)};
          const createApiKeyPath = ${JSON.stringify(createApiKeyPath)};
          const manualIssueForm = document.getElementById('manual-issue-form');
          const manualIssueStatus = document.getElementById('manual-issue-status');
          const apiKeyForm = document.getElementById('api-key-form');
          const apiKeyStatus = document.getElementById('api-key-status');
          const apiKeySecret = document.getElementById('api-key-secret');

          if (!(manualIssueForm instanceof HTMLFormElement) || !(manualIssueStatus instanceof HTMLElement)) {
            return;
          }

          if (!(apiKeyForm instanceof HTMLFormElement) || !(apiKeyStatus instanceof HTMLElement) || !(apiKeySecret instanceof HTMLElement)) {
            return;
          }

          const setStatus = (el, text, isError) => {
            el.textContent = text;
            el.style.color = isError ? '#8b1f12' : '#235079';
          };

          manualIssueForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setStatus(manualIssueStatus, 'Issuing badge...', false);
            const data = new FormData(manualIssueForm);
            const recipientIdentityRaw = data.get('recipientIdentity');
            const badgeTemplateIdRaw = data.get('badgeTemplateId');
            const recipientIdentity =
              typeof recipientIdentityRaw === 'string' ? recipientIdentityRaw.trim().toLowerCase() : '';
            const badgeTemplateId = typeof badgeTemplateIdRaw === 'string' ? badgeTemplateIdRaw.trim() : '';

            if (recipientIdentity.length === 0 || badgeTemplateId.length === 0) {
              setStatus(manualIssueStatus, 'Recipient email and badge template are required.', true);
              return;
            }

            try {
              const response = await fetch(manualIssueApiPath, {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  badgeTemplateId,
                  recipientIdentity,
                  recipientIdentityType: 'email',
                  recipientIdentifiers: [
                    {
                      identifierType: 'emailAddress',
                      identifier: recipientIdentity,
                    },
                  ],
                }),
              });

              const payload = await response.json();

              if (!response.ok) {
                const detail = payload && typeof payload.error === 'string' ? payload.error : 'Request failed';
                setStatus(manualIssueStatus, detail, true);
                return;
              }

              const assertionId =
                payload && typeof payload.assertionId === 'string' ? payload.assertionId : null;
              const link = assertionId === null ? '' : ' Open /badges/' + assertionId + ' (redirects to canonical URL).';
              setStatus(manualIssueStatus, 'Badge issued for ' + recipientIdentity + '.' + link, false);
              setTimeout(() => {
                window.location.assign(tenantAdminPath);
              }, 900);
            } catch {
              setStatus(manualIssueStatus, 'Unable to issue badge from this browser session.', true);
            }
          });

          apiKeyForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setStatus(apiKeyStatus, 'Creating API key...', false);
            apiKeySecret.hidden = true;
            apiKeySecret.textContent = '';

            const data = new FormData(apiKeyForm);
            const labelRaw = data.get('label');
            const scopesRaw = data.get('scopes');
            const label = typeof labelRaw === 'string' ? labelRaw.trim() : '';
            const scopeList =
              typeof scopesRaw !== 'string'
                ? []
                : scopesRaw
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter((entry) => entry.length > 0);

            if (label.length === 0) {
              setStatus(apiKeyStatus, 'Label is required.', true);
              return;
            }

            try {
              const response = await fetch(createApiKeyPath, {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  label,
                  scopes: scopeList,
                }),
              });
              const payload = await response.json();

              if (!response.ok) {
                const detail = payload && typeof payload.error === 'string' ? payload.error : 'Request failed';
                setStatus(apiKeyStatus, detail, true);
                return;
              }

              const apiKey = payload && typeof payload.apiKey === 'string' ? payload.apiKey : null;

              if (apiKey !== null) {
                apiKeySecret.hidden = false;
                apiKeySecret.textContent =
                  'Store this now. It is shown once:\\n\\n' + apiKey;
              }

              setStatus(apiKeyStatus, 'API key created.', false);
              setTimeout(() => {
                window.location.assign(tenantAdminPath);
              }, 900);
            } catch {
              setStatus(apiKeyStatus, 'Unable to create API key from this browser session.', true);
            }
          });
        })();
      </script>
    </section>`,
  );
};
