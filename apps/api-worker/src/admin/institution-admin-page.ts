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
  const tenantAdminPath = `/tenants/${encodeURIComponent(input.tenant.id)}/admin`;
  const ruleBuilderPath = `${tenantAdminPath}/rules/new`;

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
            const criteriaRegistryHref = `/showcase/${encodeURIComponent(
              input.tenant.id,
            )}/criteria?badgeTemplateId=${encodeURIComponent(template.id)}`;
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
              <td>
                <a href="${escapeHtml(showcaseHref)}" target="_blank" rel="noopener noreferrer">Showcase</a>
                ·
                <a href="${escapeHtml(criteriaRegistryHref)}" target="_blank" rel="noopener noreferrer">Criteria</a>
              </td>
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
      ? `<tr><td colspan="8" class="ct-admin__empty">No badge rules found. <a href="${escapeHtml(
          ruleBuilderPath,
        )}">Create your first rule</a>.</td></tr>`
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

  const manualIssueApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/assertions/manual-issue`;
  const createApiKeyPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/api-keys`;
  const createOrgUnitPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/org-units`;
  const badgeTemplateApiPathPrefix = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-templates`;
  const badgeRuleApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rules`;
  const badgeRuleValueListApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rule-value-lists`;
  const badgeRulePreviewSimulationApiPath = `${badgeRuleApiPath}/preview-simulate`;
  const badgeRuleReviewQueueApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rules/review-queue`;
  const assertionsApiPathPrefix = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/assertions`;
  const tenantUsersApiPathPrefix = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/users`;
  const adminAuditLogPath = `/admin/audit-logs?tenantId=${encodeURIComponent(input.tenant.id)}`;
  const showcasePath = `/showcase/${encodeURIComponent(input.tenant.id)}`;
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
  const activeOrgUnitOptions = input.orgUnits
    .filter((orgUnit) => orgUnit.isActive)
    .map((orgUnit) => {
      return `<option value="${escapeHtml(orgUnit.id)}">${escapeHtml(
        `${orgUnit.displayName} (${orgUnit.unitType})`,
      )}</option>`;
    })
    .join('\n');
  const templateOptions = input.badgeTemplates
    .map((template, index) => {
      return `<option value="${escapeHtml(template.id)}"${index === 0 ? ' selected' : ''}>${escapeHtml(
        `${template.title} (${template.id})`,
      )}</option>`;
    })
    .join('\n');
  const templateFilterOptions = input.badgeTemplates
    .map((template) => {
      return `<option value="${escapeHtml(template.id)}">${escapeHtml(template.title)}</option>`;
    })
    .join('\n');
  const formatRuleOption = (rule: BadgeIssuanceRuleRecord, includeSelected: boolean, index: number): string => {
      const versions = versionsByRuleId.get(rule.id) ?? [];
      const latestVersion = versions[0] ?? null;

      return `<option value="${escapeHtml(rule.id)}"${includeSelected && index === 0 ? ' selected' : ''} data-version-id="${escapeHtml(
        latestVersion?.id ?? '',
      )}" data-version-status="${escapeHtml(latestVersion?.status ?? 'none')}" data-rule-label="${escapeHtml(
        rule.name,
      )}">${escapeHtml(
        `${rule.name} (${rule.id}) · latest ${latestVersion === null ? 'none' : `v${String(
          latestVersion.versionNumber,
        )} ${latestVersion.status}`}`,
      )}</option>`;
    };
  const ruleOptions = input.badgeRules
    .map((rule, index) => formatRuleOption(rule, true, index))
    .join('\n');
  const templateSelectOptions =
    templateOptions.length > 0
      ? templateOptions
      : '<option value="">No badge templates available</option>';
  const activeOrgUnitSelectOptions =
    activeOrgUnitOptions.length > 0
      ? activeOrgUnitOptions
      : '<option value="">No active org units available</option>';
  const ruleSelectOptions =
    ruleOptions.length > 0 ? ruleOptions : '<option value="">No rules available</option>';
  const adminPageContextJson = serializeJsonScriptContent({
    tenantAdminPath,
    manualIssueApiPath,
    createApiKeyPath,
    createOrgUnitPath,
    badgeTemplateApiPathPrefix,
    badgeRuleApiPath,
    badgeRuleValueListApiPath,
    badgeRulePreviewSimulationApiPath,
    badgeRuleReviewQueueApiPath,
    assertionsApiPathPrefix,
    tenantUsersApiPathPrefix,
  });
  const workspaceCardsMarkup = `<section class="ct-admin__workspace-grid ct-grid" aria-label="Institution admin workstreams">
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Credential operations</p>
      <h2>Issue, inspect, and change lifecycle state</h2>
      <p>
        Handle one-off issuance, tenant-wide assertion review, and direct lifecycle changes from the same operational lane.
      </p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${ruleCount} rules</span>
        <span class="ct-admin__status-pill">${badgeTemplateCount} templates</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="#manual-issue-panel">Manual issue</a>
        <a class="ct-admin__button ct-admin__button--secondary" href="#issued-badges-panel">Issued ledger</a>
        <a class="ct-admin__button ct-admin__button--secondary" href="#lifecycle-panel">Lifecycle</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Rule design</p>
      <h2>Build eligibility logic before it reaches governance</h2>
      <p>
        Keep rule authoring separate from ledger operations. Start in the dedicated builder, then use governance tools for approvals and audit context.
      </p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${ruleCount} active rule records</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(ruleBuilderPath)}">Open rule builder</a>
        <a class="ct-admin__button ct-admin__button--secondary" href="#rule-builder-panel">Governance tools</a>
        <a class="ct-admin__button ct-admin__button--secondary" href="#template-image-panel">Templates</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Access and structure</p>
      <h2>Control keys, delegation, and org-unit scope</h2>
      <p>
        Configure the people and integrations that are allowed to issue or manage credentials for this tenant.
      </p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${activeApiKeyCount} active keys</span>
        <span class="ct-admin__status-pill">${orgUnitCount} org units</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="#api-key-panel">API keys</a>
        <a class="ct-admin__button ct-admin__button--secondary" href="#org-unit-panel">Org units</a>
        <a class="ct-admin__button ct-admin__button--secondary" href="#governance-panel">Delegation</a>
      </div>
    </article>
  </section>`;

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
        <nav class="ct-admin__quick-links ct-cluster" aria-label="Governance operations">
          <a href="#manual-issue-panel">Issue & lifecycle</a>
          <a href="${escapeHtml(ruleBuilderPath)}">Rule builder</a>
          <a href="#api-key-panel">Access & integrations</a>
          <a href="#issued-badges-panel">Issued ledger</a>
          <a href="${escapeHtml(adminAuditLogPath)}">Audit logs</a>
          <a href="${escapeHtml(showcasePath)}" target="_blank" rel="noopener noreferrer">Public showcase</a>
        </nav>
      </header>
      ${workspaceCardsMarkup}
      <section class="ct-admin__layout ct-grid ct-grid--sidebar">
        <div class="ct-admin__grid ct-stack">
          <article id="manual-issue-panel" class="ct-admin__panel ct-stack">
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
          <article id="template-image-panel" class="ct-admin__panel ct-stack">
            <h2>Upload Badge Template Image</h2>
            <p>Upload template artwork (PNG, JPEG, or WebP, max 2 MB).</p>
            <form id="badge-template-image-upload-form" class="ct-admin__form ct-stack">
              <label>
                Badge template
                <select name="badgeTemplateId" required>
                  ${templateSelectOptions}
                </select>
              </label>
              <label>
                Image file
                <input
                  name="file"
                  type="file"
                  required
                  accept="image/png,image/jpeg,image/webp"
                />
              </label>
              <button type="submit">Upload image</button>
            </form>
            <p id="badge-template-image-upload-status" class="ct-admin__status"></p>
          </article>
          <article id="api-key-panel" class="ct-admin__panel ct-stack">
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
          <article id="org-unit-panel" class="ct-admin__panel ct-stack">
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
          <article id="governance-panel" class="ct-admin__panel ct-stack">
            <h2>Governance Delegation</h2>
            <p>Assign org-unit scope and delegated issuing authority from this browser session.</p>
            <form id="membership-scope-form" class="ct-admin__form ct-stack">
              <label>
                User ID
                <input name="userId" type="text" required placeholder="usr_issuer" />
              </label>
              <label>
                Org unit
                <select name="orgUnitId" required>
                  ${activeOrgUnitSelectOptions}
                </select>
              </label>
              <label>
                Scoped role
                <select name="role" required>
                  <option value="viewer">viewer</option>
                  <option value="issuer">issuer</option>
                  <option value="admin">admin</option>
                  <option value="owner">owner</option>
                </select>
              </label>
              <button type="submit">Assign org-unit scope</button>
            </form>
            <p id="membership-scope-status" class="ct-admin__status"></p>
            <form id="membership-scope-remove-form" class="ct-admin__form ct-stack">
              <label>
                User ID
                <input name="userId" type="text" required placeholder="usr_issuer" />
              </label>
              <label>
                Org unit
                <select name="orgUnitId" required>
                  ${activeOrgUnitSelectOptions}
                </select>
              </label>
              <button type="submit" class="ct-admin__button--danger">Remove org-unit scope</button>
            </form>
            <p id="membership-scope-remove-status" class="ct-admin__status"></p>
            <form id="delegated-grant-form" class="ct-admin__form ct-stack">
              <label>
                Delegate user ID
                <input name="delegateUserId" type="text" required placeholder="usr_issuer" />
              </label>
              <label>
                Org unit
                <select name="orgUnitId" required>
                  ${activeOrgUnitSelectOptions}
                </select>
              </label>
              <fieldset class="ct-admin__fieldset ct-stack">
                <legend>Allowed actions</legend>
                <label class="ct-admin__checkbox-row ct-checkbox-row">
                  <input name="allowedAction" type="checkbox" value="issue_badge" checked />
                  issue_badge
                </label>
                <label class="ct-admin__checkbox-row ct-checkbox-row">
                  <input name="allowedAction" type="checkbox" value="revoke_badge" />
                  revoke_badge
                </label>
                <label class="ct-admin__checkbox-row ct-checkbox-row">
                  <input name="allowedAction" type="checkbox" value="manage_lifecycle" />
                  manage_lifecycle
                </label>
              </fieldset>
              <label>
                Badge template IDs (optional, comma separated)
                <input
                  name="badgeTemplateIds"
                  type="text"
                  placeholder="badge_template_001,badge_template_002"
                />
              </label>
              <label>
                Ends at (optional)
                <input name="endsAt" type="datetime-local" />
              </label>
              <label>
                Reason (optional)
                <input name="reason" type="text" placeholder="Delegated for spring term operations." />
              </label>
              <button type="submit">Grant authority</button>
            </form>
            <p id="delegated-grant-status" class="ct-admin__status"></p>
            <form id="delegated-revoke-form" class="ct-admin__form ct-stack">
              <label>
                Delegate user ID
                <input name="delegateUserId" type="text" required placeholder="usr_issuer" />
              </label>
              <label>
                Grant ID
                <input name="grantId" type="text" required placeholder="dag_123" />
              </label>
              <label>
                Revocation reason (optional)
                <input name="reason" type="text" placeholder="Authority transfer complete." />
              </label>
              <button type="submit" class="ct-admin__button--danger">Revoke delegated grant</button>
            </form>
            <p id="delegated-revoke-status" class="ct-admin__status"></p>
          </article>
          <article id="rule-builder-panel" class="ct-admin__panel ct-stack">
            <h2>Rule Builder Workspace</h2>
            <p>
              Open the dedicated full-width builder for step-based rule authoring, test mode, and
              review.
            </p>
            <p>
              <a class="ct-admin__cta-link" href="${escapeHtml(ruleBuilderPath)}">Open rule builder</a>
            </p>
            <p class="ct-admin__hint">
              Includes condition cards, JSON import/export, local draft save/load, and dry-run
              evaluation.
            </p>
          </article>
          <article id="rule-value-lists-panel" class="ct-admin__panel ct-stack">
            <h2>Rule Value Lists</h2>
            <p>Create reusable course and badge-template lists so authors stop copying long IDs into every rule.</p>
            <form id="rule-value-list-form" class="ct-admin__form ct-stack">
              <label>
                Label
                <input name="label" type="text" required placeholder="Core CS sequence" />
              </label>
              <label>
                List kind
                <select name="kind" required>
                  <option value="course_ids">Course IDs</option>
                  <option value="badge_template_ids">Badge template IDs</option>
                </select>
              </label>
              <label>
                Values (comma separated)
                <textarea
                  name="values"
                  rows="4"
                  required
                  spellcheck="false"
                  placeholder="CS101, CS102, CS103"
                ></textarea>
              </label>
              <button type="submit">Create value list</button>
            </form>
            <p id="rule-value-list-status" class="ct-admin__status"></p>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Kind</th>
                    <th>Values</th>
                  </tr>
                </thead>
                <tbody id="rule-value-list-body">
                  <tr>
                    <td colspan="3" class="ct-admin__empty">No rule value lists loaded yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
          <article id="lifecycle-panel" class="ct-admin__panel ct-stack">
            <h2>Credential Lifecycle</h2>
            <p>Lookup lifecycle state and apply transitions with institutional reason codes.</p>
            <form id="assertion-lifecycle-view-form" class="ct-admin__form ct-stack">
              <label>
                Assertion ID
                <input name="assertionId" type="text" required placeholder="tenant_123:assertion_456" />
              </label>
              <button type="submit">Load lifecycle</button>
            </form>
            <p id="assertion-lifecycle-view-status" class="ct-admin__status"></p>
            <pre id="assertion-lifecycle-output" class="ct-admin__code-output" hidden></pre>
            <form id="assertion-lifecycle-transition-form" class="ct-admin__form ct-stack">
              <label>
                Assertion ID
                <input name="assertionId" type="text" required placeholder="tenant_123:assertion_456" />
              </label>
              <label>
                Transition to
                <select name="toState" required>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="revoked">revoked</option>
                  <option value="expired">expired</option>
                </select>
              </label>
              <label>
                Reason code
                <select name="reasonCode" required>
                  <option value="administrative_hold">administrative_hold</option>
                  <option value="policy_violation">policy_violation</option>
                  <option value="appeal_pending">appeal_pending</option>
                  <option value="appeal_resolved">appeal_resolved</option>
                  <option value="credential_expired">credential_expired</option>
                  <option value="issuer_requested">issuer_requested</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label>
                Reason details (optional)
                <input name="reason" type="text" placeholder="Explain why this transition is being applied." />
              </label>
              <button type="submit">Apply transition</button>
            </form>
            <p id="assertion-lifecycle-transition-status" class="ct-admin__status"></p>
          </article>
          <article class="ct-admin__panel ct-stack">
            <h2>Rule Governance Context</h2>
            <p>Inspect latest approval chain and rule audit events for operator drill-down.</p>
            <form id="rule-governance-form" class="ct-admin__form ct-stack">
              <label>
                Rule
                <select name="ruleId" required>
                  ${ruleSelectOptions}
                </select>
              </label>
              <label>
                Audit log limit
                <input name="auditLimit" type="number" min="1" max="100" step="1" value="20" />
              </label>
              <button type="submit">Load governance context</button>
            </form>
            <p id="rule-governance-status" class="ct-admin__status"></p>
            <pre id="rule-governance-output" class="ct-admin__code-output" hidden></pre>
          </article>
        </div>
        <div class="ct-admin__grid ct-stack">
          <article id="rule-review-queue-panel" class="ct-admin__panel ct-admin__panel--table ct-stack">
            <h2>Rule Review Queue</h2>
            <p>Missing-data evaluations that require a human issue-or-dismiss decision before a badge is created.</p>
            <div class="ct-admin__actions">
              <button
                id="rule-review-queue-refresh"
                type="button"
                class="ct-admin__button ct-admin__button--tiny ct-admin__button--secondary"
              >
                Refresh review queue
              </button>
            </div>
            <p id="rule-review-queue-status" class="ct-admin__status">No review queue entries loaded yet.</p>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Evaluated</th>
                    <th>Recipient</th>
                    <th>Rule</th>
                    <th>Summary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="rule-review-queue-body">
                  <tr>
                    <td colspan="5" class="ct-admin__empty">No review queue entries loaded yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
          <article id="issued-badges-panel" class="ct-admin__panel ct-admin__panel--table ct-stack">
            <h2>Issued Badges Ledger</h2>
            <p>Tenant-wide assertion log with direct audit and revocation actions.</p>
            <form id="issued-badges-filter-form" class="ct-admin__form ct-admin__form--inline ct-grid">
              <label>
                Recipient / assertion search
                <input
                  name="recipientQuery"
                  type="text"
                  placeholder="csev@umich.edu or tenant_123:assertion_456"
                />
              </label>
              <label>
                Badge template
                <select name="badgeTemplateId">
                  <option value="">All templates</option>
                  ${templateFilterOptions}
                </select>
              </label>
              <label>
                Lifecycle state
                <select name="state">
                  <option value="">All states</option>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="revoked">revoked</option>
                  <option value="expired">expired</option>
                </select>
              </label>
              <label>
                Limit
                <input name="limit" type="number" min="1" max="500" step="1" value="100" />
              </label>
              <button type="submit">Load issued badges</button>
            </form>
            <p id="issued-badges-status" class="ct-admin__status">Load tenant assertions from the browser.</p>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Issued</th>
                    <th>Recipient</th>
                    <th>Template</th>
                    <th>State</th>
                    <th>Assertion</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="issued-badges-body">
                  <tr>
                    <td colspan="6" class="ct-admin__empty">
                      No assertions loaded yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p id="issued-badges-action-status" class="ct-admin__status"></p>
          </article>
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
