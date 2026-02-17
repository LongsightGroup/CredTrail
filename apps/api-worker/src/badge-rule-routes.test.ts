import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedIssueBadgeForTenant } = vi.hoisted(() => {
  return {
    mockedIssueBadgeForTenant: vi.fn(),
  };
});

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    createAuditLog: vi.fn(),
    createBadgeIssuanceRule: vi.fn(),
    createBadgeIssuanceRuleVersion: vi.fn(),
    submitBadgeIssuanceRuleVersionForApproval: vi.fn(),
    decideBadgeIssuanceRuleVersion: vi.fn(),
    activateBadgeIssuanceRuleVersion: vi.fn(),
    findBadgeIssuanceRuleById: vi.fn(),
    findBadgeIssuanceRuleVersionById: vi.fn(),
    findActiveBadgeIssuanceRuleVersion: vi.fn(),
    listBadgeIssuanceRules: vi.fn(),
    listBadgeIssuanceRuleVersions: vi.fn(),
    listBadgeIssuanceRuleVersionApprovalSteps: vi.fn(),
    listBadgeIssuanceRuleVersionApprovalEvents: vi.fn(),
    createBadgeIssuanceRuleEvaluation: vi.fn(),
    findTenantCanvasGradebookIntegration: vi.fn(),
    updateTenantCanvasGradebookIntegrationTokens: vi.fn(),
    listIssuedBadgeTemplateIdsForRecipient: vi.fn(),
    findActiveSessionByHash: vi.fn(),
    findTenantMembership: vi.fn(),
    touchSession: vi.fn(),
  };
});

vi.mock('@credtrail/db/postgres', () => {
  return {
    createPostgresDatabase: vi.fn(),
  };
});

vi.mock('./badges/direct-issue', () => {
  return {
    createIssueBadgeForTenant: vi.fn(() => mockedIssueBadgeForTenant),
  };
});

import {
  activateBadgeIssuanceRuleVersion,
  createAuditLog,
  createBadgeIssuanceRule,
  createBadgeIssuanceRuleEvaluation,
  createBadgeIssuanceRuleVersion,
  decideBadgeIssuanceRuleVersion,
  findActiveBadgeIssuanceRuleVersion,
  findActiveSessionByHash,
  findBadgeIssuanceRuleById,
  findBadgeIssuanceRuleVersionById,
  findTenantMembership,
  listBadgeIssuanceRuleVersionApprovalEvents,
  listBadgeIssuanceRuleVersionApprovalSteps,
  listBadgeIssuanceRuleVersions,
  listBadgeIssuanceRules,
  submitBadgeIssuanceRuleVersionForApproval,
  touchSession,
  type AuditLogRecord,
  type BadgeIssuanceRuleEvaluationRecord,
  type BadgeIssuanceRuleApprovalEventRecord,
  type BadgeIssuanceRuleApprovalStepRecord,
  type BadgeIssuanceRuleRecord,
  type BadgeIssuanceRuleVersionRecord,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRecord,
} from '@credtrail/db';
import { createPostgresDatabase } from '@credtrail/db/postgres';
import { app } from './index';

const mockedCreatePostgresDatabase = vi.mocked(createPostgresDatabase);
const mockedCreateAuditLog = vi.mocked(createAuditLog);
const mockedCreateBadgeIssuanceRule = vi.mocked(createBadgeIssuanceRule);
const mockedCreateBadgeIssuanceRuleVersion = vi.mocked(createBadgeIssuanceRuleVersion);
const mockedSubmitBadgeIssuanceRuleVersionForApproval = vi.mocked(
  submitBadgeIssuanceRuleVersionForApproval,
);
const mockedDecideBadgeIssuanceRuleVersion = vi.mocked(decideBadgeIssuanceRuleVersion);
const mockedActivateBadgeIssuanceRuleVersion = vi.mocked(activateBadgeIssuanceRuleVersion);
const mockedFindBadgeIssuanceRuleById = vi.mocked(findBadgeIssuanceRuleById);
const mockedFindBadgeIssuanceRuleVersionById = vi.mocked(findBadgeIssuanceRuleVersionById);
const mockedFindActiveBadgeIssuanceRuleVersion = vi.mocked(findActiveBadgeIssuanceRuleVersion);
const mockedListBadgeIssuanceRules = vi.mocked(listBadgeIssuanceRules);
const mockedListBadgeIssuanceRuleVersions = vi.mocked(listBadgeIssuanceRuleVersions);
const mockedListBadgeIssuanceRuleVersionApprovalSteps = vi.mocked(
  listBadgeIssuanceRuleVersionApprovalSteps,
);
const mockedListBadgeIssuanceRuleVersionApprovalEvents = vi.mocked(
  listBadgeIssuanceRuleVersionApprovalEvents,
);
const mockedCreateBadgeIssuanceRuleEvaluation = vi.mocked(createBadgeIssuanceRuleEvaluation);
const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedFindTenantMembership = vi.mocked(findTenantMembership);
const mockedTouchSession = vi.mocked(touchSession);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const createEnv = (): {
  APP_ENV: string;
  DATABASE_URL: string;
  BADGE_OBJECTS: R2Bucket;
  PLATFORM_DOMAIN: string;
} => {
  return {
    APP_ENV: 'test',
    DATABASE_URL: 'postgres://credtrail-test.local/db',
    BADGE_OBJECTS: {} as R2Bucket,
    PLATFORM_DOMAIN: 'credtrail.test',
  };
};

const sampleSession = (overrides?: Partial<SessionRecord>): SessionRecord => {
  return {
    id: 'ses_123',
    tenantId: 'tenant_123',
    userId: 'usr_123',
    sessionTokenHash: 'session-hash',
    expiresAt: '2026-02-20T00:00:00.000Z',
    lastSeenAt: '2026-02-17T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

const sampleMembership = (overrides?: Partial<TenantMembershipRecord>): TenantMembershipRecord => {
  return {
    tenantId: 'tenant_123',
    userId: 'usr_123',
    role: 'admin',
    createdAt: '2026-02-17T00:00:00.000Z',
    updatedAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

const sampleAuditLogRecord = (overrides?: Partial<AuditLogRecord>): AuditLogRecord => {
  return {
    id: 'audit_123',
    tenantId: 'tenant_123',
    actorUserId: 'usr_123',
    action: 'badge_rule.test',
    targetType: 'badge_rule',
    targetId: 'brl_123',
    metadataJson: null,
    occurredAt: '2026-02-17T00:00:00.000Z',
    createdAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

const sampleRule = (overrides?: Partial<BadgeIssuanceRuleRecord>): BadgeIssuanceRuleRecord => {
  return {
    id: 'brl_123',
    tenantId: 'tenant_123',
    name: 'CS101 Rule',
    description: 'Issue badge for CS101 excellence',
    badgeTemplateId: 'badge_template_cs101',
    lmsProviderKind: 'canvas',
    activeVersionId: 'brv_123',
    createdByUserId: 'usr_123',
    createdAt: '2026-02-17T00:00:00.000Z',
    updatedAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

const sampleVersion = (
  overrides?: Partial<BadgeIssuanceRuleVersionRecord>,
): BadgeIssuanceRuleVersionRecord => {
  return {
    id: 'brv_123',
    tenantId: 'tenant_123',
    ruleId: 'brl_123',
    versionNumber: 1,
    status: 'draft',
    ruleJson: JSON.stringify({
      conditions: {
        type: 'grade_threshold',
        courseId: 'course_101',
        minScore: 80,
      },
    }),
    changeSummary: 'Initial draft',
    createdByUserId: 'usr_123',
    approvedByUserId: null,
    approvedAt: null,
    activatedByUserId: null,
    activatedAt: null,
    createdAt: '2026-02-17T00:00:00.000Z',
    updatedAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

const sampleEvaluationRecord = (
  overrides?: Partial<BadgeIssuanceRuleEvaluationRecord>,
): BadgeIssuanceRuleEvaluationRecord => {
  return {
    id: 'bre_123',
    tenantId: 'tenant_123',
    ruleId: 'brl_123',
    versionId: 'brv_123',
    learnerId: 'learner_123',
    recipientIdentity: 'learner@example.edu',
    recipientIdentityType: 'email',
    matched: true,
    issuanceStatus: 'issued',
    assertionId: 'tenant_123:assertion_1',
    evaluationJson: '{}',
    evaluatedAt: '2026-02-17T00:00:00.000Z',
    createdAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

const sampleApprovalStep = (
  overrides?: Partial<BadgeIssuanceRuleApprovalStepRecord>,
): BadgeIssuanceRuleApprovalStepRecord => {
  return {
    id: 'bras_123',
    tenantId: 'tenant_123',
    versionId: 'brv_123',
    stepNumber: 1,
    requiredRole: 'admin',
    label: 'Registrar approval',
    status: 'pending',
    decidedByUserId: null,
    decidedAt: null,
    decisionComment: null,
    createdAt: '2026-02-17T00:00:00.000Z',
    updatedAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

const sampleApprovalEvent = (
  overrides?: Partial<BadgeIssuanceRuleApprovalEventRecord>,
): BadgeIssuanceRuleApprovalEventRecord => {
  return {
    id: 'brae_123',
    tenantId: 'tenant_123',
    versionId: 'brv_123',
    stepNumber: 1,
    action: 'submitted',
    actorUserId: 'usr_123',
    actorRole: 'issuer',
    comment: null,
    occurredAt: '2026-02-17T00:00:00.000Z',
    createdAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

beforeEach(() => {
  mockedCreatePostgresDatabase.mockReset();
  mockedCreatePostgresDatabase.mockReturnValue(fakeDb);

  mockedFindActiveSessionByHash.mockReset();
  mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
  mockedTouchSession.mockReset();
  mockedTouchSession.mockResolvedValue();
  mockedFindTenantMembership.mockReset();
  mockedFindTenantMembership.mockResolvedValue(sampleMembership());

  mockedCreateAuditLog.mockReset();
  mockedCreateAuditLog.mockResolvedValue(sampleAuditLogRecord());
  mockedCreateBadgeIssuanceRule.mockReset();
  mockedCreateBadgeIssuanceRuleVersion.mockReset();
  mockedSubmitBadgeIssuanceRuleVersionForApproval.mockReset();
  mockedDecideBadgeIssuanceRuleVersion.mockReset();
  mockedActivateBadgeIssuanceRuleVersion.mockReset();
  mockedFindBadgeIssuanceRuleById.mockReset();
  mockedFindBadgeIssuanceRuleVersionById.mockReset();
  mockedFindActiveBadgeIssuanceRuleVersion.mockReset();
  mockedListBadgeIssuanceRules.mockReset();
  mockedListBadgeIssuanceRules.mockResolvedValue([]);
  mockedListBadgeIssuanceRuleVersions.mockReset();
  mockedListBadgeIssuanceRuleVersions.mockResolvedValue([]);
  mockedListBadgeIssuanceRuleVersionApprovalSteps.mockReset();
  mockedListBadgeIssuanceRuleVersionApprovalSteps.mockResolvedValue([]);
  mockedListBadgeIssuanceRuleVersionApprovalEvents.mockReset();
  mockedListBadgeIssuanceRuleVersionApprovalEvents.mockResolvedValue([]);
  mockedCreateBadgeIssuanceRuleEvaluation.mockReset();
  mockedIssueBadgeForTenant.mockReset();
});

describe('badge rule routes', () => {
  it('creates badge issuance rules', async () => {
    const env = createEnv();
    mockedCreateBadgeIssuanceRule.mockResolvedValue({
      rule: sampleRule(),
      version: sampleVersion(),
    });

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-rules',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'CS101 Rule',
          description: 'Issue badge for CS101 excellence',
          badgeTemplateId: 'badge_template_cs101',
          lmsProviderKind: 'canvas',
          definition: {
            conditions: {
              type: 'grade_threshold',
              courseId: 'course_101',
              minScore: 80,
            },
          },
        }),
      },
      env,
    );

    expect(response.status).toBe(201);
    expect(mockedCreateBadgeIssuanceRule).toHaveBeenCalledTimes(1);
    expect(mockedCreateAuditLog).toHaveBeenCalledTimes(1);
  });

  it('submits draft rule versions for approval', async () => {
    const env = createEnv();
    mockedFindBadgeIssuanceRuleVersionById.mockResolvedValue(sampleVersion({ status: 'draft' }));
    mockedSubmitBadgeIssuanceRuleVersionForApproval.mockResolvedValue(
      sampleVersion({ status: 'pending_approval' }),
    );

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-rules/brl_123/versions/brv_123/submit-approval',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );
    const body = await response.json<{
      version: {
        status: string;
      };
    }>();

    expect(response.status).toBe(200);
    expect(body.version.status).toBe('pending_approval');
    expect(mockedSubmitBadgeIssuanceRuleVersionForApproval).toHaveBeenCalledTimes(1);
    expect(mockedSubmitBadgeIssuanceRuleVersionForApproval).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({
        tenantId: 'tenant_123',
        ruleId: 'brl_123',
        versionId: 'brv_123',
        actorUserId: 'usr_123',
        actorRole: 'admin',
      }),
    );
  });

  it('rejects approval decisions when the current step requires a higher role', async () => {
    const env = createEnv();
    mockedFindBadgeIssuanceRuleVersionById.mockResolvedValue(sampleVersion({ status: 'pending_approval' }));
    mockedListBadgeIssuanceRuleVersionApprovalSteps.mockResolvedValue([
      sampleApprovalStep({
        requiredRole: 'owner',
      }),
    ]);

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-rules/brl_123/versions/brv_123/decision',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approved',
          comment: 'Looks good',
        }),
      },
      env,
    );
    const body = await response.json<{ error: string }>();

    expect(response.status).toBe(403);
    expect(body.error).toContain('requires role owner');
    expect(mockedDecideBadgeIssuanceRuleVersion).not.toHaveBeenCalled();
  });

  it('returns approval history for a badge rule version', async () => {
    const env = createEnv();
    mockedFindBadgeIssuanceRuleVersionById.mockResolvedValue(sampleVersion({ status: 'pending_approval' }));
    mockedListBadgeIssuanceRuleVersionApprovalSteps.mockResolvedValue([
      sampleApprovalStep({
        stepNumber: 1,
        requiredRole: 'issuer',
        status: 'approved',
        decidedByUserId: 'usr_123',
        decidedAt: '2026-02-17T00:00:00.000Z',
      }),
      sampleApprovalStep({
        id: 'bras_456',
        stepNumber: 2,
        requiredRole: 'admin',
        status: 'pending',
      }),
    ]);
    mockedListBadgeIssuanceRuleVersionApprovalEvents.mockResolvedValue([
      sampleApprovalEvent({
        action: 'submitted',
      }),
      sampleApprovalEvent({
        id: 'brae_456',
        action: 'approved',
        actorRole: 'issuer',
        comment: 'Department sign-off complete',
      }),
    ]);

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-rules/brl_123/versions/brv_123/approval-history',
      {
        method: 'GET',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );
    const body = await response.json<{
      approval: {
        currentStep: {
          stepNumber: number;
        } | null;
        steps: unknown[];
        events: unknown[];
      };
    }>();

    expect(response.status).toBe(200);
    expect(body.approval.currentStep?.stepNumber).toBe(2);
    expect(body.approval.steps).toHaveLength(2);
    expect(body.approval.events).toHaveLength(2);
  });

  it('evaluates active rules and issues badges when matched', async () => {
    const env = createEnv();
    mockedFindBadgeIssuanceRuleById.mockResolvedValue(sampleRule());
    mockedFindActiveBadgeIssuanceRuleVersion.mockResolvedValue(sampleVersion({ status: 'active' }));
    mockedIssueBadgeForTenant.mockResolvedValue({
      status: 'issued',
      assertionId: 'tenant_123:assertion_1',
    });
    mockedCreateBadgeIssuanceRuleEvaluation.mockResolvedValue(sampleEvaluationRecord());

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-rules/brl_123/evaluate',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          learnerId: 'learner_123',
          recipientIdentity: 'learner@example.edu',
          recipientIdentityType: 'email',
          dryRun: false,
          facts: {
            nowIso: '2026-02-17T00:00:00.000Z',
            grades: [
              {
                courseId: 'course_101',
                learnerId: 'learner_123',
                finalScore: 95,
              },
            ],
            earnedBadgeTemplateIds: [],
          },
        }),
      },
      env,
    );
    const body = await response.json<{
      evaluation: {
        matched: boolean;
      };
      issuance: {
        status: string;
      };
    }>();

    expect(response.status).toBe(200);
    expect(body.evaluation.matched).toBe(true);
    expect(body.issuance.status).toBe('issued');
    expect(mockedIssueBadgeForTenant).toHaveBeenCalledTimes(1);
    expect(mockedCreateBadgeIssuanceRuleEvaluation).toHaveBeenCalledTimes(1);
  });
});
