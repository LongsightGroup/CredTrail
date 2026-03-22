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
  TenantReportingComparisonRowRecord,
  TenantReportingEngagementCounts,
  TenantReportingOverviewRecord,
  TenantReportingTrendRecord,
  TenantRecord,
} from "@credtrail/db";
import { renderPageShell } from "@credtrail/ui-components";
import type { ReportingMetricEntry } from "../reporting/metric-definitions";
import {
  buildReportingHierarchyQueryEntries,
  buildReportingPageQueryEntries,
} from "../reporting/reporting-page-filters";
import {
  renderReporting,
  type ReportingVisualSeriesPoint,
} from "../reporting/reporting-visuals";
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

const formatReportingCount = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
};

const formatReportingRate = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const formatReportingDateLabel = (value: string): string => {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatReportingStateLabel = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value.trim().length === 0) {
    return "All current states";
  }

  switch (value) {
    case "pending_review":
      return "Pending review";
    case "active":
      return "active";
    case "suspended":
      return "suspended";
    case "revoked":
      return "revoked";
    case "expired":
      return "expired";
    default:
      return value;
  }
};

const REPORTING_HIERARCHY_LEVELS = ["institution", "college", "department", "program"] as const;
type ReportingHierarchyLevel = (typeof REPORTING_HIERARCHY_LEVELS)[number];

const REPORTING_HIERARCHY_DEPTH: Record<ReportingHierarchyLevel, number> = {
  institution: 0,
  college: 1,
  department: 2,
  program: 3,
};

const REPORTING_RATE_MIN_ISSUED = 5;
const REPORTING_PERFORMER_ROW_LIMIT = 3;

interface ReportingHierarchyRow {
  orgUnitId: string;
  level: ReportingHierarchyLevel;
  issuedCount: number;
  publicBadgeViewCount: number;
  verificationViewCount: number;
  shareClickCount: number;
  learnerClaimCount: number;
  walletAcceptCount: number;
  claimRate: number;
  shareRate: number;
}

const isReportingHierarchyLevel = (
  value: TenantOrgUnitRecord["unitType"],
): value is ReportingHierarchyLevel => {
  return REPORTING_HIERARCHY_LEVELS.includes(value as ReportingHierarchyLevel);
};

const getNextReportingHierarchyLevel = (
  level: ReportingHierarchyLevel,
): ReportingHierarchyLevel | null => {
  const index = REPORTING_HIERARCHY_LEVELS.indexOf(level);

  return index === REPORTING_HIERARCHY_LEVELS.length - 1
    ? null
    : (REPORTING_HIERARCHY_LEVELS[index + 1] ?? null);
};

const formatReportingHierarchyLevelLabel = (level: ReportingHierarchyLevel): string => {
  switch (level) {
    case "institution":
      return "Institution";
    case "college":
      return "College";
    case "department":
      return "Department";
    case "program":
      return "Program";
  }
};

const buildReportingHierarchyFocusId = (orgUnitId: string): string => {
  return `reporting-hierarchy-focus-${encodeURIComponent(orgUnitId)}`;
};

const appendQueryParam = (
  params: URLSearchParams,
  key: string,
  value: string | null | undefined,
): void => {
  const normalizedValue = value?.trim() ?? "";

  if (normalizedValue.length > 0) {
    params.set(key, normalizedValue);
  }
};

const buildPathWithQuery = (
  path: string,
  queryEntries: ReadonlyArray<readonly [string, string | null | undefined]>,
): string => {
  const params = new URLSearchParams();

  for (const [key, value] of queryEntries) {
    appendQueryParam(params, key, value);
  }

  const query = params.toString();

  return query.length === 0 ? path : `${path}?${query}`;
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
  reportingEngagementCounts?: TenantReportingEngagementCounts | null;
  reportingOverview?: TenantReportingOverviewRecord | null;
  reportingMetrics?: readonly ReportingMetricEntry[];
  reportingOrgUnitComparisons?: readonly TenantReportingComparisonRowRecord[];
  reportingTemplateComparisons?: readonly TenantReportingComparisonRowRecord[];
  reportingTrends?: TenantReportingTrendRecord | null;
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
  const userLabel = input.userEmail ?? input.userId;
  const switchOrganizationPath = input.switchOrganizationPath?.trim() ?? "";
  const reportingEngagementCounts = input.reportingEngagementCounts ?? null;
  const reportingOverview = input.reportingOverview ?? null;
  const reportingMetrics = input.reportingMetrics ?? [];
  const reportingOrgUnitComparisons = input.reportingOrgUnitComparisons ?? [];
  const reportingTemplateComparisons = input.reportingTemplateComparisons ?? [];
  const reportingTrends = input.reportingTrends ?? null;
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
  const getReportingOrgUnitLabel = (orgUnitId: string): string => {
    return orgUnitById.get(orgUnitId)?.displayName ?? orgUnitId;
  };
  const getReportingComparisonLabel = (row: TenantReportingComparisonRowRecord): string => {
    if (row.groupBy === "badgeTemplate") {
      return templateById.get(row.groupId)?.title ?? row.groupId;
    }

    return getReportingOrgUnitLabel(row.groupId);
  };
  const renderReportingComparisonGroupLabel = (row: TenantReportingComparisonRowRecord): string => {
    if (row.groupBy === "badgeTemplate") {
      const template = templateById.get(row.groupId);

      if (template === undefined) {
        return `<strong>${escapeHtml(row.groupId)}</strong>`;
      }

      return `<strong>${escapeHtml(template.title)}</strong><div class="ct-admin__meta">${escapeHtml(
        template.id,
      )}</div>`;
    }

    return renderOrgUnitSummary(row.groupId);
  };
  const buildReportingLegendDetail = (input: {
    publicBadgeViewCount: number;
    claimRate: number;
    shareRate: number;
  }): string => {
    return `${formatReportingCount(input.publicBadgeViewCount)} public views · ${formatReportingRate(
      input.claimRate,
    )} claim · ${formatReportingRate(input.shareRate)} share`;
  };
  const renderReportingVisualModule = (input: {
    description: string;
    headingLevel?: "h3" | "h4";
    id?: string;
    kind: "comparison-bars" | "stacked-summary" | "trend-series";
    note?: string;
    series: readonly ReportingVisualSeriesPoint[];
    title: string;
  }): string => {
    const noteMarkup =
      input.note === undefined || input.note.trim().length === 0
        ? ""
        : `<p class="ct-admin__reporting-visual-note">${escapeHtml(input.note)}</p>`;

    return `<div class="ct-admin__reporting-visual-shell">
      ${renderReporting(input)}
      ${noteMarkup}
    </div>`;
  };
  const renderReportingCountCell = (value: number): string => {
    return `<span class="ct-admin__reporting-table-number">${escapeHtml(formatReportingCount(value))}</span>`;
  };
  const buildVisibleOrgUnitLineage = (orgUnitId: string): TenantOrgUnitRecord[] => {
    const lineage: TenantOrgUnitRecord[] = [];
    const visited = new Set<string>();
    let currentOrgUnitId: string | null = orgUnitId;

    while (currentOrgUnitId !== null) {
      if (visited.has(currentOrgUnitId)) {
        break;
      }

      visited.add(currentOrgUnitId);
      const orgUnit = orgUnitById.get(currentOrgUnitId);

      if (orgUnit === undefined) {
        break;
      }

      if (!isReportingHierarchyLevel(orgUnit.unitType)) {
        break;
      }

      lineage.push(orgUnit);
      currentOrgUnitId = orgUnit.parentOrgUnitId;
    }

    return lineage;
  };
  const aggregateReportingHierarchyRows = (input: {
    comparisonRows: readonly TenantReportingComparisonRowRecord[];
    focusOrgUnitId?: string | undefined;
    level: ReportingHierarchyLevel;
  }): ReportingHierarchyRow[] => {
    const focusOrgUnit =
      input.focusOrgUnitId === undefined ? null : (orgUnitById.get(input.focusOrgUnitId) ?? null);

    if (focusOrgUnit !== null && !isReportingHierarchyLevel(focusOrgUnit.unitType)) {
      return [];
    }

    const groups = new Map<
      string,
      {
        orgUnit: TenantOrgUnitRecord;
        issuedCount: number;
        publicBadgeViewCount: number;
        verificationViewCount: number;
        shareClickCount: number;
        learnerClaimCount: number;
        walletAcceptCount: number;
        weightedClaimRateTotal: number;
        weightedShareRateTotal: number;
      }
    >();

    for (const row of input.comparisonRows) {
      const lineage = buildVisibleOrgUnitLineage(row.groupId);

      if (lineage.length === 0) {
        continue;
      }

      if (focusOrgUnit !== null && !lineage.some((orgUnit) => orgUnit.id === focusOrgUnit.id)) {
        continue;
      }

      const targetOrgUnit = lineage.find((orgUnit) => orgUnit.unitType === input.level);

      if (targetOrgUnit === undefined) {
        continue;
      }

      const group =
        groups.get(targetOrgUnit.id) ??
        (() => {
          const created = {
            orgUnit: targetOrgUnit,
            issuedCount: 0,
            publicBadgeViewCount: 0,
            verificationViewCount: 0,
            shareClickCount: 0,
            learnerClaimCount: 0,
            walletAcceptCount: 0,
            weightedClaimRateTotal: 0,
            weightedShareRateTotal: 0,
          };
          groups.set(targetOrgUnit.id, created);
          return created;
        })();

      group.issuedCount += row.issuedCount;
      group.publicBadgeViewCount += row.publicBadgeViewCount;
      group.verificationViewCount += row.verificationViewCount;
      group.shareClickCount += row.shareClickCount;
      group.learnerClaimCount += row.learnerClaimCount;
      group.walletAcceptCount += row.walletAcceptCount;
      group.weightedClaimRateTotal += row.claimRate * row.issuedCount;
      group.weightedShareRateTotal += row.shareRate * row.issuedCount;
    }

    return Array.from(groups.values())
      .map((group) => {
        const issuedCount = group.issuedCount;

        return {
          orgUnitId: group.orgUnit.id,
          level: input.level,
          issuedCount,
          publicBadgeViewCount: group.publicBadgeViewCount,
          verificationViewCount: group.verificationViewCount,
          shareClickCount: group.shareClickCount,
          learnerClaimCount: group.learnerClaimCount,
          walletAcceptCount: group.walletAcceptCount,
          claimRate: issuedCount === 0 ? 0 : group.weightedClaimRateTotal / issuedCount,
          shareRate: issuedCount === 0 ? 0 : group.weightedShareRateTotal / issuedCount,
        };
      })
      .sort((left, right) => {
        if (right.issuedCount !== left.issuedCount) {
          return right.issuedCount - left.issuedCount;
        }

        return left.orgUnitId.localeCompare(right.orgUnitId);
      });
  };
  const buildReportingHierarchyDrillHref = (orgUnitId: string): string => {
    return `${reportingPath}#${buildReportingHierarchyFocusId(orgUnitId)}`;
  };
  const renderReportingHierarchyRowLabel = (row: ReportingHierarchyRow): string => {
    const orgUnit = orgUnitById.get(row.orgUnitId);

    if (orgUnit === undefined || !isReportingHierarchyLevel(orgUnit.unitType)) {
      return renderOrgUnitSummary(row.orgUnitId);
    }

    const nextLevel = getNextReportingHierarchyLevel(orgUnit.unitType);

    if (nextLevel === null) {
      return `${renderOrgUnitSummary(row.orgUnitId)}<div class="ct-admin__meta">Deepest reporting level</div>`;
    }

    return `${renderOrgUnitSummary(row.orgUnitId)}<div class="ct-admin__meta"><a data-reporting-drill-link href="${escapeHtml(
      buildReportingHierarchyDrillHref(row.orgUnitId),
    )}">View ${escapeHtml(formatReportingHierarchyLevelLabel(nextLevel).toLowerCase())} drilldown</a></div>`;
  };
  const renderReportingHierarchyRows = (
    rows: readonly ReportingHierarchyRow[],
    emptyLabel: string,
  ): string => {
    if (rows.length === 0) {
      return `<tr><td colspan="9" class="ct-admin__empty">${escapeHtml(emptyLabel)}</td></tr>`;
    }

    return rows
      .map((row) => {
        return `<tr>
          <td>${renderReportingHierarchyRowLabel(row)}</td>
          <td>${renderReportingCountCell(row.issuedCount)}</td>
          <td>${renderReportingCountCell(row.publicBadgeViewCount)}</td>
          <td>${renderReportingCountCell(row.verificationViewCount)}</td>
          <td>${renderReportingCountCell(row.shareClickCount)}</td>
          <td>${renderReportingCountCell(row.learnerClaimCount)}</td>
          <td>${renderReportingCountCell(row.walletAcceptCount)}</td>
          <td>${escapeHtml(formatReportingRate(row.claimRate))}</td>
          <td>${escapeHtml(formatReportingRate(row.shareRate))}</td>
        </tr>`;
      })
      .join("\n");
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
                  grant.allowedActions
                    .map((action) => formatDelegatedIssuingActionLabel(action))
                    .join(", "),
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
  const reportingAggregateExportEntries = [
    ...buildReportingPageQueryEntries({
      issuedFrom: reportingIssuedFromValue,
      issuedTo: reportingIssuedToValue,
      badgeTemplateId: reportingBadgeTemplateIdValue,
      orgUnitId: reportingOrgUnitIdValue,
      state: reportingState ?? undefined,
    }),
  ] as const;
  const reportingOverviewExportHref = buildPathWithQuery(
    `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/overview/export.csv`,
    reportingAggregateExportEntries,
  );
  const reportingEngagementExportHref = buildPathWithQuery(
    `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/engagement/export.csv`,
    reportingAggregateExportEntries,
  );
  const reportingTrendsExportHref = buildPathWithQuery(
    `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/trends/export.csv`,
    [...reportingAggregateExportEntries, ["bucket", "day"]] as const,
  );
  const reportingTemplateComparisonExportHref = buildPathWithQuery(
    `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/comparisons/export.csv`,
    [...reportingAggregateExportEntries, ["groupBy", "badgeTemplate"]] as const,
  );
  const reportingOrgUnitComparisonExportHref = buildPathWithQuery(
    `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/comparisons/export.csv`,
    [...reportingAggregateExportEntries, ["groupBy", "orgUnit"]] as const,
  );
  const buildReportingHierarchyExportHref = (focus: {
    focusOrgUnitId: string;
    level: ReportingHierarchyLevel;
  }): string => {
    return buildPathWithQuery(
      `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/hierarchy/export.csv`,
      buildReportingHierarchyQueryEntries({
        issuedFrom: reportingIssuedFromValue,
        issuedTo: reportingIssuedToValue,
        badgeTemplateId: reportingBadgeTemplateIdValue,
        orgUnitId: reportingOrgUnitIdValue,
        state: reportingState ?? undefined,
        focusOrgUnitId: focus.focusOrgUnitId,
        level: focus.level,
      }),
    );
  };
  const reportingExportsPanelMarkup = `<article class="ct-admin__panel ct-stack">
    <div class="ct-cluster">
      <h2>Export CSV</h2>
      <span class="ct-admin__status-pill">Aggregate only</span>
    </div>
    <p>Download the current reporting slices directly from this workspace. These links preserve the visible filter state and stay scope-safe for reporting users.</p>
    <div class="ct-cluster">
      <a class="ct-admin__button ct-admin__button--secondary" href="${escapeHtml(reportingOverviewExportHref)}">Overview CSV</a>
      <a class="ct-admin__button ct-admin__button--secondary" href="${escapeHtml(reportingEngagementExportHref)}">Engagement CSV</a>
      <a class="ct-admin__button ct-admin__button--secondary" href="${escapeHtml(reportingTrendsExportHref)}">Trends CSV</a>
      <a class="ct-admin__button ct-admin__button--secondary" href="${escapeHtml(reportingTemplateComparisonExportHref)}">Template comparisons CSV</a>
      <a class="ct-admin__button ct-admin__button--secondary" href="${escapeHtml(reportingOrgUnitComparisonExportHref)}">Org-unit comparisons CSV</a>
    </div>
    <p class="ct-admin__hint">Recipient-level ledger export stays in Operations for owner/admin users and does not appear in the reporting workspace.</p>
  </article>`;
  const reportingGeneratedAtLabel =
    reportingOverview === null
      ? "Generated just now"
      : `Generated ${formatIsoTimestamp(reportingOverview.generatedAt)}`;
  const reportingSummaryContextItems = [
    {
      label: "Issued window",
      value:
        reportingIssuedFromValue.length > 0 && reportingIssuedToValue.length > 0
          ? `${formatReportingDateLabel(reportingIssuedFromValue)} to ${formatReportingDateLabel(reportingIssuedToValue)}`
          : reportingIssuedFromValue.length > 0
            ? `From ${formatReportingDateLabel(reportingIssuedFromValue)}`
            : reportingIssuedToValue.length > 0
              ? `Through ${formatReportingDateLabel(reportingIssuedToValue)}`
              : "All issue dates",
    },
    {
      label: "Badge template",
      value:
        reportingBadgeTemplateIdValue.length > 0
          ? (templateById.get(reportingBadgeTemplateIdValue)?.title ?? reportingBadgeTemplateIdValue)
          : "All templates",
    },
    {
      label: "Org scope",
      value:
        reportingOrgUnitIdValue.length > 0
          ? getReportingOrgUnitLabel(reportingOrgUnitIdValue)
          : "All visible org units",
    },
    {
      label: "Lifecycle state",
      value: formatReportingStateLabel(reportingState),
    },
  ] as const;
  const reportingExecutiveSummaryMetrics = [
    {
      key: "issued",
      label: "Issued badges",
      value: formatReportingCount(reportingOverview?.counts.issued ?? reportingEngagementCounts?.issuedCount ?? 0),
      detail: "Current issued volume for the selected reporting slice.",
    },
    {
      key: "claim-rate",
      label: "Claim rate",
      value: formatReportingRate(reportingEngagementCounts?.claimRate ?? 0),
      detail: "Distinct claimed or accepted assertions over issued badges.",
    },
    {
      key: "share-rate",
      label: "Share rate",
      value: formatReportingRate(reportingEngagementCounts?.shareRate ?? 0),
      detail: "Distinct shared assertions over issued badges in the same slice.",
    },
    {
      key: "public-badge-views",
      label: "Public badge views",
      value: formatReportingCount(reportingEngagementCounts?.publicBadgeViewCount ?? 0),
      detail: "CredTrail-owned public badge page loads for the current slice.",
    },
  ] as const;
  const reportingExecutiveSummaryMarkup = `<article class="ct-admin__panel ct-stack">
    <div class="ct-admin__reporting-summary-band">
      <div class="ct-admin__reporting-summary-layout">
        <div class="ct-stack">
          <div class="ct-cluster">
            <div class="ct-stack">
              <p class="ct-admin__eyebrow">Executive Summary</p>
              <h2>Executive Summary</h2>
            </div>
            <span class="ct-admin__status-pill">KPI-first</span>
          </div>
          <p class="ct-admin__reporting-summary-copy">Current reporting slice shows ${escapeHtml(
            formatReportingCount(reportingOverview?.counts.issued ?? reportingEngagementCounts?.issuedCount ?? 0),
          )} issued badges, ${escapeHtml(formatReportingRate(reportingEngagementCounts?.claimRate ?? 0))} claim rate, ${escapeHtml(
            formatReportingRate(reportingEngagementCounts?.shareRate ?? 0),
          )} share rate, and ${escapeHtml(
            formatReportingCount(reportingEngagementCounts?.publicBadgeViewCount ?? 0),
          )} public badge views.</p>
        </div>
        <div class="ct-admin__reporting-summary-metrics">
          ${reportingExecutiveSummaryMetrics
            .map((metric) => {
              return `<article class="ct-admin__metric-card ct-admin__metric-card--reporting-summary ct-stack" data-reporting-summary-metric="${escapeHtml(
                metric.key,
              )}">
                <p class="ct-admin__eyebrow">${escapeHtml(metric.label)}</p>
                <strong class="ct-admin__metric-value">${escapeHtml(metric.value)}</strong>
                <p class="ct-admin__hint">${escapeHtml(metric.detail)}</p>
              </article>`;
            })
            .join("\n")}
        </div>
      </div>
    </div>
    <section class="ct-admin__reporting-summary-context" aria-label="Current slice">
      <div class="ct-stack">
        <div class="ct-cluster">
          <p class="ct-admin__eyebrow">Current slice</p>
          <span class="ct-admin__status-pill">${escapeHtml(reportingGeneratedAtLabel)}</span>
        </div>
        <div class="ct-cluster">
          ${reportingSummaryContextItems
            .map((item) => {
              return `<span class="ct-admin__status-pill"><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(
                item.value,
              )}</span>`;
            })
            .join("\n")}
        </div>
      </div>
    </section>
  </article>`;
  const reportingMetricCardsMarkup =
    reportingMetrics.filter((metric) => metric.available).length === 0
      ? '<p class="ct-admin__empty">No reporting metrics are available yet.</p>'
      : reportingMetrics
          .filter((metric) => metric.available)
          .map((metric) => {
            const metricValue =
              metric.key === "claimRate" || metric.key === "shareRate"
                ? formatReportingRate(metric.value ?? 0)
                : formatReportingCount(metric.value ?? 0);

            return `<article class="ct-admin__metric-card ct-stack">
              <p class="ct-admin__eyebrow">${escapeHtml(metric.label)}</p>
              <strong class="ct-admin__metric-value">${escapeHtml(metricValue)}</strong>
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
  const reportingEngagementCardsMarkup =
    reportingEngagementCounts === null
      ? '<p class="ct-admin__empty">Engagement counts are not available yet.</p>'
      : [
          {
            label: "Public badge views",
            description: "Successful public badge page loads captured on CredTrail-owned routes.",
            value: reportingEngagementCounts.publicBadgeViewCount,
          },
          {
            label: "Verification views",
            description: "Successful credential verification responses served by CredTrail.",
            value: reportingEngagementCounts.verificationViewCount,
          },
          {
            label: "Share clicks",
            description: "Outbound share actions routed through CredTrail before handoff.",
            value: reportingEngagementCounts.shareClickCount,
          },
          {
            label: "Claim actions",
            description: "Explicit learner claim actions captured in the dashboard.",
            value: reportingEngagementCounts.learnerClaimCount,
          },
          {
            label: "Wallet accepts",
            description: "Successful OID4VCI credential retrievals recorded as acceptance.",
            value: reportingEngagementCounts.walletAcceptCount,
          },
        ]
          .map((metric) => {
            return `<article class="ct-admin__metric-card ct-stack">
              <p class="ct-admin__eyebrow">${escapeHtml(metric.label)}</p>
              <strong class="ct-admin__metric-value">${escapeHtml(
                formatReportingCount(metric.value),
              )}</strong>
              <p class="ct-admin__hint">${escapeHtml(metric.description)}</p>
            </article>`;
          })
          .join("\n");
  const reportingRateCardsMarkup =
    reportingEngagementCounts === null
      ? ""
      : [
          {
            label: "Claim rate",
            description:
              "Distinct claimed or accepted assertions over issued badges in the same window.",
            value: reportingEngagementCounts.claimRate,
          },
          {
            label: "Share rate",
            description: "Distinct shared assertions over issued badges, not raw repeat clicks.",
            value: reportingEngagementCounts.shareRate,
          },
        ]
          .map((metric) => {
            return `<article class="ct-admin__metric-card ct-stack ct-admin__metric-card--rate">
              <p class="ct-admin__eyebrow">${escapeHtml(metric.label)}</p>
              <strong class="ct-admin__metric-value">${escapeHtml(
                formatReportingRate(metric.value),
              )}</strong>
              <p class="ct-admin__hint">${escapeHtml(metric.description)}</p>
            </article>`;
          })
          .join("\n");
  const reportingEngagementVisualsMarkup =
    reportingEngagementCounts === null
      ? ""
      : `<div class="ct-admin__reporting-visual-grid">
          ${renderReportingVisualModule({
            kind: "comparison-bars",
            title: "Supported engagement signals",
            description:
              "Server-rendered visual of the same raw event totals shown in the metric cards below.",
            series: [
              {
                label: "Public badge views",
                value: reportingEngagementCounts.publicBadgeViewCount,
                detail: "Product-owned page-load events.",
              },
              {
                label: "Verification views",
                value: reportingEngagementCounts.verificationViewCount,
                detail: "Successful verification responses.",
              },
              {
                label: "Share clicks",
                value: reportingEngagementCounts.shareClickCount,
                detail: "CredTrail-owned outbound share actions.",
              },
              {
                label: "Claim actions",
                value: reportingEngagementCounts.learnerClaimCount,
                detail: "Explicit learner claim events.",
              },
              {
                label: "Wallet accepts",
                value: reportingEngagementCounts.walletAcceptCount,
                detail: "Successful credential retrievals.",
              },
            ] as const,
            note: "Cards below keep the same raw counts visible for review and export parity checks.",
          })}
          ${renderReportingVisualModule({
            kind: "comparison-bars",
            title: "Rate context",
            description:
              "Claim and share rates stay derived from distinct engaged assertions over the same issued-badge window.",
            series: [
              {
                label: "Claim rate",
                value: reportingEngagementCounts.claimRate,
                detail: `${formatReportingCount(reportingEngagementCounts.learnerClaimCount)} claim actions over ${formatReportingCount(reportingEngagementCounts.issuedCount)} issued badges.`,
              },
              {
                label: "Share rate",
                value: reportingEngagementCounts.shareRate,
                detail: `${formatReportingCount(reportingEngagementCounts.shareClickCount)} share clicks over ${formatReportingCount(reportingEngagementCounts.issuedCount)} issued badges.`,
              },
            ] as const,
            note: "This visual does not replace the rate cards; it keeps the same definitions in a shared presentation seam.",
          })}
        </div>`;
  const reportingOverviewVisualMarkup =
    reportingOverview === null
      ? ""
      : renderReportingVisualModule({
          kind: "stacked-summary",
          title: "Current badge-state mix",
          description:
            "Shared visual summarizes the same lifecycle-state counts shown in the cards for the current reporting slice.",
          series: [
            {
              label: "Active",
              value: reportingOverview.counts.active,
              detail: `${formatReportingCount(reportingOverview.counts.active)} currently active badges`,
            },
            {
              label: "Suspended",
              value: reportingOverview.counts.suspended,
              detail: `${formatReportingCount(reportingOverview.counts.suspended)} currently suspended badges`,
            },
            {
              label: "Revoked",
              value: reportingOverview.counts.revoked,
              detail: `${formatReportingCount(reportingOverview.counts.revoked)} revoked badges`,
            },
            {
              label: "Pending review",
              value: reportingOverview.counts.pendingReview,
              detail: `${formatReportingCount(reportingOverview.counts.pendingReview)} suspended-for-review badges`,
            },
          ] as const,
          note: "Cards below retain the exact lifecycle counts used for reporting review and export parity.",
        });
  const reportingTrendVisualMarkup =
    reportingTrends === null || reportingTrends.series.length === 0
      ? ""
      : renderReportingVisualModule({
          kind: "trend-series",
          title: "Issued over time",
          description:
            "Shared SSR trend visual uses issued counts from the current reporting filter slice. The full table remains below for supported engagement detail.",
          series: reportingTrends.series.map((row) => ({
            label: formatReportingDateLabel(row.bucketStart),
            value: row.issuedCount,
            detail: `${formatReportingCount(row.publicBadgeViewCount)} public views · ${formatReportingCount(row.shareClickCount)} shares`,
          })),
          note: "The table below preserves every visible count so the chart remains a summary, not a second interpretation layer.",
        });
  const reportingTrendRowsMarkup =
    reportingTrends === null || reportingTrends.series.length === 0
      ? '<tr><td colspan="7" class="ct-admin__empty">No trend data available for the selected filters.</td></tr>'
      : reportingTrends.series
          .map((row) => {
            return `<tr>
              <td><strong>${escapeHtml(formatReportingDateLabel(row.bucketStart))}</strong></td>
              <td>${renderReportingCountCell(row.issuedCount)}</td>
              <td>${renderReportingCountCell(row.publicBadgeViewCount)}</td>
              <td>${renderReportingCountCell(row.verificationViewCount)}</td>
              <td>${renderReportingCountCell(row.shareClickCount)}</td>
              <td>${renderReportingCountCell(row.learnerClaimCount)}</td>
              <td>${renderReportingCountCell(row.walletAcceptCount)}</td>
            </tr>`;
          })
          .join("\n");
  const renderReportingComparisonRows = (
    rows: readonly TenantReportingComparisonRowRecord[],
    emptyLabel: string,
  ): string => {
    if (rows.length === 0) {
      return `<tr><td colspan="9" class="ct-admin__empty">${escapeHtml(emptyLabel)}</td></tr>`;
    }

    return rows
      .map((row) => {
        return `<tr>
          <td>${renderReportingComparisonGroupLabel(row)}</td>
          <td>${renderReportingCountCell(row.issuedCount)}</td>
          <td>${renderReportingCountCell(row.publicBadgeViewCount)}</td>
          <td>${renderReportingCountCell(row.verificationViewCount)}</td>
          <td>${renderReportingCountCell(row.shareClickCount)}</td>
          <td>${renderReportingCountCell(row.learnerClaimCount)}</td>
          <td>${renderReportingCountCell(row.walletAcceptCount)}</td>
          <td>${escapeHtml(formatReportingRate(row.claimRate))}</td>
          <td>${escapeHtml(formatReportingRate(row.shareRate))}</td>
        </tr>`;
      })
      .join("\n");
  };
  const reportingTemplateComparisonRowsMarkup = renderReportingComparisonRows(
    reportingTemplateComparisons,
    "No badge-template comparisons available for the selected filters.",
  );
  const reportingTemplateComparisonVisualMarkup =
    reportingTemplateComparisons.length === 0
      ? ""
      : renderReportingVisualModule({
          kind: "stacked-summary",
          title: "Issued mix by badge template",
          description:
            "Shared visual summarizes how issued volume is distributed across badge templates for the same filters shown in the table.",
          series: reportingTemplateComparisons.map((row) => ({
            label: getReportingComparisonLabel(row),
            value: row.issuedCount,
            detail: buildReportingLegendDetail({
              publicBadgeViewCount: row.publicBadgeViewCount,
              claimRate: row.claimRate,
              shareRate: row.shareRate,
            }),
          })),
          note: "The table below keeps the full row-level counts and rate definitions visible.",
        });
  const reportingOrgUnitComparisonRowsMarkup = renderReportingComparisonRows(
    reportingOrgUnitComparisons,
    "No org-unit comparisons available for the selected filters.",
  );
  const reportingOrgUnitComparisonVisualMarkup =
    reportingOrgUnitComparisons.length === 0
      ? ""
      : renderReportingVisualModule({
          kind: "stacked-summary",
          title: "Issued mix by org unit",
          description:
            "Shared visual summarizes current org-unit reporting rows while the exact comparison table stays below.",
          series: reportingOrgUnitComparisons.map((row) => ({
            label: getReportingComparisonLabel(row),
            value: row.issuedCount,
            detail: buildReportingLegendDetail({
              publicBadgeViewCount: row.publicBadgeViewCount,
              claimRate: row.claimRate,
              shareRate: row.shareRate,
            }),
          })),
          note: "This figure stays aligned to the same org-unit comparison rows and exports shown elsewhere in reporting.",
        });
  const reportingHierarchyRowsByLevel = new Map(
    REPORTING_HIERARCHY_LEVELS.map((level) => [
      level,
      aggregateReportingHierarchyRows({
        comparisonRows: reportingOrgUnitComparisons,
        level,
      }),
    ]),
  );
  const reportingVisibleRoots = input.orgUnits
    .filter(
      (orgUnit) =>
        isReportingHierarchyLevel(orgUnit.unitType) &&
        (orgUnit.parentOrgUnitId === null || !orgUnitById.has(orgUnit.parentOrgUnitId)) &&
        (reportingHierarchyRowsByLevel
          .get(orgUnit.unitType)
          ?.some((row) => row.orgUnitId === orgUnit.id) ??
          false),
    )
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
  const renderReportingHierarchyFocusSection = (
    focusOrgUnit: TenantOrgUnitRecord,
    breadcrumb: readonly TenantOrgUnitRecord[],
  ): string => {
    if (!isReportingHierarchyLevel(focusOrgUnit.unitType)) {
      return "";
    }

    const childLevel = getNextReportingHierarchyLevel(focusOrgUnit.unitType);
    const sectionId = buildReportingHierarchyFocusId(focusOrgUnit.id);
    const rows =
      childLevel === null
        ? []
        : aggregateReportingHierarchyRows({
            comparisonRows: reportingOrgUnitComparisons,
            focusOrgUnitId: focusOrgUnit.id,
            level: childLevel,
          });
    const breadcrumbLabel = breadcrumb.map((orgUnit) => orgUnit.displayName).join(" / ");
    const visualMarkup =
      childLevel === null || rows.length === 0
        ? ""
        : renderReportingVisualModule({
            kind: "comparison-bars",
            headingLevel: "h4",
            id: `${sectionId}-visual`,
            title: `${focusOrgUnit.displayName} ${formatReportingHierarchyLevelLabel(childLevel)} overview`,
            description:
              "Shared visual compares issued volume across the currently visible child rows. Detailed counts remain in the table.",
            series: rows.map((row) => ({
              label: getReportingOrgUnitLabel(row.orgUnitId),
              value: row.issuedCount,
              detail: buildReportingLegendDetail({
                publicBadgeViewCount: row.publicBadgeViewCount,
                claimRate: row.claimRate,
                shareRate: row.shareRate,
              }),
            })),
            note: `The ${formatReportingHierarchyLevelLabel(childLevel).toLowerCase()} table below keeps every visible count and drill target intact.`,
          });
    const childMarkup =
      childLevel === null
        ? `<p class="ct-admin__hint">Program is the deepest reporting level in this workspace.</p>`
        : `<div class="ct-admin__reporting-panel-media">
            ${visualMarkup}
            <div class="ct-admin__table-wrap">
            <table class="ct-admin__table">
              <thead>
                <tr>
                  <th>${escapeHtml(formatReportingHierarchyLevelLabel(childLevel))}</th>
                  <th>Issued</th>
                  <th>Public badge views</th>
                  <th>Verification views</th>
                  <th>Share clicks</th>
                  <th>Claim actions</th>
                  <th>Wallet accepts</th>
                  <th>Claim rate</th>
                  <th>Share rate</th>
                </tr>
              </thead>
              <tbody data-reporting-bar-group="${escapeHtml(sectionId)}">
                ${renderReportingHierarchyRows(
                  rows,
                  `No ${formatReportingHierarchyLevelLabel(childLevel).toLowerCase()} rows available for this focus.`,
                )}
              </tbody>
            </table>
            </div>
          </div>`;
    const descendantMarkup = rows
      .map((row) => {
        const childOrgUnit = orgUnitById.get(row.orgUnitId);

        if (childOrgUnit === undefined || !isReportingHierarchyLevel(childOrgUnit.unitType)) {
          return "";
        }

        return renderReportingHierarchyFocusSection(childOrgUnit, [...breadcrumb, childOrgUnit]);
      })
      .join("\n");

    return `<section id="${escapeHtml(sectionId)}" class="ct-admin__reporting-focus-section ct-stack" data-reporting-focus-section tabindex="-1">
      <div class="ct-cluster">
        <h3>${escapeHtml(focusOrgUnit.displayName)}</h3>
        <div class="ct-cluster">
          <span class="ct-admin__status-pill">${escapeHtml(
            childLevel === null
              ? "Program leaf"
              : `Shows ${formatReportingHierarchyLevelLabel(childLevel).toLowerCase()} rows`,
          )}</span>
          ${
            childLevel === null
              ? ""
              : `<a class="ct-admin__button ct-admin__button--secondary" href="${escapeHtml(
                  buildReportingHierarchyExportHref({
                    focusOrgUnitId: focusOrgUnit.id,
                    level: childLevel,
                  }),
                )}">Export CSV</a>`
          }
        </div>
      </div>
      <p class="ct-admin__eyebrow">Breadcrumb</p>
      <p class="ct-admin__reporting-breadcrumb">${escapeHtml(breadcrumbLabel)}</p>
      ${childMarkup}
      ${descendantMarkup}
    </section>`;
  };
  const reportingHierarchyPanelMarkup =
    reportingVisibleRoots.length === 0
      ? `<article class="ct-admin__panel ct-stack">
          <h2>Hierarchy drilldown</h2>
          <p class="ct-admin__empty">No hierarchy rows are available for the current reporting filters.</p>
        </article>`
      : `<article class="ct-admin__panel ct-stack">
          <div class="ct-cluster">
            <h2>Hierarchy drilldown</h2>
            <span class="ct-admin__status-pill">Workspace-local</span>
          </div>
          <p>Use these tables to move between institution, college, department, and program views without leaving reporting. The overview filters above stay exact-match; hierarchy drilldowns stay explicit here.</p>
          <p class="ct-admin__hint">Visible roots stay inside the reporting workspace.</p>
          <div class="ct-admin__reporting-root-links">
            ${reportingVisibleRoots
              .map((rootOrgUnit) => {
                return `<a class="ct-admin__reporting-root-link" href="${escapeHtml(
                  buildReportingHierarchyDrillHref(rootOrgUnit.id),
                )}">${escapeHtml(rootOrgUnit.displayName)}</a>`;
              })
              .join("\n")}
          </div>
          ${reportingVisibleRoots
            .map((rootOrgUnit) => renderReportingHierarchyFocusSection(rootOrgUnit, [rootOrgUnit]))
            .join("\n")}
        </article>`;
  const reportingPerformerLevel =
    REPORTING_HIERARCHY_LEVELS.filter(
      (level) => (reportingHierarchyRowsByLevel.get(level)?.length ?? 0) > 1,
    ).sort((left, right) => {
      const countDifference =
        (reportingHierarchyRowsByLevel.get(right)?.length ?? 0) -
        (reportingHierarchyRowsByLevel.get(left)?.length ?? 0);

      if (countDifference !== 0) {
        return countDifference;
      }

      return REPORTING_HIERARCHY_DEPTH[right] - REPORTING_HIERARCHY_DEPTH[left];
    })[0] ?? null;
  const reportingPerformerRows =
    reportingPerformerLevel === null
      ? []
      : (reportingHierarchyRowsByLevel.get(reportingPerformerLevel) ?? []);
  const reportingRateEligibleRows = reportingPerformerRows.filter(
    (row) => row.issuedCount >= REPORTING_RATE_MIN_ISSUED,
  );
  const renderPerformerTableRows = (
    rows: readonly ReportingHierarchyRow[],
    emptyLabel: string,
  ): string => {
    if (rows.length === 0) {
      return `<tr><td colspan="4" class="ct-admin__empty">${escapeHtml(emptyLabel)}</td></tr>`;
    }

    return rows
      .map((row) => {
        return `<tr>
          <td>${renderOrgUnitSummary(row.orgUnitId)}</td>
          <td>${renderReportingCountCell(row.issuedCount)}</td>
          <td>${escapeHtml(formatReportingRate(row.claimRate))}</td>
          <td>${escapeHtml(formatReportingRate(row.shareRate))}</td>
        </tr>`;
      })
      .join("\n");
  };
  const renderPerformerPanel = (input: {
    description: string;
    title: string;
    rows: readonly ReportingHierarchyRow[];
    emptyLabel: string;
    barGroup: string;
    metric: "claimRate" | "issuedCount" | "shareRate";
  }): string => {
    const visualMarkup =
      input.rows.length === 0
        ? ""
        : renderReportingVisualModule({
            kind: "comparison-bars",
            headingLevel: "h4",
            id: `performer-${input.barGroup}`,
            title: input.title,
            description: input.description,
            series: input.rows.map((row) => ({
              label: getReportingOrgUnitLabel(row.orgUnitId),
              value:
                input.metric === "issuedCount"
                  ? row.issuedCount
                  : input.metric === "claimRate"
                    ? row.claimRate
                    : row.shareRate,
              detail:
                input.metric === "issuedCount"
                  ? `${formatReportingRate(row.claimRate)} claim · ${formatReportingRate(row.shareRate)} share`
                  : `${formatReportingCount(row.issuedCount)} issued · ${
                      input.metric === "claimRate"
                        ? `${formatReportingRate(row.shareRate)} share`
                        : `${formatReportingRate(row.claimRate)} claim`
                    }`,
            })),
            note: "The table below preserves the same rows for detailed comparison.",
          });

    return `<article class="ct-admin__panel ct-admin__panel--nested ct-stack">
      <h3>${escapeHtml(input.title)}</h3>
      ${visualMarkup}
      <div class="ct-admin__table-wrap">
        <table class="ct-admin__table ct-admin__table--compact">
          <thead>
            <tr>
              <th>Org unit</th>
              <th>Issued</th>
              <th>Claim rate</th>
              <th>Share rate</th>
            </tr>
          </thead>
          <tbody data-reporting-bar-group="${escapeHtml(input.barGroup)}">
            ${renderPerformerTableRows(input.rows, input.emptyLabel)}
          </tbody>
        </table>
      </div>
    </article>`;
  };
  const reportingHighestVolumeRows = [...reportingPerformerRows]
    .sort((left, right) => {
      if (right.issuedCount !== left.issuedCount) {
        return right.issuedCount - left.issuedCount;
      }

      return left.orgUnitId.localeCompare(right.orgUnitId);
    })
    .slice(0, REPORTING_PERFORMER_ROW_LIMIT);
  const reportingLowestVolumeRows = [...reportingPerformerRows]
    .sort((left, right) => {
      if (left.issuedCount !== right.issuedCount) {
        return left.issuedCount - right.issuedCount;
      }

      return left.orgUnitId.localeCompare(right.orgUnitId);
    })
    .slice(0, REPORTING_PERFORMER_ROW_LIMIT);
  const reportingHighestClaimRateRows = [...reportingRateEligibleRows]
    .sort((left, right) => {
      if (right.claimRate !== left.claimRate) {
        return right.claimRate - left.claimRate;
      }

      if (right.issuedCount !== left.issuedCount) {
        return right.issuedCount - left.issuedCount;
      }

      return left.orgUnitId.localeCompare(right.orgUnitId);
    })
    .slice(0, REPORTING_PERFORMER_ROW_LIMIT);
  const reportingLowestClaimRateRows = [...reportingRateEligibleRows]
    .sort((left, right) => {
      if (left.claimRate !== right.claimRate) {
        return left.claimRate - right.claimRate;
      }

      if (left.issuedCount !== right.issuedCount) {
        return left.issuedCount - right.issuedCount;
      }

      return left.orgUnitId.localeCompare(right.orgUnitId);
    })
    .slice(0, REPORTING_PERFORMER_ROW_LIMIT);
  const reportingHighestShareRateRows = [...reportingRateEligibleRows]
    .sort((left, right) => {
      if (right.shareRate !== left.shareRate) {
        return right.shareRate - left.shareRate;
      }

      if (right.issuedCount !== left.issuedCount) {
        return right.issuedCount - left.issuedCount;
      }

      return left.orgUnitId.localeCompare(right.orgUnitId);
    })
    .slice(0, REPORTING_PERFORMER_ROW_LIMIT);
  const reportingLowestShareRateRows = [...reportingRateEligibleRows]
    .sort((left, right) => {
      if (left.shareRate !== right.shareRate) {
        return left.shareRate - right.shareRate;
      }

      if (left.issuedCount !== right.issuedCount) {
        return left.issuedCount - right.issuedCount;
      }

      return left.orgUnitId.localeCompare(right.orgUnitId);
    })
    .slice(0, REPORTING_PERFORMER_ROW_LIMIT);
  const reportingPerformerPanelsMarkup =
    reportingPerformerLevel === null
      ? `<article class="ct-admin__panel ct-stack">
          <h2>Performer panels</h2>
          <p class="ct-admin__empty">No comparable hierarchy rows are available for performer rankings yet.</p>
        </article>`
      : `<article class="ct-admin__panel ct-stack">
          <div class="ct-cluster">
            <h2>Performer panels</h2>
            <span class="ct-admin__status-pill">${escapeHtml(
              `${formatReportingHierarchyLevelLabel(reportingPerformerLevel)} rows`,
            )}</span>
          </div>
          <p>These rankings keep issued volume separate from claim and share rates.</p>
          <p class="ct-admin__hint">Panels compare ${escapeHtml(
            formatReportingHierarchyLevelLabel(reportingPerformerLevel).toLowerCase(),
          )} rows in the current visible hierarchy.</p>
          <p class="ct-admin__hint">Minimum sample for rate panels: ${escapeHtml(
            formatReportingCount(REPORTING_RATE_MIN_ISSUED),
          )} issued badges.</p>
          <div class="ct-admin__reporting-performer-grid">
            ${renderPerformerPanel({
              title: "Highest issuance volume",
              description:
                "Shared visual compares the highest-volume org units without hiding the exact issued totals or rates.",
              rows: reportingHighestVolumeRows,
              emptyLabel: "No org units available for volume rankings.",
              barGroup: "performer-high-volume",
              metric: "issuedCount",
            })}
            ${renderPerformerPanel({
              title: "Lowest issuance volume",
              description:
                "Shared visual compares the lowest-volume org units while keeping the same tabular rows underneath.",
              rows: reportingLowestVolumeRows,
              emptyLabel: "No org units available for volume rankings.",
              barGroup: "performer-low-volume",
              metric: "issuedCount",
            })}
            ${renderPerformerPanel({
              title: "Highest claim rate",
              description:
                "Shared visual compares claim-rate leaders for rows that meet the minimum issued-badge threshold.",
              rows: reportingHighestClaimRateRows,
              emptyLabel: `No ${formatReportingHierarchyLevelLabel(reportingPerformerLevel).toLowerCase()} rows meet the minimum rate sample.`,
              barGroup: "performer-high-claim-rate",
              metric: "claimRate",
            })}
            ${renderPerformerPanel({
              title: "Lowest claim rate",
              description:
                "Shared visual compares lower claim-rate rows without changing the minimum-sample rule.",
              rows: reportingLowestClaimRateRows,
              emptyLabel: `No ${formatReportingHierarchyLevelLabel(reportingPerformerLevel).toLowerCase()} rows meet the minimum rate sample.`,
              barGroup: "performer-low-claim-rate",
              metric: "claimRate",
            })}
            ${renderPerformerPanel({
              title: "Highest share rate",
              description:
                "Shared visual compares share-rate leaders while keeping issued totals visible in the adjacent table.",
              rows: reportingHighestShareRateRows,
              emptyLabel: `No ${formatReportingHierarchyLevelLabel(reportingPerformerLevel).toLowerCase()} rows meet the minimum rate sample.`,
              barGroup: "performer-high-share-rate",
              metric: "shareRate",
            })}
            ${renderPerformerPanel({
              title: "Lowest share rate",
              description:
                "Shared visual compares lower share-rate rows with the same volume threshold applied to the table below.",
              rows: reportingLowestShareRateRows,
              emptyLabel: `No ${formatReportingHierarchyLevelLabel(reportingPerformerLevel).toLowerCase()} rows meet the minimum rate sample.`,
              barGroup: "performer-low-share-rate",
              metric: "shareRate",
            })}
          </div>
        </article>`;
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
    reportingComparisonsApiPath: `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/comparisons`,
    reportingEngagementApiPath: `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/engagement`,
    reportingPagePath: reportingPath,
    reportingOverviewApiPath: `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/overview`,
    reportingTrendsApiPath: `/v1/tenants/${encodeURIComponent(input.tenant.id)}/reporting/trends`,
    authPolicyApiPath: input.tenant.planTier === "enterprise" ? authPolicyApiPath : "",
    authProvidersApiPath: input.tenant.planTier === "enterprise" ? authProvidersApiPath : "",
    breakGlassAccountsApiPath:
      input.tenant.planTier === "enterprise"
        ? `/v1/tenants/${encodeURIComponent(input.tenant.id)}/break-glass-accounts`
        : "",
  });
  const sidebarLink = (href: string, label: string, isCurrent: boolean, extra = ""): string => {
    const cls = extra.length > 0 ? `ct-admin-sidebar__link ${extra}` : "ct-admin-sidebar__link";
    return `<a class="${cls}" href="${escapeHtml(href)}"${isCurrent ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
  };

  const renderSidebar = (): string => {
    return `<aside class="ct-admin-sidebar">
      <a class="ct-admin-sidebar__brand" href="${escapeHtml(tenantAdminPath)}">CredTrail</a>
      <nav class="ct-admin-sidebar__nav" aria-label="Admin navigation">
        ${sidebarLink(tenantAdminPath, "Home", view === "home")}

        <p class="ct-admin-sidebar__section-label">Operations</p>
        ${sidebarLink(operationsPath, "Overview", view === "operations")}
        ${sidebarLink(operationsReviewQueuePath, "Review Queue", view === "operationsReviewQueue", "ct-admin-sidebar__link--sub")}
        ${sidebarLink(operationsIssuedBadgesPath, "Issued Badges", view === "operationsIssuedBadges", "ct-admin-sidebar__link--sub")}
        ${sidebarLink(operationsBadgeStatusPath, "Badge Status", view === "operationsBadgeStatus", "ct-admin-sidebar__link--sub")}

        <p class="ct-admin-sidebar__section-label">Reporting</p>
        ${sidebarLink(reportingPath, "Overview", view === "reporting")}

        <p class="ct-admin-sidebar__section-label">Configuration</p>
        ${sidebarLink(rulesWorkspacePath, "Rules", view === "rules")}

        <p class="ct-admin-sidebar__section-label">Access</p>
        ${sidebarLink(accessPath, "Overview", view === "access")}
        ${sidebarLink(accessGovernancePath, "Governance", view === "accessGovernance", "ct-admin-sidebar__link--sub")}
        ${sidebarLink(accessApiKeysPath, "API Keys", view === "accessApiKeys", "ct-admin-sidebar__link--sub")}
        ${sidebarLink(accessOrgUnitsPath, "Org Units", view === "accessOrgUnits", "ct-admin-sidebar__link--sub")}
      </nav>
      <div class="ct-admin-sidebar__footer">
        <a class="ct-admin-sidebar__footer-link ct-admin-sidebar__link--external" href="${escapeHtml(adminAuditLogPath)}">Audit logs</a>
        <a class="ct-admin-sidebar__footer-link ct-admin-sidebar__link--external" href="${escapeHtml(showcasePath)}" target="_blank" rel="noopener noreferrer">Public showcase</a>
        ${switchOrganizationPath.length > 0 ? `<a class="ct-admin-sidebar__footer-link" href="${escapeHtml(switchOrganizationPath)}">Switch organization</a>` : ""}
      </div>
    </aside>`;
  };

  const renderTopbar = (): string => {
    return `<header class="ct-admin-topbar">
      <button type="button" class="ct-admin-topbar__toggle" aria-label="Toggle navigation" data-sidebar-toggle>☰</button>
      <p class="ct-admin-topbar__title">${escapeHtml(input.tenant.displayName)}</p>
      <div class="ct-admin-topbar__user">
        <span class="ct-admin-topbar__chip">${escapeHtml(input.membershipRole)}</span>
        <span class="ct-admin-topbar__chip">${escapeHtml(input.tenant.planTier)}</span>
        <span title="User ID: ${escapeHtml(input.userId)}">${escapeHtml(userLabel)}</span>
      </div>
    </header>`;
  };

  const renderPageHeader = (title: string, description: string, noteMarkup = ""): string => {
    return `<div class="ct-admin-page-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      ${noteMarkup}
    </div>`;
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
      <div class="ct-admin__workspace-stats ct-cluster">
        <span class="ct-admin__status-pill">Issued ${reportingOverview?.counts.issued ?? 0}</span>
        <span class="ct-admin__status-pill">Pending review ${reportingOverview?.counts.pendingReview ?? 0}</span>
      </div>
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
    <section class="ct-admin__panel ct-admin__panel--nested ct-stack">
      <div class="ct-cluster">
        <h3>Ledger export</h3>
        <span class="ct-admin__status-pill">Owner/admin only</span>
      </div>
      <p>Download an audit-focused CSV directly from the operations workspace. This export stays separate from the browser-loaded ledger list and runs as a plain server-side attachment response.</p>
      <form
        id="issued-badges-export-form"
        method="get"
        action="/v1/tenants/${escapeHtml(input.tenant.id)}/assertions/ledger-export.csv"
        class="ct-admin__form ct-admin__form--inline ct-grid"
      >
        <label>
          Issued from
          <input name="issuedFrom" type="date" />
        </label>
        <label>
          Issued to
          <input name="issuedTo" type="date" />
        </label>
        <label>
          Badge template
          <select name="badgeTemplateId">
            <option value="">All templates</option>
            ${templateFilterOptions}
          </select>
        </label>
        <label>
          Org unit
          <select name="orgUnitId">
            <option value="">All org units</option>
            ${activeOrgUnitOptions}
          </select>
        </label>
        <label>
          Lifecycle state
          <select name="state">
            <option value="">All current states</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="revoked">revoked</option>
            <option value="expired">expired</option>
            <option value="pending_review">pending review</option>
          </select>
        </label>
        <label>
          Recipient / assertion search
          <input
            name="recipientQuery"
            type="text"
            placeholder="Filter by recipient, identifier, or assertion ID"
          />
        </label>
        <button type="submit">Export ledger CSV</button>
      </form>
      <p class="ct-admin__hint">Synchronous CSV export is capped at 5000 rows. Narrow the filters above if the export is too large for direct download.</p>
      <p class="ct-admin__hint">Ancestor lineage columns reflect the current org tree only, while stable leaf attribution remains the historical contract for audit use.</p>
    </section>
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
    <div class="ct-cluster">
      <h2>Reporting Overview</h2>
      <span class="ct-admin__status-pill">Supporting detail</span>
    </div>
    <p>Filter by issue date, template, org unit, or current badge state. Counts reflect product-owned data only, and analytics stay in this reporting workspace.</p>
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
    <div class="ct-admin__reporting-panel-media">
      ${reportingOverviewVisualMarkup}
      <div class="ct-admin__metric-grid">
        ${reportingMetricCardsMarkup}
      </div>
    </div>
    <p class="ct-admin__hint">Generated ${escapeHtml(
      reportingOverview === null ? "just now" : formatIsoTimestamp(reportingOverview.generatedAt),
    )}</p>
  </article>`;

  const reportingEngagementPanelMarkup = `<article class="ct-admin__panel ct-stack">
    <div class="ct-cluster">
      <h2>Engagement Counts</h2>
      <span class="ct-admin__status-pill">Phase 10 product data</span>
    </div>
    <p>Raw counts show event totals. Rates use distinct engaged assertions over issued badges, so comparison tables do not inflate because of repeat clicks from one assertion.</p>
    ${reportingEngagementVisualsMarkup}
    <div class="ct-admin__metric-grid">
      ${reportingEngagementCardsMarkup}
    </div>
    ${
      reportingRateCardsMarkup.length === 0
        ? ""
        : `<div class="ct-admin__metric-grid ct-admin__metric-grid--rates">
            ${reportingRateCardsMarkup}
          </div>`
    }
  </article>`;

  const reportingTrendPanelMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
    <h2>Trend lines</h2>
    <p>Trend lines combine issuance and supported engagement counts over time for the same reporting filters. Claim actions and wallet accepts remain separate events here.</p>
    <div class="ct-admin__reporting-panel-media">
      ${reportingTrendVisualMarkup}
      <div class="ct-admin__table-wrap">
        <table class="ct-admin__table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Issued</th>
              <th>Public badge views</th>
              <th>Verification views</th>
              <th>Share clicks</th>
              <th>Claim actions</th>
              <th>Wallet accepts</th>
            </tr>
          </thead>
          <tbody data-reporting-bar-group="trends">
            ${reportingTrendRowsMarkup}
          </tbody>
        </table>
      </div>
    </div>
  </article>`;

  const reportingTemplateComparisonPanelMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
    <h2>Compare by badge template</h2>
    <p>Use this table to compare issuance volume, supported engagement counts, and rate metrics across badge templates without leaving reporting.</p>
    <div class="ct-admin__reporting-panel-media">
      ${reportingTemplateComparisonVisualMarkup}
      <div class="ct-admin__table-wrap">
        <table class="ct-admin__table">
          <thead>
            <tr>
              <th>Badge template</th>
              <th>Issued</th>
              <th>Public badge views</th>
              <th>Verification views</th>
              <th>Share clicks</th>
              <th>Claim actions</th>
              <th>Wallet accepts</th>
              <th>Claim rate</th>
              <th>Share rate</th>
            </tr>
          </thead>
          <tbody data-reporting-bar-group="template-comparisons">
            ${reportingTemplateComparisonRowsMarkup}
          </tbody>
        </table>
      </div>
    </div>
  </article>`;

  const reportingOrgUnitComparisonPanelMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
    <h2>Compare by org unit</h2>
    <p>This flat comparison remains available alongside hierarchy drilldowns so buyers can keep one explicit table for exact org-unit group rows.</p>
    <div class="ct-admin__reporting-panel-media">
      ${reportingOrgUnitComparisonVisualMarkup}
      <div class="ct-admin__table-wrap">
        <table class="ct-admin__table">
          <thead>
            <tr>
              <th>Org unit</th>
              <th>Issued</th>
              <th>Public badge views</th>
              <th>Verification views</th>
              <th>Share clicks</th>
              <th>Claim actions</th>
              <th>Wallet accepts</th>
              <th>Claim rate</th>
              <th>Share rate</th>
            </tr>
          </thead>
          <tbody data-reporting-bar-group="org-comparisons">
            ${reportingOrgUnitComparisonRowsMarkup}
          </tbody>
        </table>
      </div>
    </div>
  </article>`;

  const reportingDefinitionsPanelMarkup = `<article class="ct-admin__panel ct-admin__panel--table ct-stack">
    <h2>Metric Definitions</h2>
    <p>Every number in this page lists its source so institution admins can tell the difference between event totals and rate-style comparisons.</p>
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

  const viewContent =
    view === "home"
      ? `${renderPageHeader(
          "Institution Admin",
          "Choose a workspace instead of forcing every task onto one page.",
          `<aside class="ct-admin-page-header__note">
            <h2>Start Here</h2>
            <p>Operations is the primary daily workspace. Use the Rules and Access pages to configure policy and permissions.</p>
          </aside>`,
        )}
        <section class="ct-admin ct-stack">
          ${workspaceCardsMarkup}
        </section>`
      : view === "operations"
        ? `${renderPageHeader(
            "Operations",
            "Issue badges here, then use dedicated pages for review queue, issued badges, and badge status.",
          )}
          <section class="ct-admin ct-stack">
            ${manualIssuePanelMarkup}
          </section>`
        : view === "operationsReviewQueue"
          ? `${renderPageHeader(
              "Rule Review Queue",
              "Review pending badge decisions without mixing them into the rest of operations.",
            )}
            <section class="ct-admin ct-stack">
              ${ruleReviewQueuePanelMarkup}
            </section>`
          : view === "operationsIssuedBadges"
            ? `${renderPageHeader(
                "Issued Badges",
                "Search issued badges and take audit or revocation actions from one page.",
              )}
              <section class="ct-admin ct-stack">
                ${issuedBadgesPanelMarkup}
              </section>`
            : view === "operationsBadgeStatus"
              ? `${renderPageHeader(
                  "Badge Status",
                  "Look up a badge, inspect its current state, and apply status changes with a reason.",
                )}
                <section class="ct-admin ct-stack">
                  ${badgeStatusPanelMarkup}
                </section>`
              : view === "reporting"
                ? `${renderPageHeader(
                    "Reporting",
                    "Track issuance, engagement, and comparison metrics with product-owned data that stays inside CredTrail.",
                    `<aside class="ct-admin-page-header__note">
                      <h2>Phase 11 Scope</h2>
                      <p>Hierarchy drilldowns, breadcrumbs, and performer panels now stay inside the reporting workspace. Filters above remain explicit and exact-match.</p>
                    </aside>`,
                  )}
                  <section class="ct-admin ct-stack">
                    ${reportingExecutiveSummaryMarkup}
                    ${reportingOverviewPanelMarkup}
                    ${reportingExportsPanelMarkup}
                    ${reportingEngagementPanelMarkup}
                    ${reportingTrendPanelMarkup}
                    ${reportingTemplateComparisonPanelMarkup}
                    ${reportingHierarchyPanelMarkup}
                    ${reportingPerformerPanelsMarkup}
                    ${reportingOrgUnitComparisonPanelMarkup}
                    ${reportingDefinitionsPanelMarkup}
                    ${reportingDeferredPanelMarkup}
                  </section>`
                : view === "rules"
                  ? `${renderPageHeader(
                      "Rules",
                      "Keep authoring, template maintenance, and governance context together in one focused workspace.",
                    )}
                  <section class="ct-admin ct-stack">
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
                  </section>`
                  : view === "access"
                    ? `${renderPageHeader(
                        "Access",
                        "Governance, API keys, and org units are accessible from the sidebar.",
                      )}
                    <section class="ct-admin ct-stack">
                      ${enterpriseAuthPanelMarkup}
                    </section>`
                    : view === "accessGovernance"
                      ? `${renderPageHeader(
                          "Governance Delegation",
                          "Grant org-unit access and time-boxed badge authority with direct removal from the current assignments list.",
                          `<aside class="ct-admin-page-header__note">
                          <h2>Choose The Smallest Access</h2>
                          <p>Use scoped roles for standing access. Use delegated authority when someone only needs temporary badge operations.</p>
                        </aside>`,
                        )}
                      <section class="ct-admin ct-stack">
                        ${governanceGuidePanelMarkup}
                        ${membershipScopePanelMarkup}
                        ${membershipScopeTableMarkup}
                        ${delegatedGrantPanelMarkup}
                        ${delegatedGrantTableMarkup}
                      </section>`
                      : view === "accessApiKeys"
                        ? `${renderPageHeader(
                            "API Keys",
                            "Create, review, and revoke tenant API keys.",
                          )}
                        <section class="ct-admin ct-stack">
                          <section class="ct-admin__layout ct-grid ct-grid--sidebar">
                            <div class="ct-admin__grid ct-stack">
                              ${apiKeyPanelMarkup}
                            </div>
                            <div class="ct-admin__grid ct-stack">
                              ${apiKeysTableMarkup}
                            </div>
                          </section>
                        </section>`
                        : `${renderPageHeader("Org Units", "Create and review org structure.")}
                        <section class="ct-admin ct-stack">
                          <section class="ct-admin__layout ct-grid ct-grid--sidebar">
                            <div class="ct-admin__grid ct-stack">
                              ${orgUnitPanelMarkup}
                            </div>
                            <div class="ct-admin__grid ct-stack">
                              ${orgUnitsTableMarkup}
                            </div>
                          </section>
                        </section>`;

  const pageMarkup = `<div class="ct-admin-shell">
    ${renderSidebar()}
    <div class="ct-admin-main">
      ${renderTopbar()}
      <div class="ct-admin-content">
        ${viewContent}
        <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
      </div>
    </div>
  </div>`;

  return renderPageShell(
    pageTitle,
    pageMarkup,
    renderPageAssetTags(["foundationCss", "institutionAdminCss", "institutionAdminJs"]),
    "admin",
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
