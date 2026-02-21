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
import { renderPageAssetTags } from '../ui/page-assets';
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

const serializeJsonScriptContent = (value: unknown): string => {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
};

export const institutionAdminDashboardPage = (input: {
  tenant: TenantRecord;
  userId: string;
  userEmail?: string;
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
  const userLabel = input.userEmail ?? input.userId;
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
  const adminPageContextJson = serializeJsonScriptContent({
    tenantAdminPath,
    manualIssueApiPath,
    createApiKeyPath,
    createOrgUnitPath,
    badgeRuleApiPath,
  });

  return renderPageShell(
    `Institution Admin · ${input.tenant.displayName}`,
    `<section class="ct-admin ct-stack">
      <header class="ct-admin__hero ct-stack">
        <h1>Institution Admin</h1>
        <p>Browser-first control surface for tenant operations and badge issuance.</p>
        <div class="ct-admin__meta-grid ct-cluster">
          <span class="ct-admin__pill">Tenant: ${escapeHtml(input.tenant.id)}</span>
          <span class="ct-admin__pill">Plan: ${escapeHtml(input.tenant.planTier)}</span>
          <span class="ct-admin__pill">Role: ${escapeHtml(input.membershipRole)}</span>
          <span class="ct-admin__pill" title="User ID: ${escapeHtml(input.userId)}">User: ${escapeHtml(
            userLabel,
          )}</span>
        </div>
      </header>
      <section class="ct-admin__layout ct-grid ct-grid--sidebar">
        <div class="ct-admin__grid ct-stack">
          <article class="ct-admin__panel ct-stack">
            <h2>Manual Issue Badge</h2>
            <p>Issue a badge now from this page without curl.</p>
            <form id="manual-issue-form" class="ct-admin__form ct-stack">
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
          <article class="ct-admin__panel ct-stack">
            <h2>Create Tenant API Key</h2>
            <p>Create a scoped key and reveal the secret once.</p>
            <form id="api-key-form" class="ct-admin__form ct-stack">
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
          <article class="ct-admin__panel ct-stack">
            <h2>Create Org Unit</h2>
            <p>Add college/department/program hierarchy from this page.</p>
            <p class="ct-admin__hint">Hierarchy: college → institution, department → college, program → department.</p>
            <form id="org-unit-form" class="ct-admin__form ct-stack">
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
          <article class="ct-admin__panel ct-stack">
            <h2>Create Badge Rule</h2>
            <p>Create a first draft rule with approval chain metadata.</p>
            <form id="rule-create-form" class="ct-admin__form ct-stack">
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
          <article class="ct-admin__panel ct-stack">
            <h2>Evaluate Rule</h2>
            <p>Run rule evaluation (dry run by default) and optionally issue now.</p>
            <form id="rule-evaluate-form" class="ct-admin__form ct-stack">
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
              <label class="ct-admin__checkbox-row ct-checkbox-row">
                <input name="completed" type="checkbox" checked />
                Learner completed course
              </label>
              <label class="ct-admin__checkbox-row ct-checkbox-row">
                <input name="dryRun" type="checkbox" checked />
                Dry run (don’t issue badge)
              </label>
              <button type="submit">Evaluate rule</button>
            </form>
            <p id="rule-evaluate-status" class="ct-admin__status"></p>
          </article>
        </div>
        <div class="ct-admin__grid ct-stack">
          <article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
          <article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
          <article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
          <article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
      <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
    </section>`,
    renderPageAssetTags(['foundationCss', 'institutionAdminCss', 'institutionAdminJs']),
  );
};
