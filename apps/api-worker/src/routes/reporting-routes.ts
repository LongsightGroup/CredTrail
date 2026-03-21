import {
  getTenantReportingOverview,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRole,
} from "@credtrail/db";
import { parseTenantPathParams, parseTenantReportingOverviewQuery } from "@credtrail/validation";
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

  app.get("/v1/tenants/:tenantId/reporting/overview", async (c) => {
    const pathParams = parseTenantPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ADMIN_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
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
      tenantId: pathParams.tenantId,
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
};
