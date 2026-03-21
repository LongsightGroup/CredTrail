import type {
  BadgeIssuanceRuleRecord,
  BadgeIssuanceRuleVersionRecord,
  BadgeTemplateRecord,
  DelegatedIssuingAuthorityGrantRecord,
  TenantBreakGlassAccountRecord,
  TenantApiKeyRecord,
  TenantAuthPolicyRecord,
  TenantAuthProviderRecord,
  TenantMembershipOrgUnitScopeRecord,
  TenantMembershipRole,
  TenantOrgUnitRecord,
  TenantReportingOverviewRecord,
  TenantRecord,
} from "@credtrail/db";
import { renderPageShell } from "@credtrail/ui-components";
import type { ReportingMetricEntry } from "../reporting/metric-definitions";
import { renderPageAssetTags } from "../ui/page-assets";
import { escapeHtml, formatIsoTimestamp } from "../utils/display-format";

const formatScopesSummary = (scopesJson: string): string => {
  try {
    const parsed = JSON.parse(scopesJson) as unknown;

    if (!Array.isArray(parsed)) {
      return scopesJson;
    }

    return parsed
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0)
      .join(", ");
  } catch {
    return scopesJson;
  }
};

const serializeJsonScriptContent = (value: unknown): string => {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
};

const formatJsonTextareaValue = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const formatDelegatedIssuingActionLabel = (action: string): string => {
  switch (action) {
    case "issue_badge":
      return "Issue badges";
    case "revoke_badge":
      return "Revoke badges";
    case "manage_lifecycle":
      return "Change badge status";
    default:
      return action;
  }
};

type InstitutionAdminView =
  | "home"
  | "operations"
  | "operationsReviewQueue"
  | "operationsIssuedBadges"
  | "operationsBadgeStatus"
  | "reporting"
  | "rules"
  | "access"
  | "accessGovernance"
  | "accessApiKeys"
  | "accessOrgUnits";

interface InstitutionAdminPageInput {
  tenant: TenantRecord;
  userId: string;
  userEmail?: string;
  membershipRole: TenantMembershipRole;
  badgeTemplates: readonly BadgeTemplateRecord[];
  orgUnits: readonly TenantOrgUnitRecord[];
  membershipOrgUnitScopes: readonly TenantMembershipOrgUnitScopeRecord[];
  delegatedIssuingAuthorityGrants: readonly DelegatedIssuingAuthorityGrantRecord[];
  activeApiKeys: readonly TenantApiKeyRecord[];
  revokedApiKeyCount: number;
  badgeRules: readonly BadgeIssuanceRuleRecord[];
  badgeRuleVersions: readonly BadgeIssuanceRuleVersionRecord[];
  reportingOverview?: TenantReportingOverviewRecord | null;
  reportingMetrics?: readonly ReportingMetricEntry[];
  enterpriseAuthPolicy?: TenantAuthPolicyRecord | null;
  enterpriseAuthProviders?: readonly TenantAuthProviderRecord[];
  breakGlassAccounts?: readonly TenantBreakGlassAccountRecord[];
  switchOrganizationPath?: string | null;
}

const renderInstitutionAdminPage = (
  input: InstitutionAdminPageInput,
  view: InstitutionAdminView,
): string => {
  const templateById = new Map(input.badgeTemplates.map((template) => [template.id, template]));
  const orgUnitById = new Map(input.orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
  const versionsByRuleId = new Map<string, BadgeIssuanceRuleVersionRecord[]>();
  const tenantAdminPath = `/tenants/${encodeURIComponent(input.tenant.id)}/admin`;
  const operationsPath = `${tenantAdminPath}/operations`;
  const operationsReviewQueuePath = `${operationsPath}/review-queue`;
  const operationsIssuedBadgesPath = `${operationsPath}/issued-badges`;
  const operationsBadgeStatusPath = `${operationsPath}/badge-status`;
  const reportingPath = `${tenantAdminPath}/reporting`;
  const rulesWorkspacePath = `${tenantAdminPath}/rules`;
  const accessPath = `${tenantAdminPath}/access`;
  const accessGovernancePath = `${accessPath}/governance`;
  const accessApiKeysPath = `${accessPath}/api-keys`;
  const accessOrgUnitsPath = `${accessPath}/org-units`;
  const ruleBuilderPath = `${tenantAdminPath}/rules/new`;
  const badgeTemplateCount = String(input.badgeTemplates.length);
  const orgUnitCount = String(input.orgUnits.length);
  const activeApiKeyCount = String(input.activeApiKeys.length);
  const revokedApiKeyCount = String(input.revokedApiKeyCount);
  const ruleCount = String(input.badgeRules.length);
  const scopedRoleCount = String(input.membershipOrgUnitScopes.length);
  const activeDelegationCount = String(
    input.delegatedIssuingAuthorityGrants.filter(
      (grant) => grant.status === "active" || grant.status === "scheduled",
    ).length,
  );
  const userLabel = input.userEmail ?? input.userId;
  const switchOrganizationPath = input.switchOrganizationPath?.trim() ?? "";
  const reportingOverview = input.reportingOverview ?? null;
  const reportingMetrics = input.reportingMetrics ?? [];
  const renderOrgUnitSummary = (orgUnitId: string): string => {
    const orgUnit = orgUnitById.get(orgUnitId);

    if (orgUnit === undefined) {
      return `<strong>${escapeHtml(orgUnitId)}</strong>`;
    }

    return `<strong>${escapeHtml(orgUnit.displayName)}</strong><div class="ct-admin__meta">${escapeHtml(
      `${orgUnit.id} · ${orgUnit.unitType}`,
    )}</div>`;
  };
  const renderBadgeTemplateScopeSummary = (badgeTemplateIds: readonly string[]): string => {
    if (badgeTemplateIds.length === 0) {
      return "All badge templates in scope";
    }

    return badgeTemplateIds
      .map((badgeTemplateId) => templateById.get(badgeTemplateId)?.title ?? badgeTemplateId)
      .join(", ");
  };

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
          .join("\n");

  const orgUnitRows =
    input.orgUnits.length === 0
      ? `<tr><td colspan="4" class="ct-admin__empty">No org units found.</td></tr>`
      : input.orgUnits
          .map((orgUnit) => {
            return `<tr>
              <td>${escapeHtml(orgUnit.displayName)}</td>
              <td>${escapeHtml(orgUnit.unitType)}</td>
              <td>${escapeHtml(orgUnit.id)}</td>
              <td>${orgUnit.isActive ? "Active" : "Inactive"}</td>
            </tr>`;
          })
          .join("\n");

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
              <td>${escapeHtml(apiKey.expiresAt === null ? "Never" : formatIsoTimestamp(apiKey.expiresAt))}</td>
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
          .join("\n");

  const membershipScopeRows =
    input.membershipOrgUnitScopes.length === 0
      ? `<tr><td colspan="5" class="ct-admin__empty">No scoped roles assigned yet.</td></tr>`
      : input.membershipOrgUnitScopes
          .map((scope) => {
            const scopeLabel = orgUnitById.get(scope.orgUnitId)?.displayName ?? scope.orgUnitId;

            return `<tr>
              <td><strong>${escapeHtml(scope.userId)}</strong></td>
              <td>${renderOrgUnitSummary(scope.orgUnitId)}</td>
              <td><span class="ct-admin__status-pill">${escapeHtml(scope.role)}</span></td>
              <td>${escapeHtml(formatIsoTimestamp(scope.updatedAt))}</td>
              <td>
                <button
                  type="button"
                  class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger"
                  data-membership-scope-remove-user-id="${escapeHtml(scope.userId)}"
                  data-membership-scope-remove-org-unit-id="${escapeHtml(scope.orgUnitId)}"
                  data-membership-scope-remove-label="${escapeHtml(`${scope.userId} · ${scopeLabel}`)}"
                >
                  Remove
                </button>
              </td>
            </tr>`;
          })
          .join("\n");

  const delegatedGrantRows =
    input.delegatedIssuingAuthorityGrants.length === 0
      ? `<tr><td colspan="6" class="ct-admin__empty">No delegated authority grants exist yet.</td></tr>`
      : input.delegatedIssuingAuthorityGrants
          .map((grant) => {
            const canRemove = grant.status === "active" || grant.status === "scheduled";
            const statusMeta =
              grant.status === "revoked"
                ? grant.revokedAt === null
                  ? "Removed"
                  : `Removed ${formatIsoTimestamp(grant.revokedAt)}`
                : `Ends ${formatIsoTimestamp(grant.endsAt)}`;
            const revokedReasonMarkup =
              grant.revokedReason === null
                ? ""
                : `<div class="ct-admin__meta">Reason: ${escapeHtml(grant.revokedReason)}</div>`;

            return `<tr>
              <td>
                <strong>${escapeHtml(grant.delegateUserId)}</strong>
                <div class="ct-admin__meta">${escapeHtml(grant.id)}</div>
              </td>
              <td>${renderOrgUnitSummary(grant.orgUnitId)}</td>
              <td>
                ${escapeHtml(
                  grant.allowedActions.map((action) => formatDelegatedIssuingActionLabel(action)).join(", "),
                )}
                <div class="ct-admin__meta">${escapeHtml(
                  renderBadgeTemplateScopeSummary(grant.badgeTemplateIds),
                )}</div>
              </td>
              <td>
                <strong>${escapeHtml(formatIsoTimestamp(grant.startsAt))}</strong>
                <div class="ct-admin__meta">Starts</div>
                <div class="ct-admin__meta">Granted by ${escapeHtml(
                  grant.delegatedByUserId ?? "system",
                )}</div>
              </td>
              <td>
                <span class="ct-admin__status-pill ct-admin__status-pill--${escapeHtml(
                  grant.status,
                )}">${escapeHtml(grant.status)}</span>
                <div class="ct-admin__meta">${escapeHtml(statusMeta)}</div>
                ${revokedReasonMarkup}
              </td>
              <td>
                ${
                  canRemove
                    ? `<button
                        type="button"
                        class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger"
                        data-delegated-grant-remove-user-id="${escapeHtml(grant.delegateUserId)}"
                        data-delegated-grant-remove-id="${escapeHtml(grant.id)}"
                        data-delegated-grant-remove-label="${escapeHtml(`${grant.delegateUserId} · ${grant.id}`)}"
                      >
                        Remove
                      </button>`
                    : '<span class="ct-admin__meta">No action</span>'
                }
              </td>
            </tr>`;
          })
          .join("\n");

  const ruleRows =
    input.badgeRules.length === 0
      ? `<tr><td colspan="8" class="ct-admin__empty">No badge rules found. <a href="${escapeHtml(
          ruleBuilderPath,
        )}">Create your first rule</a>.</td></tr>`
      : input.badgeRules
          .map((rule) => {
            const templateTitle =
              templateById.get(rule.badgeTemplateId)?.title ?? rule.badgeTemplateId;
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
              if (latestVersion.status === "draft" || latestVersion.status === "rejected") {
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny" data-rule-submit-path="${escapeHtml(
                    submitApprovalPath ?? "",
                  )}" data-rule-label="${escapeHtml(rule.name)}">Submit</button>`,
                );
              }

              if (latestVersion.status === "pending_approval") {
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny" data-rule-decision-path="${escapeHtml(
                    approvePath ?? "",
                  )}" data-rule-decision="approved" data-rule-label="${escapeHtml(rule.name)}">Approve</button>`,
                );
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger" data-rule-decision-path="${escapeHtml(
                    approvePath ?? "",
                  )}" data-rule-decision="rejected" data-rule-label="${escapeHtml(rule.name)}">Reject</button>`,
                );
              }

              if (latestVersion.status === "approved" || latestVersion.status === "active") {
                actionButtons.push(
                  `<button type="button" class="ct-admin__button ct-admin__button--tiny" data-rule-activate-path="${escapeHtml(
                    activatePath ?? "",
                  )}" data-rule-label="${escapeHtml(rule.name)}">Activate</button>`,
                );
              }
            }

            return `<tr>
              <td><strong>${escapeHtml(rule.name)}</strong><div class="ct-admin__meta">${escapeHtml(rule.id)}</div></td>
              <td>${escapeHtml(templateTitle)}</td>
              <td>${escapeHtml(rule.lmsProviderKind)}</td>
              <td>${escapeHtml(rule.activeVersionId ?? "none")}</td>
              <td>${escapeHtml(
                latestVersion === null
                  ? "none"
                  : `v${String(latestVersion.versionNumber)} (${latestVersion.id})`,
              )}</td>
              <td><span class="ct-admin__status-pill ct-admin__status-pill--${escapeHtml(
                latestVersion?.status ?? "none",
              )}">${escapeHtml(latestVersion?.status ?? "none")}</span></td>
              <td>${escapeHtml(formatIsoTimestamp(rule.updatedAt))}</td>
              <td>${actionButtons.length > 0 ? actionButtons.join(" ") : '<span class="ct-admin__meta">No actions</span>'}</td>
            </tr>`;
          })
          .join("\n");

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
  const orgUnitParentOptions = input.orgUnits
    .filter((orgUnit) => orgUnit.isActive)
    .map((orgUnit) => {
      return `<option value="${escapeHtml(orgUnit.id)}" data-unit-type="${escapeHtml(
        orgUnit.unitType,
      )}">${escapeHtml(`${orgUnit.displayName} (${orgUnit.unitType})`)}</option>`;
    })
    .join("\n");
  const activeOrgUnitOptions = input.orgUnits
    .filter((orgUnit) => orgUnit.isActive)
    .map((orgUnit) => {
      return `<option value="${escapeHtml(orgUnit.id)}">${escapeHtml(
        `${orgUnit.displayName} (${orgUnit.unitType})`,
      )}</option>`;
    })
    .join("\n");
  const templateOptions = input.badgeTemplates
    .map((template, index) => {
      return `<option value="${escapeHtml(template.id)}"${index === 0 ? " selected" : ""}>${escapeHtml(
        `${template.title} (${template.id})`,
      )}</option>`;
    })
    .join("\n");
  const templateFilterOptions = input.badgeTemplates
    .map((template) => {
      return `<option value="${escapeHtml(template.id)}">${escapeHtml(template.title)}</option>`;
    })
    .join("\n");
  const formatRuleOption = (
    rule: BadgeIssuanceRuleRecord,
    includeSelected: boolean,
    index: number,
  ): string => {
    const versions = versionsByRuleId.get(rule.id) ?? [];
    const latestVersion = versions[0] ?? null;

    return `<option value="${escapeHtml(rule.id)}"${includeSelected && index === 0 ? " selected" : ""} data-version-id="${escapeHtml(
      latestVersion?.id ?? "",
    )}" data-version-status="${escapeHtml(latestVersion?.status ?? "none")}" data-rule-label="${escapeHtml(
      rule.name,
    )}">${escapeHtml(
      `${rule.name} (${rule.id}) · latest ${
        latestVersion === null
          ? "none"
          : `v${String(latestVersion.versionNumber)} ${latestVersion.status}`
      }`,
    )}</option>`;
  };
  const ruleOptions = input.badgeRules
    .map((rule, index) => formatRuleOption(rule, true, index))
    .join("\n");
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
  const reportingState = reportingOverview?.filters.state ?? null;
  const reportingIssuedFromValue = reportingOverview?.filters.issuedFrom ?? "";
  const reportingIssuedToValue = reportingOverview?.filters.issuedTo ?? "";
  const reportingBadgeTemplateIdValue = reportingOverview?.filters.badgeTemplateId ?? "";
  const reportingOrgUnitIdValue = reportingOverview?.filters.orgUnitId ?? "";
  const reportingTemplateFilterOptions = input.badgeTemplates
    .map((template) => {
      return `<option value="${escapeHtml(template.id)}"${
        reportingBadgeTemplateIdValue === template.id ? " selected" : ""
      }>${escapeHtml(template.title)}</option>`;
    })
    .join("\n");
  const reportingOrgUnitOptions = input.orgUnits
    .filter((orgUnit) => orgUnit.isActive)
    .map((orgUnit) => {
      return `<option value="${escapeHtml(orgUnit.id)}"${
        reportingOrgUnitIdValue === orgUnit.id ? " selected" : ""
      }>${escapeHtml(`${orgUnit.displayName} (${orgUnit.unitType})`)}</option>`;
    })
    .join("\n");
  const reportingMetricCardsMarkup =
    reportingMetrics.filter((metric) => metric.available).length === 0
      ? '<p class="ct-admin__empty">No reporting metrics are available yet.</p>'
      : reportingMetrics
          .filter((metric) => metric.available)
          .map((metric) => {
            return `<article class="ct-admin__metric-card ct-stack">
              <p class="ct-admin__eyebrow">${escapeHtml(metric.label)}</p>
              <strong class="ct-admin__metric-value">${String(metric.value ?? 0)}</strong>
              <p class="ct-admin__hint">${escapeHtml(metric.description)}</p>
            </article>`;
          })
          .join("\n");
  const reportingDeferredMetricsMarkup = reportingMetrics
    .filter((metric) => !metric.available)
    .map((metric) => {
      return `<article class="ct-admin__panel ct-admin__panel--nested ct-stack">
        <div class="ct-cluster">
          <strong>${escapeHtml(metric.label)}</strong>
          <span class="ct-admin__status-pill">Deferred</span>
        </div>
        <p>${escapeHtml(metric.description)}</p>
        <p class="ct-admin__hint">${escapeHtml(metric.availabilityNote ?? "Not available yet.")}</p>
      </article>`;
    })
    .join("\n");
  const reportingDefinitionRows =
    reportingMetrics.length === 0
      ? '<tr><td colspan="4" class="ct-admin__empty">No reporting definitions loaded yet.</td></tr>'
      : reportingMetrics
          .map((metric) => {
            return `<tr>
              <td><strong>${escapeHtml(metric.label)}</strong></td>
              <td>${escapeHtml(metric.source)}</td>
              <td>${metric.available ? "Available" : "Deferred"}</td>
              <td>${escapeHtml(metric.availabilityNote ?? metric.description)}</td>
            </tr>`;
          })
          .join("\n");
  const authPolicyApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/auth-policy`;
  const authProvidersApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/auth-providers`;
  const enterpriseAuthPolicy = input.enterpriseAuthPolicy ?? {
    tenantId: input.tenant.id,
    loginMode: "local" as const,
    breakGlassEnabled: false,
    localMfaRequired: false,
    defaultProviderId: null,
    enforceForRoles: "all_users" as const,
    createdAt: "",
    updatedAt: "",
  };
  const enterpriseAuthProviders = input.enterpriseAuthProviders ?? [];
  const supportedEnterpriseAuthProviders = enterpriseAuthProviders.filter(
    (provider) => provider.protocol === "oidc",
  );
  const legacySamlProviders = enterpriseAuthProviders.filter(
    (provider) => provider.protocol === "saml",
  );
  const legacyDefaultProvider = legacySamlProviders.find(
    (provider) => provider.id === enterpriseAuthPolicy.defaultProviderId,
  );
  const breakGlassAccounts = input.breakGlassAccounts ?? [];
  const enterpriseAuthProviderOptions = supportedEnterpriseAuthProviders
    .map((provider) => {
      return `<option value="${escapeHtml(provider.id)}"${
        enterpriseAuthPolicy.defaultProviderId === provider.id ? " selected" : ""
      }>${escapeHtml(provider.label)}</option>`;
    })
    .join("\n");
  const enterpriseAuthProviderRows =
    supportedEnterpriseAuthProviders.length === 0
      ? `<tr><td colspan="6" class="ct-admin__empty">No OIDC enterprise providers configured yet.</td></tr>`
      : supportedEnterpriseAuthProviders
          .map((provider) => {
            return `<tr>
              <td><strong>${escapeHtml(provider.label)}</strong><div class="ct-admin__meta">${escapeHtml(
                provider.id,
              )}</div></td>
              <td>${escapeHtml(provider.protocol)}</td>
              <td>${provider.isDefault ? "Default" : "Secondary"}</td>
              <td>${provider.enabled ? "Enabled" : "Disabled"}</td>
              <td>${escapeHtml(formatIsoTimestamp(provider.updatedAt))}</td>
              <td>
                <button
                  type="button"
                  class="ct-admin__button ct-admin__button--tiny"
                  data-enterprise-auth-edit-provider="true"
                  data-provider-id="${escapeHtml(provider.id)}"
                  data-provider-protocol="${escapeHtml(provider.protocol)}"
                  data-provider-label="${escapeHtml(provider.label)}"
                  data-provider-enabled="${provider.enabled ? "true" : "false"}"
                  data-provider-is-default="${provider.isDefault ? "true" : "false"}"
                  data-provider-config-json="${escapeHtml(provider.configJson)}"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger"
                  data-enterprise-auth-delete-provider-id="${escapeHtml(provider.id)}"
                  data-provider-label="${escapeHtml(provider.label)}"
                >
                  Delete
                </button>
              </td>
            </tr>`;
          })
          .join("\n");
  const legacySamlRows =
    legacySamlProviders.length === 0
      ? '<tr><td colspan="5" class="ct-admin__empty">No legacy SAML compatibility entries detected.</td></tr>'
      : legacySamlProviders
          .map((provider) => {
            return `<tr>
              <td><strong>${escapeHtml(provider.label)}</strong><div class="ct-admin__meta">${escapeHtml(
                provider.id,
              )}</div></td>
              <td>${provider.isDefault ? "Default" : "Secondary"}</td>
              <td>${provider.enabled ? "Enabled" : "Disabled"}</td>
              <td>${escapeHtml(formatIsoTimestamp(provider.updatedAt))}</td>
              <td>
                <button
                  type="button"
                  class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger"
                  data-enterprise-auth-delete-provider-id="${escapeHtml(provider.id)}"
                  data-provider-label="${escapeHtml(provider.label)}"
                >
                  Delete
                </button>
              </td>
            </tr>`;
          })
          .join("\n");
  const enterpriseAuthPanelMarkup =
    input.tenant.planTier !== "enterprise"
      ? ""
      : `<article id="enterprise-auth-panel" class="ct-admin__panel ct-stack">
          <h2>Enterprise Auth</h2>
          <p>Hosted enterprise sign-in supports OIDC providers. Legacy SAML compatibility stays visible for cleanup only.</p>
          <form id="enterprise-auth-policy-form" class="ct-admin__form ct-stack">
            <label>
              Login mode
              <select name="loginMode" required>
                <option value="local"${enterpriseAuthPolicy.loginMode === "local" ? " selected" : ""}>Local only</option>
                <option value="hybrid"${enterpriseAuthPolicy.loginMode === "hybrid" ? " selected" : ""}>Hybrid</option>
                <option value="sso_required"${enterpriseAuthPolicy.loginMode === "sso_required" ? " selected" : ""}>SSO required</option>
              </select>
            </label>
            <label>
              Default provider
              <select name="defaultProviderId">
                <option value="">No default provider</option>
                ${enterpriseAuthProviderOptions}
              </select>
            </label>
            <p class="ct-admin__hint">SSO enforcement applies to the tenant login experience. Role-specific enforcement is not configurable in the hosted runtime.</p>
            ${
              legacyDefaultProvider === undefined
                ? ""
                : `<p class="ct-admin__hint">This tenant still references <strong>${escapeHtml(
                    legacyDefaultProvider.label,
                  )}</strong> as a legacy default. Choose an OIDC provider before requiring institution sign-in.</p>`
            }
            <label class="ct-admin__checkbox-row ct-checkbox-row">
              <input name="breakGlassEnabled" type="checkbox"${
                enterpriseAuthPolicy.breakGlassEnabled ? " checked" : ""
              } />
              Break-glass local access enabled
            </label>
            <label class="ct-admin__checkbox-row ct-checkbox-row">
              <input name="localMfaRequired" type="checkbox"${
                enterpriseAuthPolicy.localMfaRequired ? " checked" : ""
              } />
              Require MFA for local access
            </label>
            <button type="submit">Save auth policy</button>
          </form>
          <p id="enterprise-auth-policy-status" class="ct-admin__status"></p>
          <form id="enterprise-auth-provider-form" class="ct-admin__form ct-stack">
            <input type="hidden" name="providerId" value="" />
            <input type="hidden" name="protocol" value="oidc" />
            <p class="ct-admin__hint">Add or edit hosted OIDC providers here. Use a new OIDC connection instead of modifying legacy SAML settings.</p>
            <label>
              OIDC provider label
              <input name="label" type="text" required placeholder="Campus OIDC" />
            </label>
            <label>
              OIDC discovery or connection JSON
              <textarea
                id="enterprise-auth-provider-config-json"
                name="configJson"
                rows="8"
                required
                spellcheck="false"
                placeholder='{"issuer":"https://idp.example.edu","clientId":"credtrail"}'
              ></textarea>
            </label>
            <label class="ct-admin__checkbox-row ct-checkbox-row">
              <input name="enabled" type="checkbox" checked />
              Provider enabled
            </label>
            <label class="ct-admin__checkbox-row ct-checkbox-row">
              <input name="isDefault" type="checkbox" />
              Set as default provider
            </label>
            <div class="ct-cluster">
              <button type="submit">Save provider</button>
              <button
                id="enterprise-auth-provider-reset"
                type="button"
                class="ct-admin__button ct-admin__button--secondary"
              >
                Clear form
              </button>
            </div>
          </form>
          <p id="enterprise-auth-provider-status" class="ct-admin__status"></p>
          <div class="ct-admin__table-wrap">
            <table class="ct-admin__table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Protocol</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="enterprise-auth-provider-body">
                ${enterpriseAuthProviderRows}
              </tbody>
            </table>
          </div>
          ${
            legacySamlProviders.length === 0
              ? ""
              : `<section class="ct-stack" aria-labelledby="legacy-saml-title">
                  <h3 id="legacy-saml-title">Legacy SAML compatibility</h3>
                  <p>These entries remain visible so you can audit or remove older SAML setup after an OIDC cutover. They are not editable from the hosted provider workflow.</p>
                  <div class="ct-admin__table-wrap">
                    <table class="ct-admin__table">
                      <thead>
                        <tr>
                          <th>Legacy entry</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${legacySamlRows}
                      </tbody>
                    </table>
                  </div>
                </section>`
          }
          <section class="ct-stack" aria-labelledby="break-glass-accounts-title">
            <h3 id="break-glass-accounts-title">Break-glass local accounts</h3>
            <p>
              Limit local fallback access to explicit accounts only. CredTrail emails setup links and records recent fallback usage.
            </p>
            <form id="break-glass-account-form" class="ct-admin__form ct-stack">
              <label>
                Institution email
                <input name="email" type="email" required placeholder="admin@institution.edu" />
              </label>
              <label class="ct-admin__checkbox-row ct-checkbox-row">
                <input name="sendEnrollmentEmail" type="checkbox" checked />
                Email setup or password-reset link now
              </label>
              <button type="submit">Add break-glass account</button>
            </form>
            <p id="break-glass-account-status" class="ct-admin__status"></p>
            <div class="ct-admin__table-wrap">
              <table class="ct-admin__table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Local status</th>
                    <th>Last used</th>
                    <th>Enrollment email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="break-glass-account-body">
                  ${
                    breakGlassAccounts.length === 0
                      ? '<tr><td colspan="5" class="ct-admin__empty">No break-glass accounts configured yet.</td></tr>'
                      : breakGlassAccounts
                          .map((account) => {
                            const localStatus = account.twoFactorEnabled
                              ? "MFA ready"
                              : account.localCredentialEnabled
                                ? "Password ready"
                                : "Setup pending";

                            return `<tr>
                              <td><strong>${escapeHtml(account.email)}</strong><div class="ct-admin__meta">${escapeHtml(
                                account.userId,
                              )}</div></td>
                              <td>${escapeHtml(localStatus)}</td>
                              <td>${escapeHtml(
                                account.lastUsedAt === null
                                  ? "Never"
                                  : formatIsoTimestamp(account.lastUsedAt),
                              )}</td>
                              <td>${escapeHtml(
                                account.lastEnrollmentEmailSentAt === null
                                  ? "Not sent"
                                  : formatIsoTimestamp(account.lastEnrollmentEmailSentAt),
                              )}</td>
                              <td>
                                <button
                                  type="button"
                                  class="ct-admin__button ct-admin__button--tiny ct-admin__button--danger"
                                  data-break-glass-delete-user-id="${escapeHtml(account.userId)}"
                                  data-break-glass-email="${escapeHtml(account.email)}"
                                >
                                  Revoke
                                </button>
                              </td>
                            </tr>`;
                          })
                          .join("\n")
                  }
                </tbody>
              </table>
            </div>
          </section>
          ${
            enterpriseAuthProviders.length > 0
              ? `<details class="ct-admin__panel ct-admin__panel--nested">
                  <summary>Selected provider config preview</summary>
                  <pre class="ct-admin__code-output">${escapeHtml(
                    formatJsonTextareaValue(enterpriseAuthProviders[0]?.configJson ?? "{}"),
                  )}</pre>
                </details>`
              : ""
          }
        </article>`;
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
    reportingPagePath: reportingPath,
    reportingOverviewApiPath: `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/overview`,
    authPolicyApiPath: input.tenant.planTier === "enterprise" ? authPolicyApiPath : "",
    authProvidersApiPath: input.tenant.planTier === "enterprise" ? authProvidersApiPath : "",
    breakGlassAccountsApiPath:
      input.tenant.planTier === "enterprise"
        ? `/v1/tenants/${encodeURIComponent(input.tenant.id)}/break-glass-accounts`
        : "",
  });
  const renderAdminNav = (): string => {
    const operationsCurrent =
      view === "operations" ||
      view === "operationsReviewQueue" ||
      view === "operationsIssuedBadges" ||
      view === "operationsBadgeStatus";
    const reportingCurrent = view === "reporting";
    const accessCurrent =
      view === "access" ||
      view === "accessGovernance" ||
      view === "accessApiKeys" ||
      view === "accessOrgUnits";
    const links = [
      { href: tenantAdminPath, label: "Home", isCurrent: view === "home" },
      { href: operationsPath, label: "Operations", isCurrent: operationsCurrent },
      { href: reportingPath, label: "Reporting", isCurrent: reportingCurrent },
      { href: rulesWorkspacePath, label: "Rules", isCurrent: view === "rules" },
      { href: accessPath, label: "Access", isCurrent: accessCurrent },
      { href: adminAuditLogPath, label: "Audit logs", isCurrent: false },
      {
        href: showcasePath,
        label: "Public showcase",
        isCurrent: false,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ];

    if (switchOrganizationPath.length > 0) {
      links.push({
        href: switchOrganizationPath,
        label: "Switch organization",
        isCurrent: false,
      });
    }

    return `<nav class="ct-admin__quick-links ct-cluster" aria-label="Institution admin navigation">
      ${links
        .map((link) => {
          const attributes = [
            `href="${escapeHtml(link.href)}"`,
            link.isCurrent ? 'aria-current="page"' : "",
            link.target === undefined ? "" : `target="${escapeHtml(link.target)}"`,
            link.rel === undefined ? "" : `rel="${escapeHtml(link.rel)}"`,
          ]
            .filter((value) => value.length > 0)
            .join(" ");

          return `<a ${attributes}>${escapeHtml(link.label)}</a>`;
        })
        .join("\n")}
    </nav>`;
  };

  const renderHero = (title: string, description: string, noteMarkup = ""): string => {
    const heroContent = `<div class="ct-stack">
        <p class="ct-admin__eyebrow">Institution Admin</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <div class="ct-admin__meta-grid ct-cluster">
          <span class="ct-admin__pill">Tenant: ${escapeHtml(input.tenant.id)}</span>
          <span class="ct-admin__pill">Plan: ${escapeHtml(input.tenant.planTier)}</span>
          <span class="ct-admin__pill">Role: ${escapeHtml(input.membershipRole)}</span>
          <span class="ct-admin__pill" title="User ID: ${escapeHtml(input.userId)}">User: ${escapeHtml(
            userLabel,
          )}</span>
        </div>
        ${renderAdminNav()}
      </div>`;

    return noteMarkup.length === 0
      ? `<header class="ct-admin__hero ct-stack">${heroContent}</header>`
      : `<header class="ct-admin__hero ct-stack">
          <div class="ct-admin__hero-layout ct-grid">
            ${heroContent}
            ${noteMarkup}
          </div>
        </header>`;
  };

  const workspaceCardsMarkup = `<section class="ct-admin__workspace-grid ct-grid" aria-label="Institution admin workspaces">
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Daily work</p>
      <h2>Operations</h2>
      <p>Issue badges, route manual review, inspect issued badges, and update badge status across focused pages.</p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${badgeTemplateCount} templates</span>
        <span class="ct-admin__status-pill">${ruleCount} rules</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(operationsPath)}">Open operations</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Analytics</p>
      <h2>Reporting</h2>
      <p>Track issuance volume and badge status with filters, definitions, and clear source notes.</p>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(reportingPath)}">Open reporting</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Authoring</p>
      <h2>Rules</h2>
      <p>Maintain templates, reusable lists, governance context, and the dedicated rule builder.</p>
      ${
        input.badgeRules.length === 0
          ? '<p class="ct-admin__hint">No badge rules found. Create your first rule.</p>'
          : ""
      }
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${ruleCount} active rule records</span>
        <span class="ct-admin__status-pill">${badgeTemplateCount} templates</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(
          input.badgeRules.length === 0 ? ruleBuilderPath : rulesWorkspacePath,
        )}">${escapeHtml(input.badgeRules.length === 0 ? "Create first rule" : "Open rules")}</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Setup</p>
      <h2>Access</h2>
      <p>Manage permissions and enterprise auth here, with separate pages for API keys and org structure.</p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${activeApiKeyCount} active keys</span>
        <span class="ct-admin__status-pill">${orgUnitCount} org units</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(accessPath)}">Open access</a>
      </div>
    </article>
  </section>`;

  const operationsWorkspaceCardsMarkup = `<section class="ct-admin__workspace-grid ct-grid" aria-label="Operations pages">
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Manual review</p>
      <h2>Rule Review Queue</h2>
      <p>Process badges that need a human decision before they are issued.</p>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(operationsReviewQueuePath)}">Open review queue</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Audit trail</p>
      <h2>Issued Badges</h2>
      <p>Search tenant-issued badges and take revocation or audit actions from one page.</p>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(operationsIssuedBadgesPath)}">Open issued badges</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Status changes</p>
      <h2>Badge Status</h2>
      <p>Look up a badge, inspect its current state, and suspend, revoke, or expire it with a reason.</p>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(operationsBadgeStatusPath)}">Open badge status</a>
      </div>
    </article>
  </section>`;

  const accessWorkspaceCardsMarkup = `<section class="ct-admin__workspace-grid ct-grid" aria-label="Access pages">
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Delegation</p>
      <h2>Governance</h2>
      <p>Assign org-unit roles and time-boxed badge authority from one dedicated page with current assignments visible.</p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${scopedRoleCount} scoped roles</span>
        <span class="ct-admin__status-pill">${activeDelegationCount} active delegations</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(accessGovernancePath)}">Open governance</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Integrations</p>
      <h2>API Keys</h2>
      <p>Create, review, and revoke scoped tenant API keys without mixing the workflow with org setup.</p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${activeApiKeyCount} active keys</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(accessApiKeysPath)}">Open API keys</a>
      </div>
    </article>
    <article class="ct-admin__workspace-card ct-stack">
      <p class="ct-admin__eyebrow">Structure</p>
      <h2>Org Units</h2>
      <p>Create and review tenant org structure without crowding key management.</p>
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">${orgUnitCount} org units</span>
      </div>
      <div class="ct-admin__workspace-actions ct-cluster">
        <a class="ct-admin__cta-link" href="${escapeHtml(accessOrgUnitsPath)}">Open org units</a>
      </div>
    </article>
  </section>`;

  const manualIssuePanelMarkup = `<article id="manual-issue-panel" class="ct-admin__panel ct-stack">
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
  </article>`;

  const templateImagePanelMarkup = `<article id="template-image-panel" class="ct-admin__panel ct-stack">
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
  </article>`;

  const apiKeyPanelMarkup = `<article id="api-key-panel" class="ct-admin__panel ct-stack">
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
  </article>`;

  const orgUnitPanelMarkup = `<article id="org-unit-panel" class="ct-admin__panel ct-stack">
    <h2>Create Org Unit</h2>
    <p>Add college, department, program, or institution hierarchy from this workspace.</p>
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
  </article>`;

  const governanceGuidePanelMarkup = `<article id="governance-panel" class="ct-admin__panel ct-stack">
    <h2>Before you delegate</h2>
    <p>
      Use this page to give an existing tenant member limited access inside a selected org unit.
      Choosing a parent org unit also covers the child units beneath it.
    </p>
    <p class="ct-admin__hint">
      The user ID on this page belongs to the person receiving access. This workflow does not create
      tenant membership, so the person must already exist in this tenant.
    </p>
    <ul>
      <li>Use a scoped role for standing access inside an org unit.</li>
      <li>Use delegated authority for temporary badge actions with an end date.</li>
      <li>Leave badge template IDs blank when the delegation should cover every template in scope.</li>
    </ul>
  </article>`;

  const membershipScopePanelMarkup = `<article class="ct-admin__panel ct-stack">
    <h2>Scoped Roles</h2>
    <p>Assign the smallest org-unit role that matches the person’s ongoing responsibilities.</p>
    <form id="membership-scope-form" class="ct-admin__form ct-stack">
      <label>
        Tenant member user ID
        <input name="userId" type="text" required placeholder="usr_issuer" />
      </label>
      <p class="ct-admin__hint">This is the person receiving access. They must already belong to this tenant.</p>
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
        </select>
      </label>
      <ul>
        <li><strong>viewer</strong> can view in-scope templates and governance context.</li>
        <li><strong>issuer</strong> includes viewer access and issuer workflows inside the selected scope.</li>
        <li><strong>admin</strong> is the highest org-unit role and covers issuer and viewer checks.</li>
      </ul>
      <button type="submit">Save scoped role</button>
    </form>
    <p id="membership-scope-status" class="ct-admin__status"></p>
  </article>`;

  const membershipScopeTableMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
    <h2>Current Scoped Roles (${scopedRoleCount})</h2>
    <p>Remove access directly from the list instead of re-entering the same identifiers.</p>
    <div class="ct-admin__table-wrap">
      <table class="ct-admin__table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Org unit</th>
            <th>Role</th>
            <th>Updated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="membership-scope-body">
          ${membershipScopeRows}
        </tbody>
      </table>
    </div>
    <p id="membership-scope-list-status" class="ct-admin__status"></p>
  </article>`;

  const delegatedGrantPanelMarkup = `<article class="ct-admin__panel ct-stack">
    <h2>Delegated Authority</h2>
    <p>Grant time-boxed badge authority without changing the person’s standing org-unit role.</p>
    <form id="delegated-grant-form" class="ct-admin__form ct-stack">
      <label>
        Delegate user ID
        <input name="delegateUserId" type="text" required placeholder="usr_issuer" />
      </label>
      <p class="ct-admin__hint">This is the tenant member receiving the delegation.</p>
      <label>
        Org unit
        <select name="orgUnitId" required>
          ${activeOrgUnitSelectOptions}
        </select>
      </label>
      <fieldset class="ct-admin__fieldset ct-stack">
        <legend>Allowed badge actions</legend>
        <label class="ct-admin__checkbox-row ct-checkbox-row">
          <input name="allowedAction" type="checkbox" value="issue_badge" checked />
          Issue badges
        </label>
        <label class="ct-admin__checkbox-row ct-checkbox-row">
          <input name="allowedAction" type="checkbox" value="revoke_badge" />
          Revoke badges
        </label>
        <label class="ct-admin__checkbox-row ct-checkbox-row">
          <input name="allowedAction" type="checkbox" value="manage_lifecycle" />
          Change badge status
        </label>
      </fieldset>
      <p class="ct-admin__hint">
        “Change badge status” covers non-revocation lifecycle changes such as suspend, expire, or restore.
      </p>
      <label>
        Limit to badge template IDs (optional)
        <input
          name="badgeTemplateIds"
          type="text"
          placeholder="badge_template_001,badge_template_002"
        />
      </label>
      <p class="ct-admin__hint">Leave blank to allow all badge templates inside the selected org-unit scope.</p>
      <label>
        Ends at
        <input name="endsAt" type="datetime-local" required />
      </label>
      <p class="ct-admin__hint">Delegations are time-boxed. Choose when this authority should expire.</p>
      <label>
        Reason (optional)
        <input name="reason" type="text" placeholder="Coverage for spring term operations." />
      </label>
      <button type="submit">Save delegation</button>
    </form>
    <p id="delegated-grant-status" class="ct-admin__status"></p>
  </article>`;

  const delegatedGrantTableMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
    <h2>Current Delegations (${String(input.delegatedIssuingAuthorityGrants.length)})</h2>
    <p>Remove active or scheduled delegations directly from the list.</p>
    <div class="ct-admin__table-wrap">
      <table class="ct-admin__table">
        <thead>
          <tr>
            <th>Delegate</th>
            <th>Org unit</th>
            <th>Allowed actions</th>
            <th>Granted</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="delegated-grant-body">
          ${delegatedGrantRows}
        </tbody>
      </table>
    </div>
    <p id="delegated-grant-list-status" class="ct-admin__status"></p>
  </article>`;

  const ruleBuilderPanelMarkup = `<article id="rule-builder-panel" class="ct-admin__panel ct-stack">
    <h2>Rule Builder Workspace</h2>
    <p>Open the dedicated full-width builder for step-based rule authoring, test mode, and review.</p>
    <p>
      <a class="ct-admin__cta-link" href="${escapeHtml(ruleBuilderPath)}">Open rule builder</a>
    </p>
    <p class="ct-admin__hint">
      Includes condition cards, JSON import/export, local draft save/load, and dry-run evaluation.
    </p>
  </article>`;

  const ruleValueListsPanelMarkup = `<article id="rule-value-lists-panel" class="ct-admin__panel ct-stack">
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
  </article>`;

  const evaluateRulePanelMarkup = `<article class="ct-admin__panel ct-stack">
    <h2>Evaluate Rule</h2>
    <p>Run rule evaluation in dry run mode before issuing for real.</p>
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
  </article>`;

  const badgeStatusPanelMarkup = `<article id="lifecycle-panel" class="ct-admin__panel ct-stack">
    <h2>Badge Status</h2>
    <p>Look up a badge, review its current status, and apply state changes with institutional reason codes.</p>
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
  </article>`;

  const ruleGovernancePanelMarkup = `<article class="ct-admin__panel ct-stack">
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
  </article>`;

  const ruleReviewQueuePanelMarkup = `<article id="rule-review-queue-panel" class="ct-admin__panel ct-admin__panel--table ct-stack">
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
  </article>`;

  const issuedBadgesPanelMarkup = `<article id="issued-badges-panel" class="ct-admin__panel ct-admin__panel--table ct-stack">
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
            <td colspan="6" class="ct-admin__empty">No assertions loaded yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p id="issued-badges-action-status" class="ct-admin__status"></p>
  </article>`;

  const reportingOverviewPanelMarkup = `<article id="reporting-overview-panel" class="ct-admin__panel ct-stack">
    <h2>Reporting Overview</h2>
    <p>Filter by issue date, template, org unit, or current badge state. Counts reflect product-owned data only.</p>
    <form method="get" action="${escapeHtml(reportingPath)}" class="ct-admin__form ct-admin__form--inline ct-grid">
      <label>
        Issued from
        <input name="issuedFrom" type="date" value="${escapeHtml(reportingIssuedFromValue)}" />
      </label>
      <label>
        Issued to
        <input name="issuedTo" type="date" value="${escapeHtml(reportingIssuedToValue)}" />
      </label>
      <label>
        Badge template
        <select name="badgeTemplateId">
          <option value="">All templates</option>
          ${reportingTemplateFilterOptions}
        </select>
      </label>
      <label>
        Org unit
        <select name="orgUnitId">
          <option value="">All org units</option>
          ${reportingOrgUnitOptions}
        </select>
      </label>
      <label>
        Lifecycle state
        <select name="state">
          <option value="">All current states</option>
          <option value="active"${reportingState === "active" ? " selected" : ""}>active</option>
          <option value="suspended"${reportingState === "suspended" ? " selected" : ""}>suspended</option>
          <option value="revoked"${reportingState === "revoked" ? " selected" : ""}>revoked</option>
          <option value="expired"${reportingState === "expired" ? " selected" : ""}>expired</option>
          <option value="pending_review"${reportingState === "pending_review" ? " selected" : ""}>pending review</option>
        </select>
      </label>
      <div class="ct-cluster">
        <button type="submit">Apply filters</button>
        <a class="ct-admin__button ct-admin__button--secondary" href="${escapeHtml(reportingPath)}">Reset</a>
      </div>
    </form>
    <div class="ct-admin__metric-grid">
      ${reportingMetricCardsMarkup}
    </div>
    <p class="ct-admin__hint">Generated ${escapeHtml(
      reportingOverview === null ? "just now" : formatIsoTimestamp(reportingOverview.generatedAt),
    )}</p>
  </article>`;

  const reportingDefinitionsPanelMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
    <h2>Metric Definitions</h2>
    <p>Every number in this page lists its source. Deferred metrics stay visible here, not as empty cards.</p>
    <div class="ct-admin__table-wrap">
      <table class="ct-admin__table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Source</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${reportingDefinitionRows}
        </tbody>
      </table>
    </div>
  </article>`;

  const reportingDeferredPanelMarkup =
    reportingDeferredMetricsMarkup.length === 0
      ? ""
      : `<section class="ct-admin__grid ct-stack">${reportingDeferredMetricsMarkup}</section>`;

  const badgeRulesTableMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
  </article>`;

  const badgeTemplatesTableMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
  </article>`;

  const orgUnitsTableMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
  </article>`;

  const apiKeysTableMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
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
  </article>`;

  const pageTitle =
    view === "home"
      ? `Institution Admin · ${input.tenant.displayName}`
      : view === "operations"
        ? `Operations · Institution Admin · ${input.tenant.displayName}`
        : view === "operationsReviewQueue"
          ? `Rule Review Queue · Institution Admin · ${input.tenant.displayName}`
          : view === "operationsIssuedBadges"
            ? `Issued Badges · Institution Admin · ${input.tenant.displayName}`
            : view === "operationsBadgeStatus"
              ? `Badge Status · Institution Admin · ${input.tenant.displayName}`
              : view === "reporting"
                ? `Reporting · Institution Admin · ${input.tenant.displayName}`
              : view === "rules"
                ? `Rules · Institution Admin · ${input.tenant.displayName}`
                : view === "access"
                  ? `Access · Institution Admin · ${input.tenant.displayName}`
                  : view === "accessGovernance"
                    ? `Governance Delegation · Institution Admin · ${input.tenant.displayName}`
                    : view === "accessApiKeys"
                    ? `API Keys · Institution Admin · ${input.tenant.displayName}`
                    : `Org Units · Institution Admin · ${input.tenant.displayName}`;

  const pageMarkup =
    view === "home"
      ? `<section class="ct-admin ct-stack">
          ${renderHero(
            "Institution Admin",
            "Choose a workspace instead of forcing every task onto one page.",
            `<aside class="ct-admin__hero-note ct-stack">
              <h2>Start Here</h2>
              <p>Operations is the primary daily workspace. Use the Rules and Access pages to configure policy and permissions.</p>
              <p><a class="ct-admin__cta-link" href="${escapeHtml(operationsPath)}">Open operations</a></p>
            </aside>`,
          )}
          ${workspaceCardsMarkup}
          <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
        </section>`
      : view === "operations"
        ? `<section class="ct-admin ct-stack">
            ${renderHero(
              "Operations",
              "Issue badges here, then use dedicated pages for review queue, issued badges, and badge status.",
            )}
            ${operationsWorkspaceCardsMarkup}
            ${manualIssuePanelMarkup}
            <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
          </section>`
        : view === "operationsReviewQueue"
          ? `<section class="ct-admin ct-stack">
              ${renderHero(
                "Rule Review Queue",
                "Review pending badge decisions without mixing them into the rest of operations.",
              )}
              ${operationsWorkspaceCardsMarkup}
              ${ruleReviewQueuePanelMarkup}
              <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
            </section>`
          : view === "operationsIssuedBadges"
            ? `<section class="ct-admin ct-stack">
                ${renderHero(
                  "Issued Badges",
                  "Search issued badges and take audit or revocation actions from one page.",
                )}
                ${operationsWorkspaceCardsMarkup}
                ${issuedBadgesPanelMarkup}
                <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
              </section>`
            : view === "operationsBadgeStatus"
              ? `<section class="ct-admin ct-stack">
                  ${renderHero(
                    "Badge Status",
                    "Look up a badge, inspect its current state, and apply status changes with a reason.",
                  )}
                  ${operationsWorkspaceCardsMarkup}
                  ${badgeStatusPanelMarkup}
                  <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
                </section>`
              : view === "reporting"
                ? `<section class="ct-admin ct-stack">
                    ${renderHero(
                      "Reporting",
                      "Track badge counts with stable attribution and clear metric definitions.",
                      `<aside class="ct-admin__hero-note ct-stack">
                        <h2>Phase 9 Scope</h2>
                        <p>Claim rate and share rate stay deferred until product-owned engagement capture is in place.</p>
                      </aside>`,
                    )}
                    ${reportingOverviewPanelMarkup}
                    ${reportingDefinitionsPanelMarkup}
                    ${reportingDeferredPanelMarkup}
                    <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
                  </section>`
              : view === "rules"
                ? `<section class="ct-admin ct-stack">
              ${renderHero(
                "Rules",
                "Keep authoring, template maintenance, and governance context together in one focused workspace.",
              )}
              <section class="ct-admin__layout ct-grid ct-grid--sidebar">
                <div class="ct-admin__grid ct-stack">
                  ${ruleBuilderPanelMarkup}
                  ${templateImagePanelMarkup}
                  ${ruleValueListsPanelMarkup}
                  ${evaluateRulePanelMarkup}
                  ${ruleGovernancePanelMarkup}
                </div>
                <div class="ct-admin__grid ct-stack">
                  ${badgeRulesTableMarkup}
                  ${badgeTemplatesTableMarkup}
                </div>
              </section>
              <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
            </section>`
                : view === "access"
                  ? `<section class="ct-admin ct-stack">
                ${renderHero(
                  "Access",
                  "Choose the access workspace you need. Governance, API keys, and org units now live on focused pages.",
                )}
                ${accessWorkspaceCardsMarkup}
                ${enterpriseAuthPanelMarkup}
                <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
              </section>`
                  : view === "accessGovernance"
                    ? `<section class="ct-admin ct-stack">
                ${renderHero(
                  "Governance Delegation",
                  "Grant org-unit access and time-boxed badge authority with clearer guidance and direct removal from the current assignments list.",
                  `<aside class="ct-admin__hero-note ct-stack">
                    <h2>Choose The Smallest Access</h2>
                    <p>Use scoped roles for standing access. Use delegated authority when someone only needs temporary badge operations.</p>
                    <p class="ct-admin__hint">Every user ID on this page is the person receiving access, and they must already belong to this tenant.</p>
                  </aside>`,
                )}
                ${accessWorkspaceCardsMarkup}
                ${governanceGuidePanelMarkup}
                ${membershipScopePanelMarkup}
                ${membershipScopeTableMarkup}
                ${delegatedGrantPanelMarkup}
                ${delegatedGrantTableMarkup}
                <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
              </section>`
                  : view === "accessApiKeys"
                    ? `<section class="ct-admin ct-stack">
                  ${renderHero(
                    "API Keys",
                    "Create, review, and revoke tenant API keys without mixing them into org structure work.",
                  )}
                  ${accessWorkspaceCardsMarkup}
                  <section class="ct-admin__layout ct-grid ct-grid--sidebar">
                    <div class="ct-admin__grid ct-stack">
                      ${apiKeyPanelMarkup}
                    </div>
                    <div class="ct-admin__grid ct-stack">
                      ${apiKeysTableMarkup}
                    </div>
                  </section>
                  <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
                </section>`
                    : `<section class="ct-admin ct-stack">
                  ${renderHero(
                    "Org Units",
                    "Create and review org structure without mixing it into API key management.",
                  )}
                  ${accessWorkspaceCardsMarkup}
                  <section class="ct-admin__layout ct-grid ct-grid--sidebar">
                    <div class="ct-admin__grid ct-stack">
                      ${orgUnitPanelMarkup}
                    </div>
                    <div class="ct-admin__grid ct-stack">
                      ${orgUnitsTableMarkup}
                    </div>
                  </section>
                  <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
                </section>`;

  return renderPageShell(
    pageTitle,
    pageMarkup,
    renderPageAssetTags(["foundationCss", "institutionAdminCss", "institutionAdminJs"]),
  );
};

export const institutionAdminDashboardPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "home");
};

export const institutionAdminOperationsPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "operations");
};

export const institutionAdminOperationsReviewQueuePage = (
  input: InstitutionAdminPageInput,
): string => {
  return renderInstitutionAdminPage(input, "operationsReviewQueue");
};

export const institutionAdminIssuedBadgesPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "operationsIssuedBadges");
};

export const institutionAdminBadgeStatusPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "operationsBadgeStatus");
};

export const institutionAdminReportingPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "reporting");
};

export const institutionAdminRulesPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "rules");
};

export const institutionAdminAccessPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "access");
};

export const institutionAdminGovernancePage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "accessGovernance");
};

export const institutionAdminApiKeysPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "accessApiKeys");
};

export const institutionAdminOrgUnitsPage = (input: InstitutionAdminPageInput): string => {
  return renderInstitutionAdminPage(input, "accessOrgUnits");
};
