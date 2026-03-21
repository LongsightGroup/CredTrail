import {
  getTenantReportingEngagementCounts,
  getTenantReportingOverview,
  getTenantReportingTrends,
  listTenantReportingComparisons,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRole,
} from "@credtrail/db";
import {
  parseTenantPathParams,
  parseTenantReportingComparisonQuery,
  parseTenantReportingOverviewQuery,
  parseTenantReportingTrendQuery,
} from "@credtrail/validation";
import type { Hono } from "hono";
import type { AppBindings, AppContext, AppEnv } from "../app";
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
  const { app, resolveDatabase, requireTenantRole, ADMIN_ROLES } = input;

  const requireReportingAccess = async (
    c: AppContext,
  ): Promise<
    | {
        tenantId: string;
      }
    | Response
  > => {
    const pathParams = parseTenantPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ADMIN_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    return {
      tenantId: pathParams.tenantId,
    };
  };

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

    const db = resolveDatabase(c.env);
    const overview = await getTenantReportingOverview(db, {
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

    const db = resolveDatabase(c.env);
    const engagementCounts = await getTenantReportingEngagementCounts(db, {
      tenantId: reportingAccess.tenantId,
      from: query.from,
      to: query.to,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
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
      },
      counts,
      rates: {
        claimRate,
        shareRate,
      },
      generatedAt: new Date().toISOString(),
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

    const db = resolveDatabase(c.env);
    const trends = await getTenantReportingTrends(db, {
      tenantId: reportingAccess.tenantId,
      from: query.from,
      to: query.to,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      bucket: query.bucket,
    });

    return c.json({
      status: "ok",
      ...trends,
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

    const db = resolveDatabase(c.env);
    const comparisonRows = await listTenantReportingComparisons(db, {
      tenantId: reportingAccess.tenantId,
      from: query.from,
      to: query.to,
      badgeTemplateId: query.badgeTemplateId,
      orgUnitId: query.orgUnitId,
      groupBy: query.groupBy,
    });

    return c.json({
      status: "ok",
      tenantId: reportingAccess.tenantId,
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
        badgeTemplateId: query.badgeTemplateId ?? null,
        orgUnitId: query.orgUnitId ?? null,
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
};
