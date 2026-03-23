import type { SessionRecord, SqlDatabase, TenantMembershipRole } from "@credtrail/db";
import { parseTenantExecutiveDashboardQuery, parseTenantPathParams } from "@credtrail/validation";
import type { Hono } from "hono";

import type { AppBindings, AppContext, AppEnv } from "../app";
import {
  renderExecutiveDashboardPage,
  renderExecutiveUnavailablePage,
  renderInvalidExecutiveDashboardRequestPage,
} from "../executive/executive-dashboard-page";
import {
  loadTenantExecutiveDashboard,
} from "../executive/executive-rollup-loader";

interface RegisterExecutiveRoutesInput {
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
  TENANT_MEMBER_ROLES: readonly TenantMembershipRole[];
}

export const registerExecutiveRoutes = (input: RegisterExecutiveRoutesInput): void => {
  const { app, resolveDatabase, requireTenantRole, TENANT_MEMBER_ROLES } = input;

  const loadExecutiveDashboardFromRequest = async (
    c: AppContext,
  ): Promise<
    | {
        tenantId: string;
        membershipRole: TenantMembershipRole;
        dashboard: TenantExecutiveDashboardRecord | null;
      }
    | Response
  > => {
    const { tenantId } = parseTenantPathParams(c.req.param());
    const tenantAccess = await requireTenantRole(c, tenantId, TENANT_MEMBER_ROLES);

    if (tenantAccess instanceof Response) {
      return tenantAccess;
    }

    let query;

    try {
      query = parseTenantExecutiveDashboardQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid executive dashboard query",
        },
        400,
      );
    }

    const dashboard = await loadTenantExecutiveDashboard({
      db: resolveDatabase(c.env),
      tenantId,
      userId: tenantAccess.session.userId,
      membershipRole: tenantAccess.membershipRole,
      query,
    });

    return {
      tenantId,
      membershipRole: tenantAccess.membershipRole,
      dashboard,
    };
  };

  app.get("/v1/tenants/:tenantId/executive", async (c) => {
    const result = await loadExecutiveDashboardFromRequest(c);

    if (result instanceof Response) {
      return result;
    }

    if (result.dashboard === null) {
      return c.json(
        {
          error: "Executive dashboard access is unavailable for this tenant scope",
        },
        403,
      );
    }

    return c.json({
      status: "ok",
      dashboard: result.dashboard,
    });
  });

  app.get("/tenants/:tenantId/executive", async (c) => {
    const result = await loadExecutiveDashboardFromRequest(c);

    if (result instanceof Response) {
      if (result.status !== 400) {
        return result;
      }

      return c.html(renderInvalidExecutiveDashboardRequestPage(), 400);
    }

    if (result.dashboard === null) {
      return c.html(renderExecutiveUnavailablePage(), 403);
    }

    return c.html(renderExecutiveDashboardPage(result.dashboard));
  });
};
