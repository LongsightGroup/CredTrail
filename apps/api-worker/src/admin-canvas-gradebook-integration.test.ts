import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    createAuditLog: vi.fn(),
    findTenantCanvasGradebookIntegration: vi.fn(),
    upsertTenantCanvasGradebookIntegration: vi.fn(),
    updateTenantCanvasGradebookIntegrationTokens: vi.fn(),
  };
});

vi.mock('@credtrail/db/postgres', () => {
  return {
    createPostgresDatabase: vi.fn(),
  };
});

vi.mock('./lms/canvas-oauth', async () => {
  const actual = await vi.importActual<typeof import('./lms/canvas-oauth')>('./lms/canvas-oauth');

  return {
    ...actual,
    signCanvasOAuthStatePayload: vi.fn(),
    validateCanvasOAuthStateToken: vi.fn(),
    exchangeCanvasAuthorizationCode: vi.fn(),
    refreshCanvasAccessToken: vi.fn(),
  };
});

vi.mock('./lms/gradebook-provider', async () => {
  const actual = await vi.importActual<typeof import('./lms/gradebook-provider')>(
    './lms/gradebook-provider',
  );

  return {
    ...actual,
    createGradebookProvider: vi.fn(),
  };
});

import {
  createAuditLog,
  findTenantCanvasGradebookIntegration,
  upsertTenantCanvasGradebookIntegration,
  updateTenantCanvasGradebookIntegrationTokens,
  type AuditLogRecord,
  type SqlDatabase,
  type TenantCanvasGradebookIntegrationRecord,
} from '@credtrail/db';
import { createPostgresDatabase } from '@credtrail/db/postgres';
import {
  exchangeCanvasAuthorizationCode,
  refreshCanvasAccessToken,
  signCanvasOAuthStatePayload,
  validateCanvasOAuthStateToken,
} from './lms/canvas-oauth';
import { createGradebookProvider } from './lms/gradebook-provider';
import { app } from './index';

const mockedCreateAuditLog = vi.mocked(createAuditLog);
const mockedFindTenantCanvasGradebookIntegration = vi.mocked(findTenantCanvasGradebookIntegration);
const mockedUpsertTenantCanvasGradebookIntegration = vi.mocked(upsertTenantCanvasGradebookIntegration);
const mockedUpdateTenantCanvasGradebookIntegrationTokens = vi.mocked(
  updateTenantCanvasGradebookIntegrationTokens,
);
const mockedCreatePostgresDatabase = vi.mocked(createPostgresDatabase);
const mockedSignCanvasOAuthStatePayload = vi.mocked(signCanvasOAuthStatePayload);
const mockedValidateCanvasOAuthStateToken = vi.mocked(validateCanvasOAuthStateToken);
const mockedExchangeCanvasAuthorizationCode = vi.mocked(exchangeCanvasAuthorizationCode);
const mockedRefreshCanvasAccessToken = vi.mocked(refreshCanvasAccessToken);
const mockedCreateGradebookProvider = vi.mocked(createGradebookProvider);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const createEnv = (): {
  APP_ENV: string;
  DATABASE_URL: string;
  BADGE_OBJECTS: R2Bucket;
  PLATFORM_DOMAIN: string;
  BOOTSTRAP_ADMIN_TOKEN: string;
} => {
  return {
    APP_ENV: 'test',
    DATABASE_URL: 'postgres://credtrail-test.local/db',
    BADGE_OBJECTS: {} as R2Bucket,
    PLATFORM_DOMAIN: 'credtrail.test',
    BOOTSTRAP_ADMIN_TOKEN: 'bootstrap-secret',
  };
};

const sampleAuditLogRecord = (overrides?: Partial<AuditLogRecord>): AuditLogRecord => {
  return {
    ...overrides,
    id: 'audit_123',
    tenantId: 'tenant_123',
    actorUserId: 'usr_123',
    action: 'test.action',
    targetType: 'test_target',
    targetId: 'target_123',
    metadataJson: null,
    occurredAt: '2026-02-17T00:00:00.000Z',
    createdAt: '2026-02-17T00:00:00.000Z',
  };
};

const sampleIntegration = (
  overrides?: Partial<TenantCanvasGradebookIntegrationRecord>,
): TenantCanvasGradebookIntegrationRecord => {
  return {
    tenantId: 'tenant_123',
    apiBaseUrl: 'https://canvas.example.edu',
    authorizationEndpoint: 'https://canvas.example.edu/login/oauth2/auth',
    tokenEndpoint: 'https://canvas.example.edu/login/oauth2/token',
    clientId: 'canvas-client-id',
    clientSecret: 'canvas-client-secret',
    scope: 'url:GET|/api/v1/courses',
    accessToken: null,
    refreshToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    connectedAt: null,
    createdAt: '2026-02-17T00:00:00.000Z',
    updatedAt: '2026-02-17T00:00:00.000Z',
    ...overrides,
  };
};

beforeEach(() => {
  mockedCreatePostgresDatabase.mockReset();
  mockedCreatePostgresDatabase.mockReturnValue(fakeDb);
  mockedCreateAuditLog.mockReset();
  mockedCreateAuditLog.mockResolvedValue(sampleAuditLogRecord());
  mockedFindTenantCanvasGradebookIntegration.mockReset();
  mockedFindTenantCanvasGradebookIntegration.mockResolvedValue(null);
  mockedUpsertTenantCanvasGradebookIntegration.mockReset();
  mockedUpdateTenantCanvasGradebookIntegrationTokens.mockReset();
  mockedSignCanvasOAuthStatePayload.mockReset();
  mockedValidateCanvasOAuthStateToken.mockReset();
  mockedExchangeCanvasAuthorizationCode.mockReset();
  mockedRefreshCanvasAccessToken.mockReset();
  mockedCreateGradebookProvider.mockReset();
});

describe('admin canvas gradebook integration routes', () => {
  it('upserts and returns redacted canvas integration config', async () => {
    const env = createEnv();
    mockedUpsertTenantCanvasGradebookIntegration.mockResolvedValue(sampleIntegration());

    const response = await app.request(
      '/v1/admin/tenants/tenant_123/lms/canvas/config',
      {
        method: 'PUT',
        headers: {
          authorization: 'Bearer bootstrap-secret',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          apiBaseUrl: 'https://canvas.example.edu',
          authorizationEndpoint: 'https://canvas.example.edu/login/oauth2/auth',
          tokenEndpoint: 'https://canvas.example.edu/login/oauth2/token',
          clientId: 'canvas-client-id',
          clientSecret: 'canvas-client-secret',
          scope: 'url:GET|/api/v1/courses',
        }),
      },
      env,
    );
    const body = await response.json<{
      integration: {
        clientId: string;
        hasClientSecret: boolean;
        hasAccessToken: boolean;
      };
    }>();

    expect(response.status).toBe(201);
    expect(body.integration.clientId).toBe('canvas-client-id');
    expect(body.integration.hasClientSecret).toBe(true);
    expect(body.integration.hasAccessToken).toBe(false);
    expect(mockedUpsertTenantCanvasGradebookIntegration).toHaveBeenCalledTimes(1);
  });

  it('builds canvas authorization URLs with signed state', async () => {
    const env = createEnv();
    mockedFindTenantCanvasGradebookIntegration.mockResolvedValue(sampleIntegration());
    mockedSignCanvasOAuthStatePayload.mockResolvedValue('signed-state-token');

    const response = await app.request(
      '/v1/admin/tenants/tenant_123/lms/canvas/oauth/authorize-url',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer bootstrap-secret',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      env,
    );
    const body = await response.json<{
      authorizationUrl: string;
      state: string;
      redirectUri: string;
    }>();

    expect(response.status).toBe(200);
    expect(body.state).toBe('signed-state-token');
    expect(body.authorizationUrl).toContain('response_type=code');
    expect(body.authorizationUrl).toContain('state=signed-state-token');
    expect(body.redirectUri).toContain('/v1/admin/tenants/tenant_123/lms/canvas/oauth/exchange');
  });

  it('exchanges OAuth codes and stores token material', async () => {
    const env = createEnv();
    mockedFindTenantCanvasGradebookIntegration.mockResolvedValue(sampleIntegration());
    mockedValidateCanvasOAuthStateToken.mockResolvedValue({
      status: 'ok',
      payload: {
        tenantId: 'tenant_123',
        nonce: 'nonce',
        issuedAt: '2026-02-17T00:00:00.000Z',
        expiresAt: '2026-02-17T00:10:00.000Z',
      },
    });
    mockedExchangeCanvasAuthorizationCode.mockResolvedValue({
      accessToken: 'canvas-access-token',
      refreshToken: 'canvas-refresh-token',
      expiresInSeconds: 3600,
      refreshTokenExpiresInSeconds: 7200,
    });
    mockedUpdateTenantCanvasGradebookIntegrationTokens.mockResolvedValue(
      sampleIntegration({
        accessToken: 'canvas-access-token',
        refreshToken: 'canvas-refresh-token',
        accessTokenExpiresAt: '2026-02-17T01:00:00.000Z',
        refreshTokenExpiresAt: '2026-02-17T02:00:00.000Z',
        connectedAt: '2026-02-17T00:00:00.000Z',
      }),
    );

    const response = await app.request(
      '/v1/admin/tenants/tenant_123/lms/canvas/oauth/exchange',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer bootstrap-secret',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          code: 'oauth-code',
          state: 'signed-state-token-12345',
        }),
      },
      env,
    );
    const body = await response.json<{
      status: string;
      integration: {
        hasAccessToken: boolean;
        hasRefreshToken: boolean;
      };
    }>();

    expect(response.status).toBe(200);
    expect(body.status).toBe('connected');
    expect(body.integration.hasAccessToken).toBe(true);
    expect(body.integration.hasRefreshToken).toBe(true);
    expect(mockedExchangeCanvasAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockedUpdateTenantCanvasGradebookIntegrationTokens).toHaveBeenCalledTimes(1);
  });

  it('returns gradebook snapshots from the configured provider', async () => {
    const env = createEnv();
    mockedFindTenantCanvasGradebookIntegration.mockResolvedValue(
      sampleIntegration({
        accessToken: 'canvas-access-token',
        connectedAt: '2026-02-17T00:00:00.000Z',
      }),
    );
    mockedCreateGradebookProvider.mockReturnValue({
      kind: 'canvas',
      listCourses: vi.fn().mockResolvedValue([{ courseId: 'course_123', title: 'CS 101' }]),
      listAssignments: vi.fn().mockResolvedValue([{ assignmentId: 'assignment_1' }]),
      listEnrollments: vi.fn().mockResolvedValue([{ learnerId: 'learner_1' }]),
      listSubmissions: vi.fn().mockResolvedValue([{ score: 95 }]),
      listGrades: vi.fn().mockResolvedValue([{ finalScore: 95 }]),
      listCompletions: vi.fn().mockResolvedValue([{ completed: true }]),
    } as unknown as ReturnType<typeof createGradebookProvider>);

    const response = await app.request(
      '/v1/admin/tenants/tenant_123/lms/canvas/gradebook/snapshot?courseId=course_123',
      {
        headers: {
          authorization: 'Bearer bootstrap-secret',
        },
      },
      env,
    );
    const body = await response.json<{
      provider: string;
      courses: unknown[];
      assignments: unknown[];
      badgeCriteriaFacts: {
        courseGradeFacts: unknown[];
      };
    }>();

    expect(response.status).toBe(200);
    expect(body.provider).toBe('canvas');
    expect(body.courses).toHaveLength(1);
    expect(body.assignments).toHaveLength(1);
    expect(body.badgeCriteriaFacts.courseGradeFacts).toHaveLength(1);
  });
});
