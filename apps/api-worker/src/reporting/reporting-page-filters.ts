import type { TenantReportingLifecycleFilter } from "@credtrail/db";
import type { OrgUnitType } from "@credtrail/validation";

export interface ReportingPageFilters {
  issuedFrom?: string | undefined;
  issuedTo?: string | undefined;
  badgeTemplateId?: string | undefined;
  orgUnitId?: string | undefined;
  state?: TenantReportingLifecycleFilter | undefined;
}

export interface ReportingHierarchyPageFilters extends ReportingPageFilters {
  focusOrgUnitId?: string | undefined;
  level: OrgUnitType;
}

export const toReportingOverviewFilters = (filters: ReportingPageFilters) => {
  return {
    issuedFrom: filters.issuedFrom,
    issuedTo: filters.issuedTo,
    badgeTemplateId: filters.badgeTemplateId,
    orgUnitId: filters.orgUnitId,
    state: filters.state,
  };
};

export const toReportingEngagementFilters = (filters: ReportingPageFilters) => {
  return {
    from: filters.issuedFrom,
    to: filters.issuedTo,
    badgeTemplateId: filters.badgeTemplateId,
    orgUnitId: filters.orgUnitId,
    state: filters.state,
  };
};

export const toReportingTrendFilters = (
  filters: ReportingPageFilters,
  bucket: "day" = "day",
) => {
  return {
    ...toReportingEngagementFilters(filters),
    bucket,
  };
};

export const toReportingComparisonFilters = (
  filters: ReportingPageFilters,
  groupBy: "badgeTemplate" | "orgUnit",
) => {
  return {
    ...toReportingEngagementFilters(filters),
    groupBy,
  };
};

export const toReportingHierarchyFilters = (filters: ReportingHierarchyPageFilters) => {
  return {
    ...toReportingEngagementFilters(filters),
    focusOrgUnitId: filters.focusOrgUnitId,
    level: filters.level,
  };
};

export const buildReportingPageQueryEntries = (
  filters: ReportingPageFilters,
): ReadonlyArray<readonly [string, string | null | undefined]> => {
  return [
    ["issuedFrom", filters.issuedFrom],
    ["issuedTo", filters.issuedTo],
    ["badgeTemplateId", filters.badgeTemplateId],
    ["orgUnitId", filters.orgUnitId],
    ["state", filters.state],
  ] as const;
};

export const buildReportingHierarchyQueryEntries = (
  filters: ReportingHierarchyPageFilters,
): ReadonlyArray<readonly [string, string | null | undefined]> => {
  return [
    ...buildReportingPageQueryEntries(filters),
    ["focusOrgUnitId", filters.focusOrgUnitId],
    ["level", filters.level],
  ] as const;
};
