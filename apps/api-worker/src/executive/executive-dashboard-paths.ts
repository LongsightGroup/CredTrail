import type { TenantExecutiveDashboardQuery } from "@credtrail/validation";

export const buildExecutiveDashboardQueryEntries = (
  query: Partial<TenantExecutiveDashboardQuery>,
): ReadonlyArray<readonly [string, string | null | undefined]> => {
  return [
    ["window", query.window] as const,
    ["audience", query.audience] as const,
    ["issuedFrom", query.issuedFrom] as const,
    ["issuedTo", query.issuedTo] as const,
    ["badgeTemplateId", query.badgeTemplateId] as const,
    ["orgUnitId", query.orgUnitId] as const,
    ["state", query.state] as const,
    ["focusOrgUnitId", query.focusOrgUnitId] as const,
    ["comparisonLevel", query.comparisonLevel] as const,
  ].filter((entry) => {
    const value = entry[1];
    return value !== undefined && value !== null && value !== "";
  });
};

const buildExecutiveDashboardBasePath = (tenantId: string): string => {
  return `/tenants/${encodeURIComponent(tenantId)}/executive`;
};

const withQueryEntries = (
  path: string,
  entries: ReadonlyArray<readonly [string, string | null | undefined]>,
): string => {
  const url = new URL(path, "https://credtrail.local");

  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, value);
  }

  const query = url.searchParams.toString();
  return query.length === 0 ? url.pathname : `${url.pathname}?${query}`;
};

export const buildExecutiveDashboardPath = (
  tenantId: string,
  query: Partial<TenantExecutiveDashboardQuery> = {},
): string => {
  return withQueryEntries(
    buildExecutiveDashboardBasePath(tenantId),
    buildExecutiveDashboardQueryEntries(query),
  );
};

export const buildExecutiveDrilldownPath = (
  tenantId: string,
  query: Partial<TenantExecutiveDashboardQuery>,
): string => {
  return buildExecutiveDashboardPath(tenantId, query);
};
