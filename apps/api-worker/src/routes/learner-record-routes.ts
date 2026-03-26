import {
  createLearnerRecordEntry,
  listLearnerRecordEntries,
  patchLearnerRecordEntry,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRole,
} from "@credtrail/db";
import {
  parseCreateLearnerRecordEntryRequest,
  parseLearnerRecordEntryListQuery,
  parseLearnerRecordEntryPathParams,
  parsePatchLearnerRecordEntryRequest,
  parseTenantPathParams,
} from "@credtrail/validation";
import type { Hono } from "hono";

import type { AppBindings, AppContext, AppEnv } from "../app";
import { mapLearnerRecordEntryToCanonicalLearnerRecordItem } from "../learner-record/learner-record-contract";

interface RegisterLearnerRecordRoutesInput {
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

export const registerLearnerRecordRoutes = (input: RegisterLearnerRecordRoutesInput): void => {
  const { app, resolveDatabase, requireTenantRole, ADMIN_ROLES } = input;

  app.get("/v1/tenants/:tenantId/learner-record-entries", async (c) => {
    let pathParams;
    let query;

    try {
      pathParams = parseTenantPathParams(c.req.param());
      query = parseLearnerRecordEntryListQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid learner-record query",
        },
        400,
      );
    }

    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ADMIN_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const entries = await listLearnerRecordEntries(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      learnerProfileId: query.learnerProfileId,
      ...(query.trustLevel === undefined ? {} : { trustLevel: query.trustLevel }),
      ...(query.status === undefined ? {} : { status: query.status }),
    });

    c.header("Cache-Control", "no-store");

    return c.json({
      tenantId: pathParams.tenantId,
      learnerProfileId: query.learnerProfileId,
      count: entries.length,
      items: entries.map((entry) => mapLearnerRecordEntryToCanonicalLearnerRecordItem(entry)),
    });
  });

  app.post("/v1/tenants/:tenantId/learner-record-entries", async (c) => {
    let pathParams;
    let request;

    try {
      pathParams = parseTenantPathParams(c.req.param());
      request = parseCreateLearnerRecordEntryRequest(await c.req.json<unknown>());
    } catch {
      return c.json(
        {
          error: "Invalid learner-record payload",
        },
        400,
      );
    }

    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ADMIN_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const created = await createLearnerRecordEntry(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      learnerProfileId: request.learnerProfileId,
      trustLevel: request.trustLevel,
      recordType: request.recordType,
      title: request.title,
      ...(request.description === undefined ? {} : { description: request.description }),
      status: request.status,
      issuerName: request.provenance.issuerName,
      issuerUserId: request.provenance.issuerUserId ?? roleCheck.session.userId,
      sourceSystem: request.provenance.sourceSystem,
      ...(request.provenance.sourceRecordId === undefined
        ? {}
        : { sourceRecordId: request.provenance.sourceRecordId }),
      issuedAt: request.provenance.issuedAt,
      ...(request.provenance.revisedAt === undefined
        ? {}
        : { revisedAt: request.provenance.revisedAt }),
      ...(request.provenance.revokedAt === undefined
        ? {}
        : { revokedAt: request.provenance.revokedAt }),
      evidenceLinks: request.provenance.evidenceLinks,
      ...(request.details === undefined ? {} : { detailsJson: JSON.stringify(request.details) }),
    });

    c.header("Cache-Control", "no-store");

    return c.json(
      {
        status: "created",
        item: mapLearnerRecordEntryToCanonicalLearnerRecordItem(created),
      },
      201,
    );
  });

  app.patch("/v1/tenants/:tenantId/learner-record-entries/:entryId", async (c) => {
    let pathParams;
    let request;

    try {
      pathParams = parseLearnerRecordEntryPathParams(c.req.param());
      request = parsePatchLearnerRecordEntryRequest(await c.req.json<unknown>());
    } catch {
      return c.json(
        {
          error: "Invalid learner-record payload",
        },
        400,
      );
    }

    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ADMIN_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const updated = await patchLearnerRecordEntry(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      entryId: pathParams.entryId,
      ...(request.trustLevel === undefined ? {} : { trustLevel: request.trustLevel }),
      ...(request.recordType === undefined ? {} : { recordType: request.recordType }),
      ...(request.title === undefined ? {} : { title: request.title }),
      ...(request.description === undefined ? {} : { description: request.description }),
      ...(request.status === undefined ? {} : { status: request.status }),
      ...(request.provenance === undefined
        ? {}
        : {
            issuerName: request.provenance.issuerName,
            ...(request.provenance.issuerUserId === undefined
              ? {}
              : { issuerUserId: request.provenance.issuerUserId }),
            sourceSystem: request.provenance.sourceSystem,
            ...(request.provenance.sourceRecordId === undefined
              ? {}
              : { sourceRecordId: request.provenance.sourceRecordId }),
            issuedAt: request.provenance.issuedAt,
            ...(request.provenance.revisedAt === undefined
              ? {}
              : { revisedAt: request.provenance.revisedAt }),
            ...(request.provenance.revokedAt === undefined
              ? {}
              : { revokedAt: request.provenance.revokedAt }),
            evidenceLinks: request.provenance.evidenceLinks,
          }),
      ...(request.details === undefined ? {} : { detailsJson: JSON.stringify(request.details) }),
    });

    if (updated === null) {
      return c.json(
        {
          error: "Learner-record entry not found",
        },
        404,
      );
    }

    c.header("Cache-Control", "no-store");

    return c.json({
      status: "updated",
      item: mapLearnerRecordEntryToCanonicalLearnerRecordItem(updated),
    });
  });
};
