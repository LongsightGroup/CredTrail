import type { SessionRecord, TenantMembershipRole } from '@credtrail/db';
import type { Hono } from 'hono';
import {
  parseOb2ImportConversionRequest,
  parseTenantPathParams,
} from '@credtrail/validation';
import type { AppContext, AppEnv } from '../app';
import {
  Ob2ImportError,
  prepareOb2ImportConversion,
} from '../migrations/ob2-import';

interface RegisterMigrationRoutesInput {
  app: Hono<AppEnv>;
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
  ISSUER_ROLES: readonly TenantMembershipRole[];
}

export const registerMigrationRoutes = (input: RegisterMigrationRoutesInput): void => {
  const { app, requireTenantRole, ISSUER_ROLES } = input;

  app.post('/v1/tenants/:tenantId/migrations/ob2/convert', async (c) => {
    const pathParams = parseTenantPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    let request;

    try {
      request = parseOb2ImportConversionRequest(await c.req.json<unknown>());
    } catch {
      return c.json(
        {
          error: 'Invalid OB2 import conversion request payload',
        },
        400,
      );
    }

    try {
      const result = await prepareOb2ImportConversion({
        ...(request.ob2Assertion === undefined ? {} : { ob2Assertion: request.ob2Assertion }),
        ...(request.ob2BadgeClass === undefined ? {} : { ob2BadgeClass: request.ob2BadgeClass }),
        ...(request.ob2Issuer === undefined ? {} : { ob2Issuer: request.ob2Issuer }),
        ...(request.bakedBadgeImage === undefined
          ? {}
          : { bakedBadgeImage: request.bakedBadgeImage }),
      });
      return c.json(
        {
          tenantId: pathParams.tenantId,
          ...result,
        },
        200,
      );
    } catch (error: unknown) {
      if (error instanceof Ob2ImportError) {
        return c.json(
          {
            error: error.message,
          },
          422,
        );
      }

      throw error;
    }
  });
};
