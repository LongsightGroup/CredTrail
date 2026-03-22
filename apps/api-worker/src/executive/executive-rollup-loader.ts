import {
  getTenantExecutiveRollup,
  getTenantReportingOverview,
  getTenantReportingTrends,
  listTenantOrgUnits,
  type GetTenantExecutiveRollupResult,
  type SqlDatabase,
  type TenantMembershipRole,
  type TenantOrgUnitRecord,
  type TenantReportingOverviewRecord,
  type TenantReportingTrendRecord,
} from "@credtrail/db";
import type { TenantExecutiveDashboardQuery } from "@credtrail/validation";

import {
  resolveTenantExecutiveAccess,
  type TenantExecutiveAccessResult,
} from "../auth/tenant-access";
import {
  toReportingOverviewFilters,
  toReportingTrendFilters,
} from "../reporting/reporting-page-filters";
import {
  buildExecutiveKpiCatalog,
  type ExecutiveKpiCatalog,
} from "./executive-kpi-catalog";
import {
  inferExecutiveDashboardDefaults,
  type ExecutiveDashboardDefaults,
} from "./executive-dashboard-contract";

export interface TenantExecutiveDashboardRecord {
  tenantId: string;
  access: TenantExecutiveAccessResult;
  defaults: ExecutiveDashboardDefaults;
  orgUnits: readonly TenantOrgUnitRecord[];
  overview: TenantReportingOverviewRecord;
  trends: TenantReportingTrendRecord;
  kpiCatalog: ExecutiveKpiCatalog;
  rollup: GetTenantExecutiveRollupResult;
}

export interface LoadTenantExecutiveDashboardInput {
  db: SqlDatabase;
  tenantId: string;
  userId: string;
  membershipRole: TenantMembershipRole;
  query: TenantExecutiveDashboardQuery;
  today?: string | undefined;
}

const todayDateKey = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const loadTenantExecutiveDashboard = async (
  input: LoadTenantExecutiveDashboardInput,
): Promise<TenantExecutiveDashboardRecord | null> => {
  const access = await resolveTenantExecutiveAccess({
    db: input.db,
    tenantId: input.tenantId,
    userId: input.userId,
    membershipRole: input.membershipRole,
  });

  if (access === null) {
    return null;
  }

  const orgUnits = await listTenantOrgUnits(input.db, {
    tenantId: input.tenantId,
    includeInactive: true,
  });

  const defaults = inferExecutiveDashboardDefaults({
    today: input.today ?? todayDateKey(),
    query: input.query,
    visibility: access.visibility,
    scopedOrgUnitIds: access.scopedOrgUnitIds,
    orgUnits,
  });
  const kpiCatalog = buildExecutiveKpiCatalog({
    defaults,
  });
  const overviewFilters = toReportingOverviewFilters(defaults.reportingFilters);
  const trendFilters = toReportingTrendFilters(defaults.reportingFilters);

  const [overview, trends, rollup] = await Promise.all([
    getTenantReportingOverview(input.db, {
      tenantId: input.tenantId,
      ...overviewFilters,
    }),
    getTenantReportingTrends(input.db, {
      tenantId: input.tenantId,
      ...trendFilters,
    }),
    getTenantExecutiveRollup(input.db, {
      tenantId: input.tenantId,
      from: defaults.reportingFilters.issuedFrom,
      to: defaults.reportingFilters.issuedTo,
      badgeTemplateId: defaults.reportingFilters.badgeTemplateId,
      orgUnitId: defaults.reportingFilters.orgUnitId,
      state: defaults.reportingFilters.state,
      focusOrgUnitId: defaults.focusOrgUnitId,
      comparisonLevel: defaults.comparisonLevel,
      scopedRootOrgUnitIds:
        access.visibility === "scoped" ? access.scopedOrgUnitIds : undefined,
    }),
  ]);

  return {
    tenantId: input.tenantId,
    access,
    defaults,
    orgUnits,
    overview,
    trends,
    kpiCatalog,
    rollup,
  };
};
