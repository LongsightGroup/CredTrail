import {
  activateBadgeIssuanceRuleVersion,
  createAuditLog,
  createBadgeIssuanceRule,
  createBadgeIssuanceRuleEvaluation,
  createBadgeIssuanceRuleVersion,
  decideBadgeIssuanceRuleVersion,
  findActiveBadgeIssuanceRuleVersion,
  findBadgeIssuanceRuleById,
  findBadgeIssuanceRuleVersionById,
  findTenantCanvasGradebookIntegration,
  listBadgeIssuanceRules,
  listBadgeIssuanceRuleVersionApprovalEvents,
  listBadgeIssuanceRuleVersionApprovalSteps,
  listBadgeIssuanceRuleVersions,
  listIssuedBadgeTemplateIdsForRecipient,
  submitBadgeIssuanceRuleVersionForApproval,
  updateTenantCanvasGradebookIntegrationTokens,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRole,
} from '@credtrail/db';
import type { Hono } from 'hono';
import {
  parseBadgeIssuanceRuleDefinition,
  parseBadgeIssuanceRulePathParams,
  parseBadgeIssuanceRuleVersionPathParams,
  parseCreateBadgeIssuanceRuleRequest,
  parseCreateBadgeIssuanceRuleVersionRequest,
  parseDecideBadgeIssuanceRuleVersionRequest,
  parseEvaluateBadgeIssuanceRuleRequest,
  parseTenantPathParams,
} from '@credtrail/validation';
import type { AppBindings, AppContext, AppEnv } from '../app';
import { refreshCanvasAccessToken } from '../lms/canvas-oauth';
import { createGradebookProvider } from '../lms/gradebook-provider';
import {
  evaluateBadgeIssuanceRuleDefinition,
  extractBadgeIssuanceRuleRequirements,
  type BadgeIssuanceRuleCompletionFact,
  type BadgeIssuanceRuleEvaluationFacts,
  type BadgeIssuanceRuleGradeFact,
  type BadgeIssuanceRuleSubmissionFact,
} from '../rules/engine';

interface DirectIssueBadgeRequest {
  badgeTemplateId: string;
  recipientIdentity: string;
  recipientIdentityType: 'email' | 'email_sha256' | 'did' | 'url';
  idempotencyKey: string;
}

interface DirectIssueBadgeResult {
  status: 'issued' | 'already_issued';
  assertionId: string;
}

interface RegisterBadgeRuleRoutesInput {
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
  issueBadgeForTenant: (
    c: AppContext,
    tenantId: string,
    request: DirectIssueBadgeRequest,
    issuedByUserId?: string,
  ) => Promise<DirectIssueBadgeResult>;
  ISSUER_ROLES: readonly TenantMembershipRole[];
  ADMIN_ROLES: readonly TenantMembershipRole[];
  TENANT_MEMBER_ROLES: readonly TenantMembershipRole[];
}

const isAccessTokenExpired = (accessTokenExpiresAt: string | null, nowIso: string): boolean => {
  if (accessTokenExpiresAt === null) {
    return false;
  }

  const expiryMs = Date.parse(accessTokenExpiresAt);
  const nowMs = Date.parse(nowIso);

  if (!Number.isFinite(expiryMs) || !Number.isFinite(nowMs)) {
    return false;
  }

  return nowMs >= expiryMs;
};

const TENANT_ROLE_RANK: Record<TenantMembershipRole, number> = {
  viewer: 0,
  issuer: 1,
  admin: 2,
  owner: 3,
};

const roleSatisfiesMinimumRole = (
  actorRole: TenantMembershipRole,
  requiredRole: TenantMembershipRole,
): boolean => {
  return TENANT_ROLE_RANK[actorRole] >= TENANT_ROLE_RANK[requiredRole];
};

const resolveRuleDefinition = (
  rawRuleJson: string,
): ReturnType<typeof parseBadgeIssuanceRuleDefinition> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawRuleJson) as unknown;
  } catch {
    throw new Error('Stored rule JSON is invalid');
  }

  return parseBadgeIssuanceRuleDefinition(parsed);
};

const loadRuleFacts = async (input: {
  db: SqlDatabase;
  tenantId: string;
  learnerId: string;
  recipientIdentity: string;
  recipientIdentityType: 'email' | 'email_sha256' | 'did' | 'url';
  definition: ReturnType<typeof parseBadgeIssuanceRuleDefinition>;
  requestedFacts?: ReturnType<typeof parseEvaluateBadgeIssuanceRuleRequest>['facts'];
  nowIso: string;
}): Promise<BadgeIssuanceRuleEvaluationFacts> => {
  const requestedFacts = input.requestedFacts;

  if (requestedFacts !== undefined) {
    const earnedBadgeTemplateIds =
      requestedFacts.earnedBadgeTemplateIds ??
      (await listIssuedBadgeTemplateIdsForRecipient(input.db, {
        tenantId: input.tenantId,
        recipientIdentity: input.recipientIdentity,
        recipientIdentityType: input.recipientIdentityType,
      }));

    return {
      learnerId: input.learnerId,
      nowIso: requestedFacts.nowIso ?? input.nowIso,
      grades: (requestedFacts.grades ?? []).map((fact) => ({
        courseId: fact.courseId,
        learnerId: fact.learnerId,
        currentScore: fact.currentScore ?? null,
        finalScore: fact.finalScore ?? null,
      })),
      completions: (requestedFacts.completions ?? []).map((fact) => ({
        courseId: fact.courseId,
        learnerId: fact.learnerId,
        completed: fact.completed,
        completionPercent: fact.completionPercent ?? null,
      })),
      submissions: (requestedFacts.submissions ?? []).map((fact) => ({
        courseId: fact.courseId,
        assignmentId: fact.assignmentId,
        learnerId: fact.learnerId,
        score: fact.score ?? null,
        workflowState: fact.workflowState ?? null,
        submittedAt: fact.submittedAt ?? null,
      })),
      earnedBadgeTemplateIds,
    };
  }

  const requirements = extractBadgeIssuanceRuleRequirements(input.definition);
  const integration = await findTenantCanvasGradebookIntegration(input.db, input.tenantId);

  if (integration === null) {
    throw new Error('Canvas integration is required for automated rule evaluation');
  }

  let accessToken = integration.accessToken;

  if (accessToken === null) {
    throw new Error('Canvas integration has no access token. Complete OAuth connection first.');
  }

  if (
    isAccessTokenExpired(integration.accessTokenExpiresAt, input.nowIso) &&
    integration.refreshToken !== null
  ) {
    const refresh = await refreshCanvasAccessToken({
      tokenEndpoint: integration.tokenEndpoint,
      clientId: integration.clientId,
      clientSecret: integration.clientSecret,
      refreshToken: integration.refreshToken,
    });
    const refreshed = await updateTenantCanvasGradebookIntegrationTokens(input.db, {
      tenantId: input.tenantId,
      accessToken: refresh.accessToken,
      refreshToken: refresh.refreshToken,
      accessTokenExpiresAt:
        refresh.expiresInSeconds === undefined
          ? undefined
          : new Date(Date.parse(input.nowIso) + refresh.expiresInSeconds * 1000).toISOString(),
      refreshTokenExpiresAt:
        refresh.refreshTokenExpiresInSeconds === undefined
          ? undefined
          : new Date(Date.parse(input.nowIso) + refresh.refreshTokenExpiresInSeconds * 1000).toISOString(),
    });

    if (refreshed !== null && refreshed.accessToken !== null) {
      accessToken = refreshed.accessToken;
    }
  }

  const provider = createGradebookProvider({
    config: {
      kind: 'canvas',
      apiBaseUrl: integration.apiBaseUrl,
      accessToken,
    },
  });

  const grades: BadgeIssuanceRuleGradeFact[] = [];
  const completions: BadgeIssuanceRuleCompletionFact[] = [];
  const submissions: BadgeIssuanceRuleSubmissionFact[] = [];

  for (const courseId of requirements.courseIds) {
    const [courseGrades, courseCompletions] = await Promise.all([
      provider.listGrades({
        courseId,
        learnerId: input.learnerId,
      }),
      provider.listCompletions({
        courseId,
        learnerId: input.learnerId,
      }),
    ]);

    grades.push(
      ...courseGrades.map((grade) => ({
        courseId: grade.courseId,
        learnerId: grade.learnerId,
        currentScore: grade.currentScore,
        finalScore: grade.finalScore,
      })),
    );
    completions.push(
      ...courseCompletions.map((completion) => ({
        courseId: completion.courseId,
        learnerId: completion.learnerId,
        completed: completion.completed,
        completionPercent: completion.completionPercent,
      })),
    );
  }

  for (const assignment of requirements.assignmentRefs) {
    const assignmentSubmissions = await provider.listSubmissions({
      courseId: assignment.courseId,
      assignmentId: assignment.assignmentId,
      learnerId: input.learnerId,
    });

    submissions.push(
      ...assignmentSubmissions.map((submission) => ({
        courseId: submission.courseId,
        assignmentId: submission.assignmentId,
        learnerId: submission.learnerId,
        score: submission.score,
        workflowState: submission.workflowState,
        submittedAt: submission.submittedAt,
      })),
    );
  }

  const earnedBadgeTemplateIds = await listIssuedBadgeTemplateIdsForRecipient(input.db, {
    tenantId: input.tenantId,
    recipientIdentity: input.recipientIdentity,
    recipientIdentityType: input.recipientIdentityType,
  });

  return {
    learnerId: input.learnerId,
    nowIso: input.nowIso,
    grades,
    completions,
    submissions,
    earnedBadgeTemplateIds,
  };
};

export const registerBadgeRuleRoutes = (input: RegisterBadgeRuleRoutesInput): void => {
  const {
    app,
    resolveDatabase,
    requireTenantRole,
    issueBadgeForTenant,
    ISSUER_ROLES,
    ADMIN_ROLES,
    TENANT_MEMBER_ROLES,
  } = input;

  app.get('/v1/tenants/:tenantId/badge-rules', async (c) => {
    const pathParams = parseTenantPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const rules = await listBadgeIssuanceRules(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
    });

    return c.json({
      tenantId: pathParams.tenantId,
      rules,
    });
  });

  app.post('/v1/tenants/:tenantId/badge-rules', async (c) => {
    const tenantParams = parseTenantPathParams(c.req.param());
    let request;

    try {
      request = parseCreateBadgeIssuanceRuleRequest(await c.req.json<unknown>());
    } catch {
      return c.json(
        {
          error: 'Invalid badge issuance rule payload',
        },
        400,
      );
    }

    const roleCheck = await requireTenantRole(c, tenantParams.tenantId, ISSUER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const { session, membershipRole } = roleCheck;
    const definitionJson = JSON.stringify(request.definition);
    const created = await createBadgeIssuanceRule(resolveDatabase(c.env), {
      tenantId: tenantParams.tenantId,
      name: request.name,
      description: request.description,
      badgeTemplateId: request.badgeTemplateId,
      lmsProviderKind: request.lmsProviderKind,
      ruleJson: definitionJson,
      approvalChain: request.approvalChain,
      changeSummary: request.changeSummary,
      createdByUserId: session.userId,
    });

    await createAuditLog(resolveDatabase(c.env), {
      tenantId: tenantParams.tenantId,
      actorUserId: session.userId,
      action: 'badge_rule.created',
      targetType: 'badge_rule',
      targetId: created.rule.id,
      metadata: {
        role: membershipRole,
        versionId: created.version.id,
        versionNumber: created.version.versionNumber,
        status: created.version.status,
      },
    });

    return c.json(
      {
        tenantId: tenantParams.tenantId,
        rule: created.rule,
        version: {
          ...created.version,
          definition: request.definition,
        },
      },
      201,
    );
  });

  app.get('/v1/tenants/:tenantId/badge-rules/:ruleId', async (c) => {
    const pathParams = parseBadgeIssuanceRulePathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const db = resolveDatabase(c.env);
    const rule = await findBadgeIssuanceRuleById(db, pathParams.tenantId, pathParams.ruleId);

    if (rule === null) {
      return c.json(
        {
          error: 'Badge rule not found',
        },
        404,
      );
    }

    const versions = await listBadgeIssuanceRuleVersions(db, {
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
    });

    return c.json({
      tenantId: pathParams.tenantId,
      rule,
      versions,
    });
  });

  app.post('/v1/tenants/:tenantId/badge-rules/:ruleId/versions', async (c) => {
    const pathParams = parseBadgeIssuanceRulePathParams(c.req.param());
    let request;

    try {
      request = parseCreateBadgeIssuanceRuleVersionRequest(await c.req.json<unknown>());
    } catch {
      return c.json(
        {
          error: 'Invalid badge rule version payload',
        },
        400,
      );
    }

    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const { session, membershipRole } = roleCheck;
    const existingRule = await findBadgeIssuanceRuleById(
      resolveDatabase(c.env),
      pathParams.tenantId,
      pathParams.ruleId,
    );

    if (existingRule === null) {
      return c.json(
        {
          error: 'Badge rule not found',
        },
        404,
      );
    }

    const createdVersion = await createBadgeIssuanceRuleVersion(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      ruleJson: JSON.stringify(request.definition),
      approvalChain: request.approvalChain,
      changeSummary: request.changeSummary,
      createdByUserId: session.userId,
    });

    await createAuditLog(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      actorUserId: session.userId,
      action: 'badge_rule.version_created',
      targetType: 'badge_rule_version',
      targetId: createdVersion.id,
      metadata: {
        role: membershipRole,
        ruleId: pathParams.ruleId,
        versionNumber: createdVersion.versionNumber,
        status: createdVersion.status,
      },
    });

    return c.json(
      {
        tenantId: pathParams.tenantId,
        ruleId: pathParams.ruleId,
        version: createdVersion,
      },
      201,
    );
  });

  app.post(
    '/v1/tenants/:tenantId/badge-rules/:ruleId/versions/:versionId/submit-approval',
    async (c) => {
      const pathParams = parseBadgeIssuanceRuleVersionPathParams(c.req.param());
      const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

      if (roleCheck instanceof Response) {
        return roleCheck;
      }

      const { session, membershipRole } = roleCheck;
      const currentVersion = await findBadgeIssuanceRuleVersionById(resolveDatabase(c.env), {
        tenantId: pathParams.tenantId,
        ruleId: pathParams.ruleId,
        versionId: pathParams.versionId,
      });

      if (currentVersion === null) {
        return c.json(
          {
            error: 'Badge rule version not found',
          },
          404,
        );
      }

      if (currentVersion.status !== 'draft' && currentVersion.status !== 'rejected') {
        return c.json(
          {
            error: `Only draft/rejected versions can be submitted for approval (current: ${currentVersion.status})`,
          },
          409,
        );
      }

      const updatedVersion = await submitBadgeIssuanceRuleVersionForApproval(resolveDatabase(c.env), {
        tenantId: pathParams.tenantId,
        ruleId: pathParams.ruleId,
        versionId: pathParams.versionId,
        actorUserId: session.userId,
        actorRole: membershipRole,
      });

      if (updatedVersion === null) {
        return c.json(
          {
            error: 'Badge rule version not found',
          },
          404,
        );
      }

      await createAuditLog(resolveDatabase(c.env), {
        tenantId: pathParams.tenantId,
        actorUserId: session.userId,
        action: 'badge_rule.version_submitted_for_approval',
        targetType: 'badge_rule_version',
        targetId: updatedVersion.id,
        metadata: {
          role: membershipRole,
          ruleId: pathParams.ruleId,
          versionNumber: updatedVersion.versionNumber,
          status: updatedVersion.status,
        },
      });

      return c.json({
        tenantId: pathParams.tenantId,
        ruleId: pathParams.ruleId,
        version: updatedVersion,
      });
    },
  );

  app.post('/v1/tenants/:tenantId/badge-rules/:ruleId/versions/:versionId/decision', async (c) => {
    const pathParams = parseBadgeIssuanceRuleVersionPathParams(c.req.param());
    let request;

    try {
      request = parseDecideBadgeIssuanceRuleVersionRequest(await c.req.json<unknown>());
    } catch {
      return c.json(
        {
          error: 'Invalid badge rule approval decision payload',
        },
        400,
      );
    }

    const roleCheck = await requireTenantRole(c, pathParams.tenantId, TENANT_MEMBER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const { session, membershipRole } = roleCheck;
    const currentVersion = await findBadgeIssuanceRuleVersionById(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      versionId: pathParams.versionId,
    });

    if (currentVersion === null) {
      return c.json(
        {
          error: 'Badge rule version not found',
        },
        404,
      );
    }

    if (currentVersion.status !== 'pending_approval') {
      return c.json(
        {
          error: `Only pending_approval versions can be decided (current: ${currentVersion.status})`,
        },
        409,
      );
    }

    const approvalSteps = await listBadgeIssuanceRuleVersionApprovalSteps(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      versionId: pathParams.versionId,
    });
    const currentApprovalStep = approvalSteps.find((step) => step.status === 'pending');

    if (currentApprovalStep === undefined) {
      return c.json(
        {
          error: 'No pending approval step exists for this rule version',
        },
        409,
      );
    }

    if (!roleSatisfiesMinimumRole(membershipRole, currentApprovalStep.requiredRole)) {
      return c.json(
        {
          error: `Current approval step requires role ${currentApprovalStep.requiredRole}`,
        },
        403,
      );
    }

    const decidedVersion = await decideBadgeIssuanceRuleVersion(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      versionId: pathParams.versionId,
      decision: request.decision,
      actorUserId: session.userId,
      actorRole: membershipRole,
      comment: request.comment,
    });

    if (decidedVersion === null) {
      return c.json(
        {
          error: 'Badge rule version is no longer pending approval',
        },
        409,
      );
    }

    await createAuditLog(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      actorUserId: session.userId,
      action: 'badge_rule.version_approval_decided',
      targetType: 'badge_rule_version',
      targetId: decidedVersion.id,
      metadata: {
        role: membershipRole,
        ruleId: pathParams.ruleId,
        versionNumber: decidedVersion.versionNumber,
        stepNumber: currentApprovalStep.stepNumber,
        requiredRole: currentApprovalStep.requiredRole,
        decision: request.decision,
        comment: request.comment ?? null,
        status: decidedVersion.status,
      },
    });

    return c.json({
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      version: decidedVersion,
    });
  });

  app.get(
    '/v1/tenants/:tenantId/badge-rules/:ruleId/versions/:versionId/approval-history',
    async (c) => {
      const pathParams = parseBadgeIssuanceRuleVersionPathParams(c.req.param());
      const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

      if (roleCheck instanceof Response) {
        return roleCheck;
      }

      const version = await findBadgeIssuanceRuleVersionById(resolveDatabase(c.env), {
        tenantId: pathParams.tenantId,
        ruleId: pathParams.ruleId,
        versionId: pathParams.versionId,
      });

      if (version === null) {
        return c.json(
          {
            error: 'Badge rule version not found',
          },
          404,
        );
      }

      const [steps, events] = await Promise.all([
        listBadgeIssuanceRuleVersionApprovalSteps(resolveDatabase(c.env), {
          tenantId: pathParams.tenantId,
          ruleId: pathParams.ruleId,
          versionId: pathParams.versionId,
        }),
        listBadgeIssuanceRuleVersionApprovalEvents(resolveDatabase(c.env), {
          tenantId: pathParams.tenantId,
          ruleId: pathParams.ruleId,
          versionId: pathParams.versionId,
        }),
      ]);
      const currentStep = steps.find((step) => step.status === 'pending') ?? null;

      return c.json({
        tenantId: pathParams.tenantId,
        ruleId: pathParams.ruleId,
        version,
        approval: {
          currentStep,
          steps,
          events,
        },
      });
    },
  );

  app.post('/v1/tenants/:tenantId/badge-rules/:ruleId/versions/:versionId/activate', async (c) => {
    const pathParams = parseBadgeIssuanceRuleVersionPathParams(c.req.param());
    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ADMIN_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const { session, membershipRole } = roleCheck;
    const currentVersion = await findBadgeIssuanceRuleVersionById(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      versionId: pathParams.versionId,
    });

    if (currentVersion === null) {
      return c.json(
        {
          error: 'Badge rule version not found',
        },
        404,
      );
    }

    if (currentVersion.status !== 'approved' && currentVersion.status !== 'active') {
      return c.json(
        {
          error: `Only approved versions can be activated (current: ${currentVersion.status})`,
        },
        409,
      );
    }

    const activatedVersion = await activateBadgeIssuanceRuleVersion(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      versionId: pathParams.versionId,
      actorUserId: session.userId,
    });

    if (activatedVersion === null) {
      return c.json(
        {
          error: 'Badge rule version not found',
        },
        404,
      );
    }

    await createAuditLog(resolveDatabase(c.env), {
      tenantId: pathParams.tenantId,
      actorUserId: session.userId,
      action: 'badge_rule.version_activated',
      targetType: 'badge_rule_version',
      targetId: activatedVersion.id,
      metadata: {
        role: membershipRole,
        ruleId: pathParams.ruleId,
        versionNumber: activatedVersion.versionNumber,
        status: activatedVersion.status,
      },
    });

    return c.json({
      tenantId: pathParams.tenantId,
      ruleId: pathParams.ruleId,
      version: activatedVersion,
    });
  });

  app.post('/v1/tenants/:tenantId/badge-rules/:ruleId/evaluate', async (c) => {
    const pathParams = parseBadgeIssuanceRulePathParams(c.req.param());
    let request;

    try {
      request = parseEvaluateBadgeIssuanceRuleRequest(await c.req.json<unknown>());
    } catch {
      return c.json(
        {
          error: 'Invalid badge rule evaluation payload',
        },
        400,
      );
    }

    const roleCheck = await requireTenantRole(c, pathParams.tenantId, ISSUER_ROLES);

    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const { session, membershipRole } = roleCheck;
    const db = resolveDatabase(c.env);
    const rule = await findBadgeIssuanceRuleById(db, pathParams.tenantId, pathParams.ruleId);

    if (rule === null) {
      return c.json(
        {
          error: 'Badge rule not found',
        },
        404,
      );
    }

    const selectedVersion =
      request.versionId === undefined
        ? await findActiveBadgeIssuanceRuleVersion(db, {
            tenantId: pathParams.tenantId,
            ruleId: pathParams.ruleId,
          })
        : await findBadgeIssuanceRuleVersionById(db, {
            tenantId: pathParams.tenantId,
            ruleId: pathParams.ruleId,
            versionId: request.versionId,
          });

    if (selectedVersion === null) {
      return c.json(
        {
          error:
            request.versionId === undefined
              ? 'No active rule version found. Activate an approved version first.'
              : 'Badge rule version not found',
        },
        404,
      );
    }

    const definition = resolveRuleDefinition(selectedVersion.ruleJson);
    const nowIso = new Date().toISOString();

    let facts: BadgeIssuanceRuleEvaluationFacts;

    try {
      facts = await loadRuleFacts({
        db,
        tenantId: pathParams.tenantId,
        learnerId: request.learnerId,
        recipientIdentity: request.recipientIdentity,
        recipientIdentityType: request.recipientIdentityType,
        definition,
        requestedFacts: request.facts,
        nowIso,
      });
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Failed to load rule facts',
        },
        502,
      );
    }

    const evaluation = evaluateBadgeIssuanceRuleDefinition(definition, facts);
    const dryRun = request.dryRun ?? false;
    let issuance: DirectIssueBadgeResult | null = null;

    if (evaluation.matched && !dryRun) {
      try {
        issuance = await issueBadgeForTenant(
          c,
          pathParams.tenantId,
          {
            badgeTemplateId: rule.badgeTemplateId,
            recipientIdentity: request.recipientIdentity,
            recipientIdentityType: request.recipientIdentityType,
            idempotencyKey: `rule:${rule.id}:v${String(selectedVersion.versionNumber)}:${request.learnerId}`,
          },
          session.userId,
        );
      } catch (error) {
        return c.json(
          {
            error: error instanceof Error ? error.message : 'Failed to issue badge for matched rule',
          },
          502,
        );
      }
    }

    const evaluationRecord = await createBadgeIssuanceRuleEvaluation(db, {
      tenantId: pathParams.tenantId,
      ruleId: rule.id,
      versionId: selectedVersion.id,
      learnerId: request.learnerId,
      recipientIdentity: request.recipientIdentity,
      recipientIdentityType: request.recipientIdentityType,
      matched: evaluation.matched,
      issuanceStatus: issuance?.status,
      assertionId: issuance?.assertionId,
      evaluationJson: JSON.stringify({
        dryRun,
        evaluation,
        facts,
      }),
      evaluatedAt: facts.nowIso,
    });

    await createAuditLog(db, {
      tenantId: pathParams.tenantId,
      actorUserId: session.userId,
      action: 'badge_rule.evaluated',
      targetType: 'badge_rule',
      targetId: rule.id,
      metadata: {
        role: membershipRole,
        versionId: selectedVersion.id,
        versionNumber: selectedVersion.versionNumber,
        learnerId: request.learnerId,
        dryRun,
        matched: evaluation.matched,
        issuanceStatus: issuance?.status ?? null,
        assertionId: issuance?.assertionId ?? null,
      },
    });

    return c.json({
      tenantId: pathParams.tenantId,
      rule,
      version: selectedVersion,
      evaluation,
      dryRun,
      issuance,
      evaluationRecord,
    });
  });
};
