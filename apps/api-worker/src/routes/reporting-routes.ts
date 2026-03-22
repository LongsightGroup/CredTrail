import {
  getTenantReportingEngagementCounts,
  getTenantReportingOverview,
  getTenantReportingTrends,
  listTenantOrgUnits,
  listTenantReportingComparisons,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRole,
  type TenantOrgUnitRecord,
} from "@credtrail/db";
import {
  parseTenantPathParams,
  parseTenantReportingComparisonQuery,
  parseTenantReportingHierarchyQuery,
  parseTenantReportingOverviewQuery,
  parseTenantReportingTrendQuery,
} from "@credtrail/validation";
import type { Hono } from "hono";
import type { AppBindings, AppContext, AppEnv } from "../app";
import { ISSUER_ROLES, resolveTenantReportingAccess } from "../auth/tenant-access";
import {
  buildCsvAttachmentHeaders,
  buildCsvFilename,
  serializeCsv,
  type CsvColumn,
} from "../reporting/csv-export";
import {
  toReportingComparisonFilters,
  toReportingEngagementFilters,
  toReportingHierarchyFilters,
  toReportingTrendFilters,
  toReportingOverviewFilters,
} from "../reporting/reporting-page-filters";
import { buildReportingMetricEntries } from "../reporting/metric-definitions";

interface RegisterReportingRoutesInput {
  app: Hono<AppEnv>;
  resolveDatabase: (bindings: AppBindings) => SqlDatabase;
  requireTenantRole: (
    c: AppContext,
    tenantId: string,
    allowedRoles: readonly TenantMembershipRole[],
  ) => Promise<
    | {
        session: SessionRecord;
        membershipRole: TenantMembershipRole;
      }
    | Response
  >;
  ADMIN_ROLES: readonly TenantMembershipRole[];
}

export const registerReportingRoutes = (input: RegisterReportingRoutesInput): void => {
  const { app, resolveDatabase, requireTenantRole } = input;

  type ReportingComparisonRow = Awaited<ReturnType<typeof listTenantReportingComparisons>>[number];
  type ReportingAccess = NonNullable<Awaited<ReturnType<typeof resolveTenantReportingAccess>>>;
  type OverviewExportRow = {
    tenantId: string;
    issuedFrom: string | null;
    issuedTo: string | null;
    badgeTemplateId: string | null;
    orgUnitId: string | null;
    state: string | null;
    generatedAt: string;
    issued: number;
    active: number;
    suspended: number;
    revoked: number;
    pendingReview: number;
  };
  type EngagementExportRow = {
    tenantId: string;
    from: string | null;
    to: string | null;
    badgeTemplateId: string | null;
    orgUnitId: string | null;
    state: string | null;
    generatedAt: string;
    issuedCount: number;
    publicBadgeViewCount: number;
    verificationViewCount: number;
    shareClickCount: number;
    learnerClaimCount: number;
    walletAcceptCount: number;
    claimRate: number;
    shareRate: number;
  };
  type TrendExportRow = {
    tenantId: string;
    from: string | null;
    to: string | null;
    badgeTemplateId: string | null;
    orgUnitId: string | null;
    state: string | null;
    bucket: string;
    bucketStart: string;
    issuedCount: number;
    publicBadgeViewCount: number;
    verificationViewCount: number;
    shareClickCount: number;
    learnerClaimCount: number;
    walletAcceptCount: number;
  };
  type ComparisonExportRow = {
    tenantId: string;
    from: string | null;
    to: string | null;
    badgeTemplateId: string | null;
    orgUnitId: string | null;
    state: string | null;
    groupBy: string;
    groupId: string;
    issuedCount: number;
    publicBadgeViewCount: number;
    verificationViewCount: number;
    shareClickCount: number;
    learnerClaimCount: number;
    walletAcceptCount: number;
    claimRate: number;
    shareRate: number;
  };
  type HierarchyExportRow = {
    tenantId: string;
    from: string | null;
    to: string | null;
    badgeTemplateId: string | null;
    orgUnitIdFilter: string | null;
    state: string | null;
    focusOrgUnitId: string | null;
    level: string;
    orgUnitId: string;
    displayName: string;
    parentOrgUnitId: string | null;
    issuedCount: number;
    publicBadgeViewCount: number;
    verificationViewCount: number;
    shareClickCount: number;
    learnerClaimCount: number;
    walletAcceptCount: number;
    claimRate: number;
    shareRate: number;
  };

  const ORG_UNIT_HIERARCHY_DEPTH = {
    institution: 0,
    college: 1,
    department: 2,
    program: 3,
  } as const;

  const buildOrgUnitMap = (
    orgUnits: readonly TenantOrgUnitRecord[],
  ): ReadonlyMap<string, TenantOrgUnitRecord> => {
    return new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit] as const));
  };

  const isOrgUnitWithinRoot = (
    orgUnitsById: ReadonlyMap<string, TenantOrgUnitRecord>,
    orgUnitId: string,
    rootOrgUnitId: string,
  ): boolean => {
    const visited = new Set<string>();
    let currentOrgUnitId: string | null = orgUnitId;

    while (currentOrgUnitId !== null) {
      if (currentOrgUnitId === rootOrgUnitId) {
        return true;
      }

      if (visited.has(currentOrgUnitId)) {
        return false;
      }

      visited.add(currentOrgUnitId);
      currentOrgUnitId = orgUnitsById.get(currentOrgUnitId)?.parentOrgUnitId ?? null;
    }

    return false;
  };

  const isOrgUnitWithinRoots = (
    orgUnitsById: ReadonlyMap<string, TenantOrgUnitRecord>,
    orgUnitId: string,
    rootOrgUnitIds: readonly string[],
  ): boolean => {
    return rootOrgUnitIds.some((rootOrgUnitId) =>
      isOrgUnitWithinRoot(orgUnitsById, orgUnitId, rootOrgUnitId),
    );
  };

  const listOrgUnitLineage = (
    orgUnitsById: ReadonlyMap<string, TenantOrgUnitRecord>,
    orgUnitId: string,
  ): TenantOrgUnitRecord[] => {
    const lineage: TenantOrgUnitRecord[] = [];
    const visited = new Set<string>();
    let currentOrgUnitId: string | null = orgUnitId;

    while (currentOrgUnitId !== null) {
      if (visited.has(currentOrgUnitId)) {
        throw new Error(`Detected an org-unit cycle while resolving hierarchy for ${orgUnitId}`);
      }

      visited.add(currentOrgUnitId);
      const orgUnit = orgUnitsById.get(currentOrgUnitId);

      if (orgUnit === undefined) {
        throw new Error(`Org unit ${orgUnitId} is missing from the reporting hierarchy`);
      }

      lineage.push(orgUnit);
      currentOrgUnitId = orgUnit.parentOrgUnitId;
    }

    return lineage;
  };

  const filterComparisonRowsToScope = (
    comparisonRows: readonly ReportingComparisonRow[],
    orgUnitsById: ReadonlyMap<string, TenantOrgUnitRecord>,
    scopedRootOrgUnitIds: readonly string[],
  ): ReportingComparisonRow[] => {
    return comparisonRows.filter((row) =>
      isOrgUnitWithinRoots(orgUnitsById, row.groupId, scopedRootOrgUnitIds),
    );
  };

  const aggregateHierarchyRows = (input: {
    comparisonRows: readonly ReportingComparisonRow[];
    orgUnitsById: ReadonlyMap<string, TenantOrgUnitRecord>;
    focusOrgUnitId?: string | undefined;
    level: TenantOrgUnitRecord["unitType"];
    scopedRootOrgUnitIds: readonly string[];
  }) => {
    const focusOrgUnit =
      input.focusOrgUnitId === undefined
        ? null
        : input.orgUnitsById.get(input.focusOrgUnitId) ?? null;

    if (input.focusOrgUnitId !== undefined && focusOrgUnit === null) {
      throw new Error(`Org unit ${input.focusOrgUnitId} is missing from the reporting hierarchy`);
    }

    if (
      focusOrgUnit !== null &&
      ORG_UNIT_HIERARCHY_DEPTH[focusOrgUnit.unitType] > ORG_UNIT_HIERARCHY_DEPTH[input.level]
    ) {
      throw new Error("focusOrgUnitId must be at or above the requested hierarchy level");
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
      const lineage = listOrgUnitLineage(input.orgUnitsById, row.groupId);

      if (focusOrgUnit !== null && !lineage.some((orgUnit) => orgUnit.id === focusOrgUnit.id)) {
        continue;
      }

      if (
        input.scopedRootOrgUnitIds.length > 0 &&
        !input.scopedRootOrgUnitIds.some((rootOrgUnitId) =>
          lineage.some((orgUnit) => orgUnit.id === rootOrgUnitId),
        )
      ) {
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
          level: input.level,
          orgUnitId: group.orgUnit.id,
          displayName: group.orgUnit.displayName,
          parentOrgUnitId: group.orgUnit.parentOrgUnitId,
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

  const requireReportingAccess = async (
    c: AppContext,
  ): Promise<
    | {
        tenantId: string;
        db: SqlDatabase;
        reportingAccess: ReportingAccess;
      }
    | Response
  > => {
    const pathParams = parseTenantPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const db = resolveDatabase(c.env);
    const reportingAccess = await resolveTenantReportingAccess({
      db,
      tenantId: pathParams.tenantId,
      userId: roleCheck.session.userId,
      membershipRole: roleCheck.membershipRole,
    });

    if (reportingAccess === null) {
      return c.json(
        {
          error: "Insufficient role for reporting",
        },
        403,
      );
    }

    return {
      tenantId: pathParams.tenantId,
      db,
      reportingAccess,
    };
  };

  const buildCsvResponse = <T extends Record<string, string | number | boolean | null | undefined>>(
    input: {
      baseName: string;
      generatedAt: string;
      rows: readonly T[];
      columns: readonly CsvColumn<T>[];
    },
  ): Response => {
    const filename = buildCsvFilename(input.baseName, input.generatedAt);
    const csv = serializeCsv({
      rows: input.rows,
      columns: input.columns,
    });

    return new Response(csv, {
      status: 200,
      headers: buildCsvAttachmentHeaders(filename),
    });
  };

  const OVERVIEW_EXPORT_COLUMNS: readonly CsvColumn<OverviewExportRow>[] = [
    { key: "tenantId", header: "Tenant ID" },
    { key: "issuedFrom", header: "Issued From" },
    { key: "issuedTo", header: "Issued To" },
    { key: "badgeTemplateId", header: "Badge Template ID" },
    { key: "orgUnitId", header: "Org Unit ID" },
    { key: "state", header: "Lifecycle State" },
    { key: "generatedAt", header: "Generated At" },
    { key: "issued", header: "Issued" },
    { key: "active", header: "Active" },
    { key: "suspended", header: "Suspended" },
    { key: "revoked", header: "Revoked" },
    { key: "pendingReview", header: "Pending Review" },
  ] as const;

  const ENGAGEMENT_EXPORT_COLUMNS: readonly CsvColumn<EngagementExportRow>[] = [
    { key: "tenantId", header: "Tenant ID" },
    { key: "from", header: "Issued From" },
    { key: "to", header: "Issued To" },
    { key: "badgeTemplateId", header: "Badge Template ID" },
    { key: "orgUnitId", header: "Org Unit ID" },
    { key: "state", header: "Lifecycle State" },
    { key: "generatedAt", header: "Generated At" },
    { key: "issuedCount", header: "Issued Count" },
    { key: "publicBadgeViewCount", header: "Public Badge View Count" },
    { key: "verificationViewCount", header: "Verification View Count" },
    { key: "shareClickCount", header: "Share Click Count" },
    { key: "learnerClaimCount", header: "Learner Claim Count" },
    { key: "walletAcceptCount", header: "Wallet Accept Count" },
    { key: "claimRate", header: "Claim Rate" },
    { key: "shareRate", header: "Share Rate" },
  ] as const;

  const TREND_EXPORT_COLUMNS: readonly CsvColumn<TrendExportRow>[] = [
    { key: "tenantId", header: "Tenant ID" },
    { key: "from", header: "Issued From" },
    { key: "to", header: "Issued To" },
    { key: "badgeTemplateId", header: "Badge Template ID" },
    { key: "orgUnitId", header: "Org Unit ID" },
    { key: "state", header: "Lifecycle State" },
    { key: "bucket", header: "Bucket" },
    { key: "bucketStart", header: "Bucket Start" },
    { key: "issuedCount", header: "Issued Count" },
    { key: "publicBadgeViewCount", header: "Public Badge View Count" },
    { key: "verificationViewCount", header: "Verification View Count" },
    { key: "shareClickCount", header: "Share Click Count" },
    { key: "learnerClaimCount", header: "Learner Claim Count" },
    { key: "walletAcceptCount", header: "Wallet Accept Count" },
  ] as const;

  const COMPARISON_EXPORT_COLUMNS: readonly CsvColumn<ComparisonExportRow>[] = [
    { key: "tenantId", header: "Tenant ID" },
    { key: "from", header: "Issued From" },
    { key: "to", header: "Issued To" },
    { key: "badgeTemplateId", header: "Badge Template ID" },
    { key: "orgUnitId", header: "Org Unit ID" },
    { key: "state", header: "Lifecycle State" },
    { key: "groupBy", header: "Group By" },
    { key: "groupId", header: "Group ID" },
    { key: "issuedCount", header: "Issued Count" },
    { key: "publicBadgeViewCount", header: "Public Badge View Count" },
    { key: "verificationViewCount", header: "Verification View Count" },
    { key: "shareClickCount", header: "Share Click Count" },
    { key: "learnerClaimCount", header: "Learner Claim Count" },
    { key: "walletAcceptCount", header: "Wallet Accept Count" },
    { key: "claimRate", header: "Claim Rate" },
    { key: "shareRate", header: "Share Rate" },
  ] as const;

  const HIERARCHY_EXPORT_COLUMNS: readonly CsvColumn<HierarchyExportRow>[] = [
    { key: "tenantId", header: "Tenant ID" },
    { key: "from", header: "Issued From" },
    { key: "to", header: "Issued To" },
    { key: "badgeTemplateId", header: "Badge Template ID" },
    { key: "orgUnitIdFilter", header: "Org Unit Filter" },
    { key: "state", header: "Lifecycle State" },
    { key: "focusOrgUnitId", header: "Focus Org Unit ID" },
    { key: "level", header: "Level" },
    { key: "orgUnitId", header: "Org Unit ID" },
    { key: "displayName", header: "Display Name" },
    { key: "parentOrgUnitId", header: "Parent Org Unit ID" },
    { key: "issuedCount", header: "Issued Count" },
    { key: "publicBadgeViewCount", header: "Public Badge View Count" },
    { key: "verificationViewCount", header: "Verification View Count" },
    { key: "shareClickCount", header: "Share Click Count" },
    { key: "learnerClaimCount", header: "Learner Claim Count" },
    { key: "walletAcceptCount", header: "Wallet Accept Count" },
    { key: "claimRate", header: "Claim Rate" },
    { key: "shareRate", header: "Share Rate" },
  ] as const;

  app.get("/v1/tenants/:tenantId/reporting/overview", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let query;

    try {
      query = parseTenantReportingOverviewQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting overview query",
        },
        400,
      );
    }

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      if (query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped reporting overview requests require orgUnitId",
          },
          400,
        );
      }

      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      const orgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        !isOrgUnitWithinRoots(
          orgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }
    }

    const overview = await getTenantReportingOverview(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      issuedFrom: query.issuedFrom,
      issuedTo: query.issuedTo,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      state: query.state,
    });

    return c.json({
      status: "ok",
      tenantId: overview.tenantId,
      filters: overview.filters,
      counts: overview.counts,
      metrics: buildReportingMetricEntries(overview.counts),
      generatedAt: overview.generatedAt,
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/overview/export.csv", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let query;

    try {
      query = parseTenantReportingOverviewQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting overview query",
        },
        400,
      );
    }

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      if (query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped reporting overview requests require orgUnitId",
          },
          400,
        );
      }

      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      const orgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        !isOrgUnitWithinRoots(
          orgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }
    }

    const overview = await getTenantReportingOverview(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      issuedFrom: query.issuedFrom,
      issuedTo: query.issuedTo,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      state: query.state,
    });

    return buildCsvResponse({
      baseName: "Reporting Overview Export",
      generatedAt: overview.generatedAt,
      rows: [
        {
          tenantId: overview.tenantId,
          issuedFrom: overview.filters.issuedFrom,
          issuedTo: overview.filters.issuedTo,
          badgeTemplateId: overview.filters.badgeTemplateId,
          orgUnitId: overview.filters.orgUnitId,
          state: overview.filters.state,
          generatedAt: overview.generatedAt,
          issued: overview.counts.issued,
          active: overview.counts.active,
          suspended: overview.counts.suspended,
          revoked: overview.counts.revoked,
          pendingReview: overview.counts.pendingReview,
        },
      ],
      columns: OVERVIEW_EXPORT_COLUMNS,
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/engagement", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let query;

    try {
      query = parseTenantReportingTrendQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid engagement reporting query",
        },
        400,
      );
    }

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      if (query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped engagement reporting requests require orgUnitId",
          },
          400,
        );
      }

      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      const orgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        !isOrgUnitWithinRoots(
          orgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }
    }

    const engagementCounts = await getTenantReportingEngagementCounts(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      from: query.from,
      to: query.to,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      state: query.state,
    });
    const { claimRate, shareRate, ...counts } = engagementCounts;

    return c.json({
      status: "ok",
      tenantId: reportingAccess.tenantId,
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
        badgeTemplateId: query.badgeTemplateId ?? null,
        orgUnitId: query.orgUnitId ?? null,
        state: query.state ?? null,
      },
      counts,
      rates: {
        claimRate,
        shareRate,
      },
      generatedAt: new Date().toISOString(),
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/engagement/export.csv", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let pageRangeQuery;

    try {
      pageRangeQuery = parseTenantReportingOverviewQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid engagement reporting query",
        },
        400,
      );
    }

    const query = toReportingEngagementFilters(pageRangeQuery);

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      if (query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped engagement reporting requests require orgUnitId",
          },
          400,
        );
      }

      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      const orgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        !isOrgUnitWithinRoots(
          orgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }
    }

    const engagementCounts = await getTenantReportingEngagementCounts(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      ...query,
    });
    const generatedAt = new Date().toISOString();

    return buildCsvResponse({
      baseName: "Reporting Engagement Export",
      generatedAt,
      rows: [
        {
          tenantId: reportingAccess.tenantId,
          from: query.from ?? null,
          to: query.to ?? null,
          badgeTemplateId: query.badgeTemplateId ?? null,
          orgUnitId: query.orgUnitId ?? null,
          state: query.state ?? null,
          generatedAt,
          issuedCount: engagementCounts.issuedCount,
          publicBadgeViewCount: engagementCounts.publicBadgeViewCount,
          verificationViewCount: engagementCounts.verificationViewCount,
          shareClickCount: engagementCounts.shareClickCount,
          learnerClaimCount: engagementCounts.learnerClaimCount,
          walletAcceptCount: engagementCounts.walletAcceptCount,
          claimRate: engagementCounts.claimRate,
          shareRate: engagementCounts.shareRate,
        },
      ],
      columns: ENGAGEMENT_EXPORT_COLUMNS,
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/trends", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let query;

    try {
      query = parseTenantReportingTrendQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting trend query",
        },
        400,
      );
    }

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      if (query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped reporting trend requests require orgUnitId",
          },
          400,
        );
      }

      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      const orgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        !isOrgUnitWithinRoots(
          orgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }
    }

    const trends = await getTenantReportingTrends(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      ...query,
    });

    return c.json({
      status: "ok",
      ...trends,
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/trends/export.csv", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let pageRangeQuery;

    try {
      pageRangeQuery = parseTenantReportingOverviewQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting trend query",
        },
        400,
      );
    }

    let query;

    try {
      query = parseTenantReportingTrendQuery({
        ...toReportingTrendFilters(pageRangeQuery),
        bucket: c.req.query("bucket"),
      });
    } catch {
      return c.json(
        {
          error: "Invalid reporting trend query",
        },
        400,
      );
    }

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      if (query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped reporting trend requests require orgUnitId",
          },
          400,
        );
      }

      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      const orgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        !isOrgUnitWithinRoots(
          orgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }
    }

    const trends = await getTenantReportingTrends(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      from: query.from,
      to: query.to,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      bucket: query.bucket,
    });

    return buildCsvResponse({
      baseName: "Reporting Trends Export",
      generatedAt: trends.generatedAt,
      rows: trends.series.map((row) => {
        return {
          tenantId: trends.tenantId,
          from: trends.filters.from,
          to: trends.filters.to,
          badgeTemplateId: trends.filters.badgeTemplateId,
          orgUnitId: trends.filters.orgUnitId,
          state: trends.filters.state,
          bucket: trends.bucket,
          bucketStart: row.bucketStart,
          issuedCount: row.issuedCount,
          publicBadgeViewCount: row.publicBadgeViewCount,
          verificationViewCount: row.verificationViewCount,
          shareClickCount: row.shareClickCount,
          learnerClaimCount: row.learnerClaimCount,
          walletAcceptCount: row.walletAcceptCount,
        };
      }),
      columns: TREND_EXPORT_COLUMNS,
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/comparisons", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let query;

    try {
      query = parseTenantReportingComparisonQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting comparison query",
        },
        400,
      );
    }

    let scopedOrgUnitsById: ReadonlyMap<string, TenantOrgUnitRecord> | null = null;

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      scopedOrgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        query.orgUnitId !== undefined &&
        !isOrgUnitWithinRoots(
          scopedOrgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }

      if (query.groupBy === "badgeTemplate" && query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped badge-template comparison requests require orgUnitId",
          },
          400,
        );
      }
    }

    let comparisonRows = await listTenantReportingComparisons(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      ...query,
    });

    if (
      reportingAccess.reportingAccess.visibility === "scoped" &&
      query.groupBy === "orgUnit" &&
      scopedOrgUnitsById !== null
    ) {
      comparisonRows = filterComparisonRowsToScope(
        comparisonRows,
        scopedOrgUnitsById,
        reportingAccess.reportingAccess.scopedOrgUnitIds,
      );
    }

    return c.json({
      status: "ok",
      tenantId: reportingAccess.tenantId,
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
        badgeTemplateId: query.badgeTemplateId ?? null,
        orgUnitId: query.orgUnitId ?? null,
        state: query.state ?? null,
        groupBy: query.groupBy,
      },
      rows: comparisonRows.map((row) => {
        const { groupBy, groupId, claimRate, shareRate, ...counts } = row;

        return {
          groupBy,
          groupId,
          counts,
          rates: {
            claimRate,
            shareRate,
          },
        };
      }),
      generatedAt: new Date().toISOString(),
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/comparisons/export.csv", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let pageRangeQuery;

    try {
      pageRangeQuery = parseTenantReportingOverviewQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting comparison query",
        },
        400,
      );
    }

    let query;

    try {
      query = parseTenantReportingComparisonQuery({
        ...toReportingComparisonFilters(pageRangeQuery, "badgeTemplate"),
        groupBy: c.req.query("groupBy"),
      });
    } catch {
      return c.json(
        {
          error: "Invalid reporting comparison query",
        },
        400,
      );
    }

    let scopedOrgUnitsById: ReadonlyMap<string, TenantOrgUnitRecord> | null = null;

    if (reportingAccess.reportingAccess.visibility === "scoped") {
      const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
        tenantId: reportingAccess.tenantId,
        includeInactive: true,
      });
      scopedOrgUnitsById = buildOrgUnitMap(orgUnits);

      if (
        query.orgUnitId !== undefined &&
        !isOrgUnitWithinRoots(
          scopedOrgUnitsById,
          query.orgUnitId,
          reportingAccess.reportingAccess.scopedOrgUnitIds,
        )
      ) {
        return c.json(
          {
            error: "Requested org unit is outside reporting scope",
          },
          403,
        );
      }

      if (query.groupBy === "badgeTemplate" && query.orgUnitId === undefined) {
        return c.json(
          {
            error: "Scoped badge-template comparison requests require orgUnitId",
          },
          400,
        );
      }
    }

    let comparisonRows = await listTenantReportingComparisons(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      ...query,
    });

    if (
      reportingAccess.reportingAccess.visibility === "scoped" &&
      query.groupBy === "orgUnit" &&
      scopedOrgUnitsById !== null
    ) {
      comparisonRows = filterComparisonRowsToScope(
        comparisonRows,
        scopedOrgUnitsById,
        reportingAccess.reportingAccess.scopedOrgUnitIds,
      );
    }

    return buildCsvResponse({
      baseName: "Reporting Comparisons Export",
      generatedAt: new Date().toISOString(),
      rows: comparisonRows.map((row) => {
        return {
          tenantId: reportingAccess.tenantId,
          from: query.from ?? null,
          to: query.to ?? null,
          badgeTemplateId: query.badgeTemplateId ?? null,
          orgUnitId: query.orgUnitId ?? null,
          state: query.state ?? null,
          groupBy: row.groupBy,
          groupId: row.groupId,
          issuedCount: row.issuedCount,
          publicBadgeViewCount: row.publicBadgeViewCount,
          verificationViewCount: row.verificationViewCount,
          shareClickCount: row.shareClickCount,
          learnerClaimCount: row.learnerClaimCount,
          walletAcceptCount: row.walletAcceptCount,
          claimRate: row.claimRate,
          shareRate: row.shareRate,
        };
      }),
      columns: COMPARISON_EXPORT_COLUMNS,
    });
  });

  app.get("/v1/tenants/:tenantId/reporting/hierarchy", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let query;

    try {
      query = parseTenantReportingHierarchyQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting hierarchy query",
        },
        400,
      );
    }

    const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      includeInactive: true,
    });
    const orgUnitsById = buildOrgUnitMap(orgUnits);

    if (
      reportingAccess.reportingAccess.visibility === "scoped" &&
      query.orgUnitId !== undefined &&
      !isOrgUnitWithinRoots(
        orgUnitsById,
        query.orgUnitId,
        reportingAccess.reportingAccess.scopedOrgUnitIds,
      )
    ) {
      return c.json(
        {
          error: "Requested org unit is outside reporting scope",
        },
        403,
      );
    }

    if (
      reportingAccess.reportingAccess.visibility === "scoped" &&
      query.focusOrgUnitId !== undefined &&
      !isOrgUnitWithinRoots(
        orgUnitsById,
        query.focusOrgUnitId,
        reportingAccess.reportingAccess.scopedOrgUnitIds,
      )
    ) {
      return c.json(
        {
          error: "Requested org unit is outside reporting scope",
        },
        403,
      );
    }

    const comparisonRows = await listTenantReportingComparisons(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      from: query.from,
      to: query.to,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      state: query.state,
      groupBy: "orgUnit",
    });

    try {
      const rows = aggregateHierarchyRows({
        comparisonRows,
        orgUnitsById,
        focusOrgUnitId: query.focusOrgUnitId,
        level: query.level,
        scopedRootOrgUnitIds:
          reportingAccess.reportingAccess.visibility === "scoped"
            ? reportingAccess.reportingAccess.scopedOrgUnitIds
            : [],
      });

      return c.json({
        status: "ok",
        tenantId: reportingAccess.tenantId,
        filters: {
          from: query.from ?? null,
          to: query.to ?? null,
          badgeTemplateId: query.badgeTemplateId ?? null,
          orgUnitId: query.orgUnitId ?? null,
          state: query.state ?? null,
          focusOrgUnitId: query.focusOrgUnitId ?? null,
          level: query.level,
        },
        rows,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid reporting hierarchy query",
        },
        400,
      );
    }
  });

  app.get("/v1/tenants/:tenantId/reporting/hierarchy/export.csv", async (c) => {
    const reportingAccess = await requireReportingAccess(c);

    if (reportingAccess instanceof Response) {
      return reportingAccess;
    }

    let pageRangeQuery;

    try {
      pageRangeQuery = parseTenantReportingOverviewQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid reporting hierarchy query",
        },
        400,
      );
    }

    let query;

    try {
      query = parseTenantReportingHierarchyQuery({
        ...toReportingHierarchyFilters({
          ...pageRangeQuery,
          level: c.req.query("level") as never,
          focusOrgUnitId: c.req.query("focusOrgUnitId"),
        }),
        focusOrgUnitId: c.req.query("focusOrgUnitId"),
        level: c.req.query("level"),
      });
    } catch {
      return c.json(
        {
          error: "Invalid reporting hierarchy query",
        },
        400,
      );
    }

    const orgUnits = await listTenantOrgUnits(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      includeInactive: true,
    });
    const orgUnitsById = buildOrgUnitMap(orgUnits);

    if (
      reportingAccess.reportingAccess.visibility === "scoped" &&
      query.orgUnitId !== undefined &&
      !isOrgUnitWithinRoots(
        orgUnitsById,
        query.orgUnitId,
        reportingAccess.reportingAccess.scopedOrgUnitIds,
      )
    ) {
      return c.json(
        {
          error: "Requested org unit is outside reporting scope",
        },
        403,
      );
    }

    if (
      reportingAccess.reportingAccess.visibility === "scoped" &&
      query.focusOrgUnitId !== undefined &&
      !isOrgUnitWithinRoots(
        orgUnitsById,
        query.focusOrgUnitId,
        reportingAccess.reportingAccess.scopedOrgUnitIds,
      )
    ) {
      return c.json(
        {
          error: "Requested org unit is outside reporting scope",
        },
        403,
      );
    }

    const comparisonRows = await listTenantReportingComparisons(reportingAccess.db, {
      tenantId: reportingAccess.tenantId,
      from: query.from,
      to: query.to,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      state: query.state,
      groupBy: "orgUnit",
    });

    try {
      const rows = aggregateHierarchyRows({
        comparisonRows,
        orgUnitsById,
        focusOrgUnitId: query.focusOrgUnitId,
        level: query.level,
        scopedRootOrgUnitIds:
          reportingAccess.reportingAccess.visibility === "scoped"
            ? reportingAccess.reportingAccess.scopedOrgUnitIds
            : [],
      });

      return buildCsvResponse({
        baseName: "Reporting Hierarchy Export",
        generatedAt: new Date().toISOString(),
        rows: rows.map((row) => {
          return {
            tenantId: reportingAccess.tenantId,
            from: query.from ?? null,
            to: query.to ?? null,
            badgeTemplateId: query.badgeTemplateId ?? null,
            orgUnitIdFilter: query.orgUnitId ?? null,
            state: query.state ?? null,
            focusOrgUnitId: query.focusOrgUnitId ?? null,
            level: query.level,
            orgUnitId: row.orgUnitId,
            displayName: row.displayName,
            parentOrgUnitId: row.parentOrgUnitId,
            issuedCount: row.issuedCount,
            publicBadgeViewCount: row.publicBadgeViewCount,
            verificationViewCount: row.verificationViewCount,
            shareClickCount: row.shareClickCount,
            learnerClaimCount: row.learnerClaimCount,
            walletAcceptCount: row.walletAcceptCount,
            claimRate: row.claimRate,
            shareRate: row.shareRate,
          };
        }),
        columns: HIERARCHY_EXPORT_COLUMNS,
      });
    } catch (error: unknown) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid reporting hierarchy query",
        },
        400,
      );
    }
  });
};
