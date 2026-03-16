import {
  addLearnerIdentityAlias,
  createLearnerIdentityLinkProof,
  findLearnerIdentityLinkProofByHash,
  findLearnerProfileByIdentity,
  findUserById,
  isLearnerIdentityLinkProofValid,
  listLearnerBadgeSummaries,
  listLearnerIdentitiesByProfile,
  markLearnerIdentityLinkProofUsed,
  removeLearnerIdentityAliasesByType,
  resolveLearnerProfileForIdentity,
  type SqlDatabase,
  type TenantMembershipRole,
} from '@credtrail/db';
import type { Hono } from 'hono';
import {
  parseLearnerDidSettingsRequest,
  parseLearnerIdentityLinkRequest,
  parseLearnerIdentityLinkVerifyRequest,
  parseTenantPathParams,
} from '@credtrail/validation';
import type { AppBindings, AppContext, AppEnv } from '../app';
import type { AuthenticatedPrincipal, RequestedTenantContext } from '../auth/auth-context';

interface RegisterLearnerRoutesInput<DidNotice> {
  app: Hono<AppEnv>;
  resolveDatabase: (bindings: AppBindings) => SqlDatabase;
  requireTenantRole: (
    context: AppContext,
    tenantId: string,
    allowedRoles: readonly TenantMembershipRole[],
  ) => Promise<
    | {
        principal: AuthenticatedPrincipal;
        requestedTenant: RequestedTenantContext;
        membershipRole: TenantMembershipRole;
      }
    | Response
  >;
  TENANT_MEMBER_ROLES: readonly TenantMembershipRole[];
  addSecondsToIso: (isoTimestamp: string, seconds: number) => string;
  generateOpaqueToken: () => string;
  sha256Hex: (value: string) => Promise<string>;
  LEARNER_IDENTITY_LINK_TTL_SECONDS: number;
  learnerDidSettingsNoticeFromQuery: (value: string | undefined) => DidNotice;
  learnerDashboardPage: (
    requestUrl: string,
    tenantId: string,
    badges: Awaited<ReturnType<typeof listLearnerBadgeSummaries>>,
    learnerDid: string | null,
    didNotice: DidNotice,
  ) => string;
}

export const registerLearnerRoutes = <DidNotice>(
  input: RegisterLearnerRoutesInput<DidNotice>,
): void => {
  const {
    app,
    resolveDatabase,
    requireTenantRole,
    TENANT_MEMBER_ROLES,
    addSecondsToIso,
    generateOpaqueToken,
    sha256Hex,
    LEARNER_IDENTITY_LINK_TTL_SECONDS,
    learnerDidSettingsNoticeFromQuery,
    learnerDashboardPage,
  } = input;

  app.get('/tenants/:tenantId/learner/dashboard', async (c) => {
    const pathParams = parseTenantPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, TENANT_MEMBER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const db = resolveDatabase(c.env);
    const user = await findUserById(db, roleCheck.principal.userId);

    if (user === null) {
      return c.json(
        {
          error: 'Authenticated user not found',
        },
        404,
      );
    }

    const learnerProfile = await resolveLearnerProfileForIdentity(db, {
      tenantId: pathParams.tenantId,
      identityType: 'email',
      identityValue: user.email,
    });
    const learnerIdentities = await listLearnerIdentitiesByProfile(
      db,
      pathParams.tenantId,
      learnerProfile.id,
    );
    const learnerDid =
      learnerIdentities.find((identity) => identity.identityType === 'did')?.identityValue ?? null;
    const badges = await listLearnerBadgeSummaries(db, {
      tenantId: pathParams.tenantId,
      userId: roleCheck.principal.userId,
    });
    const didNotice = learnerDidSettingsNoticeFromQuery(c.req.query('didStatus'));

    c.header('Cache-Control', 'no-store');
    return c.html(learnerDashboardPage(c.req.url, pathParams.tenantId, badges, learnerDid, didNotice));
  });

  app.post('/tenants/:tenantId/learner/settings/did', async (c): Promise<Response> => {
    const pathParams = parseTenantPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, TENANT_MEMBER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const dashboardUrl = new URL(
      `/tenants/${encodeURIComponent(pathParams.tenantId)}/learner/dashboard`,
      c.req.url,
    );
    const contentType = c.req.header('content-type') ?? '';

    if (!contentType.toLowerCase().includes('application/x-www-form-urlencoded')) {
      dashboardUrl.searchParams.set('didStatus', 'invalid');
      return c.redirect(dashboardUrl.toString(), 303);
    }

    const rawBody = await c.req.text();
    const formData = new URLSearchParams(rawBody);

    let request: ReturnType<typeof parseLearnerDidSettingsRequest>;

    try {
      request = parseLearnerDidSettingsRequest({
        did: formData.get('did') ?? undefined,
      });
    } catch {
      dashboardUrl.searchParams.set('didStatus', 'invalid');
      return c.redirect(dashboardUrl.toString(), 303);
    }

    const db = resolveDatabase(c.env);
    const user = await findUserById(db, roleCheck.principal.userId);

    if (user === null) {
      return c.json(
        {
          error: 'Authenticated user not found',
        },
        404,
      );
    }

    const learnerProfile = await resolveLearnerProfileForIdentity(db, {
      tenantId: pathParams.tenantId,
      identityType: 'email',
      identityValue: user.email,
    });
    const submittedDid = request.did ?? '';

    if (submittedDid.length === 0) {
      await removeLearnerIdentityAliasesByType(db, {
        tenantId: pathParams.tenantId,
        learnerProfileId: learnerProfile.id,
        identityType: 'did',
      });
      dashboardUrl.searchParams.set('didStatus', 'cleared');
      return c.redirect(dashboardUrl.toString(), 303);
    }

    const existingDidProfile = await findLearnerProfileByIdentity(db, {
      tenantId: pathParams.tenantId,
      identityType: 'did',
      identityValue: submittedDid,
    });

    if (existingDidProfile !== null && existingDidProfile.id !== learnerProfile.id) {
      dashboardUrl.searchParams.set('didStatus', 'conflict');
      return c.redirect(dashboardUrl.toString(), 303);
    }

    await removeLearnerIdentityAliasesByType(db, {
      tenantId: pathParams.tenantId,
      learnerProfileId: learnerProfile.id,
      identityType: 'did',
    });
    await addLearnerIdentityAlias(db, {
      tenantId: pathParams.tenantId,
      learnerProfileId: learnerProfile.id,
      identityType: 'did',
      identityValue: submittedDid,
      isPrimary: false,
      isVerified: true,
    });

    dashboardUrl.searchParams.set('didStatus', 'updated');
    return c.redirect(dashboardUrl.toString(), 303);
  });

  app.post('/v1/tenants/:tenantId/learner/identity-links/email/request', async (c) => {
    const pathParams = parseTenantPathParams(c.req.param());
    const payload = await c.req.json<unknown>();
    const request = parseLearnerIdentityLinkRequest(payload);
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, TENANT_MEMBER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const db = resolveDatabase(c.env);
    const user = await findUserById(db, roleCheck.principal.userId);

    if (user === null) {
      return c.json(
        {
          error: 'Authenticated user not found',
        },
        404,
      );
    }

    const learnerProfile = await resolveLearnerProfileForIdentity(db, {
      tenantId: pathParams.tenantId,
      identityType: 'email',
      identityValue: user.email,
    });
    const normalizedEmail = request.email.trim().toLowerCase();
    const existingProfile = await findLearnerProfileByIdentity(db, {
      tenantId: pathParams.tenantId,
      identityType: 'email',
      identityValue: normalizedEmail,
    });

    if (existingProfile !== null && existingProfile.id !== learnerProfile.id) {
      return c.json(
        {
          error: 'Email is already linked to a different learner profile',
        },
        409,
      );
    }

    if (existingProfile !== null) {
      return c.json({
        status: 'already_linked',
        tenantId: pathParams.tenantId,
        learnerProfileId: learnerProfile.id,
        identityType: 'email',
        identityValue: normalizedEmail,
      });
    }

    const nowIso = new Date().toISOString();
    const expiresAt = addSecondsToIso(nowIso, LEARNER_IDENTITY_LINK_TTL_SECONDS);
    const proofToken = generateOpaqueToken();
    const tokenHash = await sha256Hex(proofToken);

    await createLearnerIdentityLinkProof(db, {
      tenantId: pathParams.tenantId,
      learnerProfileId: learnerProfile.id,
      requestedByUserId: roleCheck.principal.userId,
      identityType: 'email',
      identityValue: normalizedEmail,
      tokenHash,
      expiresAt,
    });

    if (c.env.APP_ENV === 'development') {
      return c.json(
        {
          status: 'sent',
          tenantId: pathParams.tenantId,
          identityType: 'email',
          identityValue: normalizedEmail,
          expiresAt,
          token: proofToken,
        },
        202,
      );
    }

    return c.json(
      {
        status: 'sent',
        tenantId: pathParams.tenantId,
        identityType: 'email',
        identityValue: normalizedEmail,
        expiresAt,
      },
      202,
    );
  });

  app.post('/v1/tenants/:tenantId/learner/identity-links/email/verify', async (c) => {
    const pathParams = parseTenantPathParams(c.req.param());
    const payload = await c.req.json<unknown>();
    const request = parseLearnerIdentityLinkVerifyRequest(payload);
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, TENANT_MEMBER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const db = resolveDatabase(c.env);
    const nowIso = new Date().toISOString();
    const proof = await findLearnerIdentityLinkProofByHash(db, await sha256Hex(request.token));

    if (proof === null || !isLearnerIdentityLinkProofValid(proof, nowIso)) {
      return c.json(
        {
          error: 'Invalid or expired identity link token',
        },
        400,
      );
    }

    if (
      proof.tenantId !== pathParams.tenantId ||
      proof.requestedByUserId !== roleCheck.principal.userId
    ) {
      return c.json(
        {
          error: 'Forbidden identity link token',
        },
        403,
      );
    }

    const existingProfile = await findLearnerProfileByIdentity(db, {
      tenantId: pathParams.tenantId,
      identityType: proof.identityType,
      identityValue: proof.identityValue,
    });

    if (existingProfile !== null && existingProfile.id !== proof.learnerProfileId) {
      return c.json(
        {
          error: 'Email is already linked to a different learner profile',
        },
        409,
      );
    }

    if (existingProfile === null) {
      await addLearnerIdentityAlias(db, {
        tenantId: pathParams.tenantId,
        learnerProfileId: proof.learnerProfileId,
        identityType: proof.identityType,
        identityValue: proof.identityValue,
        isPrimary: true,
        isVerified: true,
      });
    }

    await markLearnerIdentityLinkProofUsed(db, proof.id, nowIso);

    return c.json({
      status: existingProfile === null ? 'linked' : 'already_linked',
      tenantId: pathParams.tenantId,
      learnerProfileId: proof.learnerProfileId,
      identityType: proof.identityType,
      identityValue: proof.identityValue,
    });
  });
};
