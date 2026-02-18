import type {
  BadgeIssuanceRuleRecord,
  BadgeIssuanceRuleVersionRecord,
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
  badgeRules: readonly BadgeIssuanceRuleRecord[];
  badgeRuleVersions: readonly BadgeIssuanceRuleVersionRecord[];
}): string => {
  const templateById = new Map(input.badgeTemplates.map((template) => [template.id, template]));
  const versionsByRuleId = new Map<string, BadgeIssuanceRuleVersionRecord[]>();

  for (const version of input.badgeRuleVersions) {
    const versions = versionsByRuleId.get(version.ruleId);

    if (versions === undefined) {
      versionsByRuleId.set(version.ruleId, [version]);
      continue;
    }

    versions.push(version);
  }

  for (const versions of versionsByRuleId.values()) {
    versions.sort((left, right) => right.versionNumber - left.versionNumber);
  }

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
      ? `<tr><td colspan="5" class="ct-admin__empty">No active API keys found.</td></tr>`
      : input.activeApiKeys
          .map((apiKey) => {
            const revokeApiKeyPath = `/v1/tenants/${encodeURIComponent(
              input.tenant.id,
            )}/api-keys/${encodeURIComponent(apiKey.id)}/revoke`;

            return `<tr>
              <td>${escapeHtml(apiKey.label)}</td>
              <td>${escapeHtml(apiKey.keyPrefix)}</td>
              <td>${escapeHtml(formatScopesSummary(apiKey.scopesJson))}</td>
              <td>${escapeHtml(apiKey.expiresAt === null ? 'Never' : formatIsoTimestamp(apiKey.expiresAt))}</td>
              <td>
                <button
                  type="button"
                  class="ct-admin__button ct-admin__button--danger"
                  data-revoke-api-key-path="${escapeHtml(revokeApiKeyPath)}"
                  data-api-key-label="${escapeHtml(apiKey.label)}"
                >
                  Revoke
                </button>
              </td>
            </tr>`;
          })
          .join('\n');

  const ruleRows =
    input.badgeRules.length === 0
      ? `<tr><td colspan="8" class="ct-admin__empty">No badge rules found.</td></tr>`
      : input.badgeRules
          .map((rule) => {
            const templateTitle = templateById.get(rule.badgeTemplateId)?.title ?? rule.badgeTemplateId;
            const versions = versionsByRuleId.get(rule.id) ?? [];
            const latestVersion = versions[0] ?? null;
            const submitApprovalPath =
              latestVersion === null
                ? null
                : `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rules/${encodeURIComponent(
                    rule.id,
                  )}/versions/${encodeURIComponent(latestVersion.id)}/submit-approval`;
            const approvePath =
              latestVersion === null
                ? null
                : `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rules/${encodeURIComponent(
                    rule.id,
                  )}/versions/${encodeURIComponent(latestVersion.id)}/decision`;
            const activatePath =
              latestVersion === null
                ? null
                : `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rules/${encodeURIComponent(
                    rule.id,
                  )}/versions/${encodeURIComponent(latestVersion.id)}/activate`;
            const actionButtons: string[] = [];

            if (latestVersion !== null) {
              if (latestVersion.status === 'draft' || latestVersion.status === 'rejected') {
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny" data-rule-submit-path="${escapeHtml(
                    submitApprovalPath ?? '',
                  )}" data-rule-label="${escapeHtml(rule.name)}">Submit</button>`,
                );
              }

              if (latestVersion.status === 'pending_approval') {
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny" data-rule-decision-path="${escapeHtml(
                    approvePath ?? '',
                  )}" data-rule-decision="approved" data-rule-label="${escapeHtml(rule.name)}">Approve</button>`,
                );
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger" data-rule-decision-path="${escapeHtml(
                    approvePath ?? '',
                  )}" data-rule-decision="rejected" data-rule-label="${escapeHtml(rule.name)}">Reject</button>`,
                );
              }

              if (latestVersion.status === 'approved' || latestVersion.status === 'active') {
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny" data-rule-activate-path="${escapeHtml(
                    activatePath ?? '',
                  )}" data-rule-label="${escapeHtml(rule.name)}">Activate</button>`,
                );
              }
            }

            return `<tr>
              <td><strong>${escapeHtml(rule.name)}</strong><div class="ct-admin__meta">${escapeHtml(rule.id)}</div></td>
              <td>${escapeHtml(templateTitle)}</td>
              <td>${escapeHtml(rule.lmsProviderKind)}</td>
              <td>${escapeHtml(rule.activeVersionId ?? 'none')}</td>
              <td>${escapeHtml(
                latestVersion === null
                  ? 'none'
                  : `v${String(latestVersion.versionNumber)} (${latestVersion.id})`,
              )}</td>
              <td><span class="ct-admin__status-pill ct-admin__status-pill--${escapeHtml(
                latestVersion?.status ?? 'none',
              )}">${escapeHtml(latestVersion?.status ?? 'none')}</span></td>
              <td>${escapeHtml(formatIsoTimestamp(rule.updatedAt))}</td>
              <td>${actionButtons.length > 0 ? actionButtons.join(' ') : '<span class="ct-admin__meta">No actions</span>'}</td>
            </tr>`;
          })
          .join('\n');

  const tenantAdminPath = `/tenants/${encodeURIComponent(input.tenant.id)}/admin`;
  const manualIssueApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/assertions/manual-issue`;
  const createApiKeyPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/api-keys`;
  const createOrgUnitPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/org-units`;
  const badgeRuleApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rules`;
  const badgeTemplateCount = String(input.badgeTemplates.length);
  const orgUnitCount = String(input.orgUnits.length);
  const activeApiKeyCount = String(input.activeApiKeys.length);
  const revokedApiKeyCount = String(input.revokedApiKeyCount);
  const ruleCount = String(input.badgeRules.length);
  const orgUnitParentOptions = input.orgUnits
    .filter((orgUnit) => orgUnit.isActive)
    .map((orgUnit) => {
      return `<option value="${escapeHtml(orgUnit.id)}" data-unit-type="${escapeHtml(
        orgUnit.unitType,
      )}">${escapeHtml(`${orgUnit.displayName} (${orgUnit.unitType})`)}</option>`;
    })
    .join('\n');
  const templateOptions = input.badgeTemplates
    .map((template, index) => {
      return `<option value="${escapeHtml(template.id)}"${index === 0 ? ' selected' : ''}>${escapeHtml(
        `${template.title} (${template.id})`,
      )}</option>`;
    })
    .join('\n');
  const ruleOptions = input.badgeRules
    .map((rule, index) => {
      const versions = versionsByRuleId.get(rule.id) ?? [];
      const latestVersion = versions[0] ?? null;

      return `<option value="${escapeHtml(rule.id)}"${index === 0 ? ' selected' : ''} data-version-id="${escapeHtml(
        latestVersion?.id ?? '',
      )}" data-version-status="${escapeHtml(latestVersion?.status ?? 'none')}" data-rule-label="${escapeHtml(
        rule.name,
      )}">${escapeHtml(
        `${rule.name} (${rule.id}) · latest ${latestVersion === null ? 'none' : `v${String(
          latestVersion.versionNumber,
        )} ${latestVersion.status}`}`,
      )}</option>`;
    })
    .join('\n');
  const templateSelectOptions =
    templateOptions.length > 0
      ? templateOptions
      : '<option value="">No badge templates available</option>';
  const ruleSelectOptions =
    ruleOptions.length > 0 ? ruleOptions : '<option value="">No rules available</option>';

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
      .ct-admin__button {
        border: none;
        border-radius: 0.6rem;
        padding: 0.45rem 0.72rem;
        font-size: 0.82rem;
        font-weight: 700;
        color: #f7fbff;
        background: linear-gradient(115deg, #00274c 0%, #0a4c8f 78%);
        cursor: pointer;
      }
      .ct-admin__button:disabled {
        opacity: 0.66;
        cursor: progress;
      }
      .ct-admin__button--tiny {
        padding: 0.3rem 0.55rem;
        font-size: 0.76rem;
      }
      .ct-admin__button--danger {
        background: linear-gradient(115deg, #81160b 0%, #b3261a 78%);
      }
      .ct-admin__status {
        margin: 0;
        font-size: 0.88rem;
        color: #355577;
      }
      .ct-admin__hint {
        margin: 0;
        font-size: 0.8rem;
        color: #537194;
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
      .ct-admin__status-pill {
        display: inline-flex;
        padding: 0.14rem 0.45rem;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 700;
        border: 1px solid rgba(0, 39, 76, 0.16);
        background: #edf3fb;
        color: #234f7b;
      }
      .ct-admin__status-pill--draft,
      .ct-admin__status-pill--pending_approval {
        background: #fff6df;
        color: #7f4a0c;
        border-color: rgba(153, 97, 17, 0.25);
      }
      .ct-admin__status-pill--approved,
      .ct-admin__status-pill--active {
        background: #e8f8ef;
        color: #0f5132;
        border-color: rgba(19, 120, 76, 0.26);
      }
      .ct-admin__status-pill--rejected,
      .ct-admin__status-pill--deprecated {
        background: #fdf0ef;
        color: #842029;
        border-color: rgba(132, 32, 41, 0.24);
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
                  ${templateSelectOptions}
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
          <article class="ct-admin__panel">
            <h2>Create Org Unit</h2>
            <p>Add college/department/program hierarchy from this page.</p>
            <p class="ct-admin__hint">Hierarchy: college → institution, department → college, program → department.</p>
            <form id="org-unit-form" class="ct-admin__form">
              <label>
                Unit type
                <select name="unitType" required>
                  <option value="college">College</option>
                  <option value="department">Department</option>
                  <option value="program">Program</option>
                  <option value="institution">Institution</option>
                </select>
              </label>
              <label>
                Slug
                <input name="slug" type="text" required placeholder="engineering-college" />
              </label>
              <label>
                Display name
                <input name="displayName" type="text" required placeholder="College of Engineering" />
              </label>
              <label>
                Parent org unit
                <select name="parentOrgUnitId">
                  <option value="">None</option>
                  ${orgUnitParentOptions}
                </select>
              </label>
              <button type="submit">Create org unit</button>
            </form>
            <p id="org-unit-status" class="ct-admin__status"></p>
          </article>
          <article class="ct-admin__panel">
            <h2>Create Badge Rule</h2>
            <p>Create a first draft rule with approval chain metadata.</p>
            <form id="rule-create-form" class="ct-admin__form">
              <label>
                Rule name
                <input name="name" type="text" required placeholder="CS101 Excellence Rule" />
              </label>
              <label>
                Description (optional)
                <input name="description" type="text" placeholder="Award when learner completes CS101 with final score >= 80." />
              </label>
              <label>
                Badge template
                <select name="badgeTemplateId" required>
                  ${templateSelectOptions}
                </select>
              </label>
              <label>
                LMS provider
                <select name="lmsProviderKind" required>
                  <option value="canvas">Canvas</option>
                  <option value="sakai">Sakai</option>
                  <option value="moodle">Moodle</option>
                  <option value="blackboard_ultra">Blackboard Ultra</option>
                  <option value="d2l_brightspace">D2L Brightspace</option>
                </select>
              </label>
              <label>
                Course ID
                <input name="courseId" type="text" required placeholder="CS101" />
              </label>
              <label>
                Minimum final score
                <input name="minScore" type="number" min="0" max="100" step="0.01" required value="80" />
              </label>
              <label>
                Approval roles (comma separated)
                <input name="approvalRoles" type="text" value="admin,owner" />
              </label>
              <label>
                Change summary (optional)
                <input name="changeSummary" type="text" placeholder="Initial draft for committee review." />
              </label>
              <button type="submit">Create rule draft</button>
            </form>
            <p id="rule-create-status" class="ct-admin__status"></p>
          </article>
          <article class="ct-admin__panel">
            <h2>Evaluate Rule</h2>
            <p>Run rule evaluation (dry run by default) and optionally issue now.</p>
            <form id="rule-evaluate-form" class="ct-admin__form">
              <label>
                Rule
                <select name="ruleId" required>
                  ${ruleSelectOptions}
                </select>
              </label>
              <label>
                Learner ID
                <input name="learnerId" type="text" required placeholder="canvas:12345" />
              </label>
              <label>
                Recipient email
                <input name="recipientIdentity" type="email" required placeholder="learner@example.edu" />
              </label>
              <label>
                Course ID for provided facts
                <input name="courseId" type="text" required placeholder="CS101" />
              </label>
              <label>
                Final score for provided facts
                <input name="finalScore" type="number" min="0" max="100" step="0.01" required value="92" />
              </label>
              <label>
                <input name="completed" type="checkbox" checked />
                Learner completed course
              </label>
              <label>
                <input name="dryRun" type="checkbox" checked />
                Dry run (don’t issue badge)
              </label>
              <button type="submit">Evaluate rule</button>
            </form>
            <p id="rule-evaluate-status" class="ct-admin__status"></p>
          </article>
        </div>
        <div class="ct-admin__grid">
          <article class="ct-admin__panel">
            <h2>Badge Rules (${ruleCount})</h2>
            <p>Lifecycle actions operate on each rule’s latest version.</p>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Template</th>
                    <th>LMS</th>
                    <th>Active Version</th>
                    <th>Latest Version</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${ruleRows}
                </tbody>
              </table>
            </div>
            <p id="rule-action-status" class="ct-admin__status"></p>
          </article>
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${apiKeyRows}
                </tbody>
              </table>
            </div>
            <p id="api-key-revoke-status" class="ct-admin__status"></p>
          </article>
        </div>
      </section>
      <script>
        (() => {
          const tenantAdminPath = ${JSON.stringify(tenantAdminPath)};
          const manualIssueApiPath = ${JSON.stringify(manualIssueApiPath)};
          const createApiKeyPath = ${JSON.stringify(createApiKeyPath)};
          const createOrgUnitPath = ${JSON.stringify(createOrgUnitPath)};
          const badgeRuleApiPath = ${JSON.stringify(badgeRuleApiPath)};
          const manualIssueForm = document.getElementById('manual-issue-form');
          const manualIssueStatus = document.getElementById('manual-issue-status');
          const apiKeyForm = document.getElementById('api-key-form');
          const apiKeyStatus = document.getElementById('api-key-status');
          const apiKeySecret = document.getElementById('api-key-secret');
          const orgUnitForm = document.getElementById('org-unit-form');
          const orgUnitStatus = document.getElementById('org-unit-status');
          const apiKeyRevokeStatus = document.getElementById('api-key-revoke-status');
          const ruleCreateForm = document.getElementById('rule-create-form');
          const ruleCreateStatus = document.getElementById('rule-create-status');
          const ruleEvaluateForm = document.getElementById('rule-evaluate-form');
          const ruleEvaluateStatus = document.getElementById('rule-evaluate-status');
          const ruleActionStatus = document.getElementById('rule-action-status');

          const setStatus = (el, text, isError) => {
            el.textContent = text;
            el.style.color = isError ? '#8b1f12' : '#235079';
          };
          const parseJsonBody = async (response) => {
            try {
              return await response.json();
            } catch {
              return null;
            }
          };
          const errorDetailFromPayload = (payload) => {
            return payload && typeof payload.error === 'string' ? payload.error : 'Request failed';
          };

          if (manualIssueForm instanceof HTMLFormElement && manualIssueStatus instanceof HTMLElement) {
            manualIssueForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              setStatus(manualIssueStatus, 'Issuing badge...', false);
              const data = new FormData(manualIssueForm);
              const recipientIdentityRaw = data.get('recipientIdentity');
              const badgeTemplateIdRaw = data.get('badgeTemplateId');
              const recipientIdentity =
                typeof recipientIdentityRaw === 'string' ? recipientIdentityRaw.trim().toLowerCase() : '';
              const badgeTemplateId =
                typeof badgeTemplateIdRaw === 'string' ? badgeTemplateIdRaw.trim() : '';

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

                const payload = await parseJsonBody(response);

                if (!response.ok) {
                  setStatus(manualIssueStatus, errorDetailFromPayload(payload), true);
                  return;
                }

                const assertionId =
                  payload && typeof payload.assertionId === 'string' ? payload.assertionId : null;
                const link =
                  assertionId === null
                    ? ''
                    : ' Open /badges/' + assertionId + ' (redirects to canonical URL).';
                setStatus(manualIssueStatus, 'Badge issued for ' + recipientIdentity + '.' + link, false);
                setTimeout(() => {
                  window.location.assign(tenantAdminPath);
                }, 900);
              } catch {
                setStatus(manualIssueStatus, 'Unable to issue badge from this browser session.', true);
              }
            });
          }

          if (
            apiKeyForm instanceof HTMLFormElement &&
            apiKeyStatus instanceof HTMLElement &&
            apiKeySecret instanceof HTMLElement
          ) {
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
                const payload = await parseJsonBody(response);

                if (!response.ok) {
                  setStatus(apiKeyStatus, errorDetailFromPayload(payload), true);
                  return;
                }

                const apiKey = payload && typeof payload.apiKey === 'string' ? payload.apiKey : null;

                if (apiKey !== null) {
                  apiKeySecret.hidden = false;
                  apiKeySecret.textContent = 'Store this now. It is shown once:\\n\\n' + apiKey;
                }

                setStatus(apiKeyStatus, 'API key created.', false);
                setTimeout(() => {
                  window.location.assign(tenantAdminPath);
                }, 900);
              } catch {
                setStatus(apiKeyStatus, 'Unable to create API key from this browser session.', true);
              }
            });
          }

          if (orgUnitForm instanceof HTMLFormElement && orgUnitStatus instanceof HTMLElement) {
            const unitTypeInput = orgUnitForm.elements.namedItem('unitType');
            const parentOrgUnitInput = orgUnitForm.elements.namedItem('parentOrgUnitId');
            const requiredParentTypeByUnitType = {
              institution: null,
              college: 'institution',
              department: 'college',
              program: 'department',
            };

            const syncParentOptions = () => {
              if (!(unitTypeInput instanceof HTMLSelectElement)) {
                return;
              }

              if (!(parentOrgUnitInput instanceof HTMLSelectElement)) {
                return;
              }

              const unitType = unitTypeInput.value;
              const requiredParentType = requiredParentTypeByUnitType[unitType];

              Array.from(parentOrgUnitInput.options).forEach((option) => {
                if (option.value.length === 0) {
                  option.hidden = false;
                  option.disabled = false;
                  option.textContent = requiredParentType === null ? 'None' : 'Select parent';
                  return;
                }

                const parentType = option.dataset.unitType ?? null;
                const matches = requiredParentType === null || parentType === requiredParentType;
                option.hidden = !matches;
                option.disabled = !matches;
              });

              const selected = parentOrgUnitInput.selectedOptions.item(0);

              if (selected !== null && selected.value.length > 0 && (selected.hidden || selected.disabled)) {
                parentOrgUnitInput.value = '';
              }
            };

            syncParentOptions();

            if (unitTypeInput instanceof HTMLSelectElement) {
              unitTypeInput.addEventListener('change', syncParentOptions);
            }

            orgUnitForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              setStatus(orgUnitStatus, 'Creating org unit...', false);
              const data = new FormData(orgUnitForm);
              const unitTypeRaw = data.get('unitType');
              const slugRaw = data.get('slug');
              const displayNameRaw = data.get('displayName');
              const parentOrgUnitIdRaw = data.get('parentOrgUnitId');
              const unitType = typeof unitTypeRaw === 'string' ? unitTypeRaw.trim() : '';
              const slug = typeof slugRaw === 'string' ? slugRaw.trim() : '';
              const displayName = typeof displayNameRaw === 'string' ? displayNameRaw.trim() : '';
              const parentOrgUnitId =
                typeof parentOrgUnitIdRaw === 'string' ? parentOrgUnitIdRaw.trim() : '';

              if (unitType.length === 0 || slug.length === 0 || displayName.length === 0) {
                setStatus(orgUnitStatus, 'Unit type, slug, and display name are required.', true);
                return;
              }

              const requiredParentType = requiredParentTypeByUnitType[unitType] ?? null;

              if (requiredParentType !== null && parentOrgUnitId.length === 0) {
                setStatus(orgUnitStatus, 'Selected unit type requires a parent org unit.', true);
                return;
              }

              try {
                const response = await fetch(createOrgUnitPath, {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    unitType,
                    slug,
                    displayName,
                    ...(parentOrgUnitId.length > 0 ? { parentOrgUnitId } : {}),
                  }),
                });
                const payload = await parseJsonBody(response);

                if (!response.ok) {
                  setStatus(orgUnitStatus, errorDetailFromPayload(payload), true);
                  return;
                }

                setStatus(orgUnitStatus, 'Org unit created.', false);
                setTimeout(() => {
                  window.location.assign(tenantAdminPath);
                }, 900);
              } catch {
                setStatus(orgUnitStatus, 'Unable to create org unit from this browser session.', true);
              }
            });
          }

          if (ruleCreateForm instanceof HTMLFormElement && ruleCreateStatus instanceof HTMLElement) {
            ruleCreateForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              setStatus(ruleCreateStatus, 'Creating rule draft...', false);
              const data = new FormData(ruleCreateForm);
              const nameRaw = data.get('name');
              const descriptionRaw = data.get('description');
              const badgeTemplateIdRaw = data.get('badgeTemplateId');
              const lmsProviderKindRaw = data.get('lmsProviderKind');
              const courseIdRaw = data.get('courseId');
              const minScoreRaw = data.get('minScore');
              const approvalRolesRaw = data.get('approvalRoles');
              const changeSummaryRaw = data.get('changeSummary');
              const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
              const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim() : '';
              const badgeTemplateId =
                typeof badgeTemplateIdRaw === 'string' ? badgeTemplateIdRaw.trim() : '';
              const lmsProviderKind =
                typeof lmsProviderKindRaw === 'string' ? lmsProviderKindRaw.trim() : '';
              const courseId = typeof courseIdRaw === 'string' ? courseIdRaw.trim() : '';
              const minScoreText = typeof minScoreRaw === 'string' ? minScoreRaw.trim() : '';
              const approvalRolesText =
                typeof approvalRolesRaw === 'string' ? approvalRolesRaw.trim() : '';
              const changeSummary =
                typeof changeSummaryRaw === 'string' ? changeSummaryRaw.trim() : '';

              if (
                name.length === 0 ||
                badgeTemplateId.length === 0 ||
                lmsProviderKind.length === 0 ||
                courseId.length === 0
              ) {
                setStatus(
                  ruleCreateStatus,
                  'Rule name, template, LMS provider, and course ID are required.',
                  true,
                );
                return;
              }

              const minScore = Number(minScoreText);

              if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
                setStatus(ruleCreateStatus, 'Minimum score must be a number between 0 and 100.', true);
                return;
              }

              const validRoles = new Set(['owner', 'admin', 'issuer', 'viewer']);
              const approvalRoles =
                approvalRolesText.length === 0
                  ? []
                  : approvalRolesText
                      .split(',')
                      .map((entry) => entry.trim())
                      .filter((entry) => entry.length > 0);
              const invalidRole = approvalRoles.find((role) => !validRoles.has(role));

              if (invalidRole !== undefined) {
                setStatus(
                  ruleCreateStatus,
                  'Invalid approval role: ' + invalidRole + '. Use owner/admin/issuer/viewer.',
                  true,
                );
                return;
              }

              const approvalChain = approvalRoles.map((requiredRole, index) => {
                return {
                  requiredRole,
                  label: 'Step ' + String(index + 1) + ' · ' + requiredRole,
                };
              });

              try {
                const response = await fetch(badgeRuleApiPath, {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    name,
                    ...(description.length > 0 ? { description } : {}),
                    badgeTemplateId,
                    lmsProviderKind,
                    definition: {
                      conditions: {
                        all: [
                          {
                            type: 'course_completion',
                            courseId,
                            requireCompleted: true,
                          },
                          {
                            type: 'grade_threshold',
                            courseId,
                            scoreField: 'final_score',
                            minScore,
                          },
                        ],
                      },
                    },
                    ...(approvalChain.length > 0 ? { approvalChain } : {}),
                    ...(changeSummary.length > 0 ? { changeSummary } : {}),
                  }),
                });
                const payload = await parseJsonBody(response);

                if (!response.ok) {
                  setStatus(ruleCreateStatus, errorDetailFromPayload(payload), true);
                  return;
                }

                const ruleId = payload && payload.rule && typeof payload.rule.id === 'string' ? payload.rule.id : '';
                const versionId =
                  payload && payload.version && typeof payload.version.id === 'string'
                    ? payload.version.id
                    : '';
                setStatus(
                  ruleCreateStatus,
                  'Rule draft created: ' + ruleId + (versionId.length > 0 ? ' (' + versionId + ')' : ''),
                  false,
                );
                setTimeout(() => {
                  window.location.assign(tenantAdminPath);
                }, 900);
              } catch {
                setStatus(ruleCreateStatus, 'Unable to create rule draft from this browser session.', true);
              }
            });
          }

          if (ruleEvaluateForm instanceof HTMLFormElement && ruleEvaluateStatus instanceof HTMLElement) {
            ruleEvaluateForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              setStatus(ruleEvaluateStatus, 'Evaluating rule...', false);
              const data = new FormData(ruleEvaluateForm);
              const ruleIdRaw = data.get('ruleId');
              const learnerIdRaw = data.get('learnerId');
              const recipientIdentityRaw = data.get('recipientIdentity');
              const courseIdRaw = data.get('courseId');
              const finalScoreRaw = data.get('finalScore');
              const completed = data.get('completed') !== null;
              const dryRun = data.get('dryRun') !== null;
              const ruleId = typeof ruleIdRaw === 'string' ? ruleIdRaw.trim() : '';
              const learnerId = typeof learnerIdRaw === 'string' ? learnerIdRaw.trim() : '';
              const recipientIdentity =
                typeof recipientIdentityRaw === 'string'
                  ? recipientIdentityRaw.trim().toLowerCase()
                  : '';
              const courseId = typeof courseIdRaw === 'string' ? courseIdRaw.trim() : '';
              const finalScoreText = typeof finalScoreRaw === 'string' ? finalScoreRaw.trim() : '';
              const finalScore = Number(finalScoreText);

              if (
                ruleId.length === 0 ||
                learnerId.length === 0 ||
                recipientIdentity.length === 0 ||
                courseId.length === 0
              ) {
                setStatus(
                  ruleEvaluateStatus,
                  'Rule, learner ID, recipient email, and course ID are required.',
                  true,
                );
                return;
              }

              if (!Number.isFinite(finalScore) || finalScore < 0 || finalScore > 100) {
                setStatus(ruleEvaluateStatus, 'Final score must be a number between 0 and 100.', true);
                return;
              }

              const evaluatePath = badgeRuleApiPath + '/' + encodeURIComponent(ruleId) + '/evaluate';
              let selectedVersionId = '';
              const ruleSelect = ruleEvaluateForm.elements.namedItem('ruleId');

              if (ruleSelect instanceof HTMLSelectElement) {
                const selectedOption = ruleSelect.selectedOptions.item(0);
                selectedVersionId = selectedOption?.dataset.versionId?.trim() ?? '';
              }

              try {
                const response = await fetch(evaluatePath, {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    learnerId,
                    recipientIdentity,
                    recipientIdentityType: 'email',
                    dryRun,
                    ...(selectedVersionId.length > 0 ? { versionId: selectedVersionId } : {}),
                    facts: {
                      grades: [
                        {
                          courseId,
                          learnerId,
                          finalScore,
                        },
                      ],
                      completions: [
                        {
                          courseId,
                          learnerId,
                          completed,
                          completionPercent: completed ? 100 : 0,
                        },
                      ],
                    },
                  }),
                });
                const payload = await parseJsonBody(response);

                if (!response.ok) {
                  setStatus(ruleEvaluateStatus, errorDetailFromPayload(payload), true);
                  return;
                }

                const matched =
                  Boolean(payload && payload.evaluation && payload.evaluation.matched === true) ===
                  true;
                const issuanceStatus =
                  payload && payload.issuance && typeof payload.issuance.status === 'string'
                    ? payload.issuance.status
                    : dryRun
                      ? 'dry_run'
                      : 'not_issued';
                const assertionId =
                  payload && payload.issuance && typeof payload.issuance.assertionId === 'string'
                    ? payload.issuance.assertionId
                    : null;
                const suffix =
                  assertionId === null
                    ? ''
                    : ' Assertion: ' + assertionId + '.';
                setStatus(
                  ruleEvaluateStatus,
                  'Evaluation complete. matched=' +
                    String(matched) +
                    ', issuance=' +
                    issuanceStatus +
                    '.' +
                    suffix,
                  false,
                );
              } catch {
                setStatus(ruleEvaluateStatus, 'Unable to evaluate rule from this browser session.', true);
              }
            });
          }

          if (ruleActionStatus instanceof HTMLElement) {
            const postRuleAction = async (candidate, actionPath, body, actionLabel) => {
              if (!(candidate instanceof HTMLButtonElement)) {
                return;
              }

              if (typeof actionPath !== 'string' || actionPath.length === 0) {
                setStatus(ruleActionStatus, 'Missing rule action path.', true);
                return;
              }

              candidate.disabled = true;
              setStatus(ruleActionStatus, actionLabel + '...', false);

              try {
                const response = await fetch(actionPath, {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify(body),
                });
                const payload = await parseJsonBody(response);

                if (!response.ok) {
                  setStatus(ruleActionStatus, errorDetailFromPayload(payload), true);
                  candidate.disabled = false;
                  return;
                }

                setStatus(ruleActionStatus, actionLabel + ' complete.', false);
                setTimeout(() => {
                  window.location.assign(tenantAdminPath);
                }, 700);
              } catch {
                setStatus(ruleActionStatus, 'Unable to perform rule action.', true);
                candidate.disabled = false;
              }
            };

            document.querySelectorAll('button[data-rule-submit-path]').forEach((candidate) => {
              if (!(candidate instanceof HTMLButtonElement)) {
                return;
              }

              candidate.addEventListener('click', async () => {
                await postRuleAction(
                  candidate,
                  candidate.dataset.ruleSubmitPath,
                  {},
                  'Submitting rule for approval',
                );
              });
            });

            document.querySelectorAll('button[data-rule-decision-path]').forEach((candidate) => {
              if (!(candidate instanceof HTMLButtonElement)) {
                return;
              }

              candidate.addEventListener('click', async () => {
                const decision = candidate.dataset.ruleDecision;
                const label = candidate.dataset.ruleLabel ?? 'rule';

                if (decision !== 'approved' && decision !== 'rejected') {
                  setStatus(ruleActionStatus, 'Invalid decision for selected rule action.', true);
                  return;
                }

                const confirmed = window.confirm(
                  (decision === 'approved' ? 'Approve' : 'Reject') +
                    ' latest version for "' +
                    label +
                    '"?',
                );

                if (!confirmed) {
                  return;
                }

                await postRuleAction(
                  candidate,
                  candidate.dataset.ruleDecisionPath,
                  { decision },
                  (decision === 'approved' ? 'Approving' : 'Rejecting') + ' rule version',
                );
              });
            });

            document.querySelectorAll('button[data-rule-activate-path]').forEach((candidate) => {
              if (!(candidate instanceof HTMLButtonElement)) {
                return;
              }

              candidate.addEventListener('click', async () => {
                const label = candidate.dataset.ruleLabel ?? 'rule';
                const confirmed = window.confirm('Activate latest approved version for "' + label + '"?');

                if (!confirmed) {
                  return;
                }

                await postRuleAction(
                  candidate,
                  candidate.dataset.ruleActivatePath,
                  {},
                  'Activating rule version',
                );
              });
            });
          }

          if (apiKeyRevokeStatus instanceof HTMLElement) {
            document
              .querySelectorAll('button[data-revoke-api-key-path]')
              .forEach((candidate) => {
                if (!(candidate instanceof HTMLButtonElement)) {
                  return;
                }

                candidate.addEventListener('click', async () => {
                  const revokePath = candidate.dataset.revokeApiKeyPath;
                  const label = candidate.dataset.apiKeyLabel ?? 'API key';

                  if (typeof revokePath !== 'string' || revokePath.length === 0) {
                    setStatus(apiKeyRevokeStatus, 'Missing revoke path for selected key.', true);
                    return;
                  }

                  if (!window.confirm('Revoke key "' + label + '"? This action cannot be undone.')) {
                    return;
                  }

                  candidate.disabled = true;
                  setStatus(apiKeyRevokeStatus, 'Revoking API key...', false);

                  try {
                    const response = await fetch(revokePath, {
                      method: 'POST',
                      headers: {
                        'content-type': 'application/json',
                      },
                      body: JSON.stringify({}),
                    });
                    const payload = await parseJsonBody(response);

                    if (!response.ok) {
                      setStatus(apiKeyRevokeStatus, errorDetailFromPayload(payload), true);
                      candidate.disabled = false;
                      return;
                    }

                    setStatus(apiKeyRevokeStatus, 'API key revoked.', false);
                    setTimeout(() => {
                      window.location.assign(tenantAdminPath);
                    }, 700);
                  } catch {
                    setStatus(
                      apiKeyRevokeStatus,
                      'Unable to revoke API key from this browser session.',
                      true,
                    );
                    candidate.disabled = false;
                  }
                });
              });
          }
        })();
      </script>
    </section>`,
  );
};
