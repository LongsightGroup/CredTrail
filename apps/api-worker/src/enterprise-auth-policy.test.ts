import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedFindTenantAuthPolicy,
  mockedUpsertTenantAuthPolicy,
  mockedListTenantAuthProviders,
  mockedCreateTenantAuthProvider,
  mockedUpdateTenantAuthProvider,
  mockedDeleteTenantAuthProvider,
} = vi.hoisted(() => {
  return {
    mockedFindTenantAuthPolicy: vi.fn(),
    mockedUpsertTenantAuthPolicy: vi.fn(),
    mockedListTenantAuthProviders: vi.fn(),
    mockedCreateTenantAuthProvider: vi.fn(),
    mockedUpdateTenantAuthProvider: vi.fn(),
    mockedDeleteTenantAuthProvider: vi.fn(),
  };
});

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    createAuditLog: vi.fn(),
    findActiveSessionByHash: vi.fn(),
    findTenantMembership: vi.fn(),
    findTenantById: vi.fn(),
    touchSession: vi.fn(),
    findTenantAuthPolicy: mockedFindTenantAuthPolicy,
    upsertTenantAuthPolicy: mockedUpsertTenantAuthPolicy,
    listTenantAuthProviders: mockedListTenantAuthProviders,
    createTenantAuthProvider: mockedCreateTenantAuthProvider,
    updateTenantAuthProvider: mockedUpdateTenantAuthProvider,
    deleteTenantAuthProvider: mockedDeleteTenantAuthProvider,
  };
});

vi.mock('@credtrail/db/postgres', () => {
  return {
    createPostgresDatabase: vi.fn(),
  };
});

import {
  createAuditLog,
  findActiveSessionByHash,
  findTenantMembership,
  findTenantById,
  touchSession,
  type AuditLogRecord,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRecord,
  type TenantRecord,
} from '@credtrail/db';
import { createPostgresDatabase } from '@credtrail/db/postgres';

import { app } from './index';

interface ErrorResponse {
  error: string;
}

const mockedCreateAuditLog = vi.mocked(createAuditLog);
const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedFindTenantMembership = vi.mocked(findTenantMembership);
const mockedFindTenantById = vi.mocked(findTenantById);
const mockedTouchSession = vi.mocked(touchSession);
const mockedCreatePostgresDatabase = vi.mocked(createPostgresDatabase);
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

const sampleSession = (overrides?: { tenantId?: string; userId?: string }): SessionRecord => {
  return {
    id: 'ses_123',
    tenantId: overrides?.tenantId ?? 'tenant_123',
    userId: overrides?.userId ?? 'usr_admin',
    sessionTokenHash: 'session_hash',
    expiresAt: '2026-03-16T23:00:00.000Z',
    lastSeenAt: '2026-03-16T12:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-03-16T12:00:00.000Z',
  };
};

const sampleMembership = (role: TenantMembershipRecord['role']): TenantMembershipRecord => {
  return {
    tenantId: 'tenant_123',
    userId: 'usr_admin',
    role,
    createdAt: '2026-03-16T12:00:00.000Z',
    updatedAt: '2026-03-16T12:00:00.000Z',
  };
};

const sampleTenant = (overrides?: Partial<TenantRecord>): TenantRecord => {
  return {
    id: 'tenant_123',
    slug: 'tenant-123',
    displayName: 'Tenant 123',
    planTier: 'enterprise',
    issuerDomain: 'tenant-123.credtrail.test',
    didWeb: 'did:web:credtrail.test:tenant_123',
    isActive: true,
    createdAt: '2026-03-16T12:00:00.000Z',
    updatedAt: '2026-03-16T12:00:00.000Z',
    ...overrides,
  };
};

const sampleAuditLog = (overrides?: Partial<AuditLogRecord>): AuditLogRecord => {
  return {
    id: 'aud_123',
    tenantId: 'tenant_123',
    actorUserId: 'usr_admin',
    action: 'tenant.auth_policy_upserted',
    targetType: 'tenant_auth_policy',
    targetId: 'tenant_123',
    metadataJson: null,
    occurredAt: '2026-03-16T12:00:00.000Z',
    createdAt: '2026-03-16T12:00:00.000Z',
    ...overrides,
  };
};

const sampleAuthPolicy = (overrides?: Record<string, unknown>): Record<string, unknown> => {
  return {
    tenantId: 'tenant_123',
    loginMode: 'hybrid',
    breakGlassEnabled: true,
    localMfaRequired: true,
    defaultProviderId: 'tap_oidc',
    enforceForRoles: 'all_users',
    createdAt: '2026-03-16T12:00:00.000Z',
    updatedAt: '2026-03-16T12:00:00.000Z',
    ...overrides,
  };
};

const sampleAuthProvider = (overrides?: Record<string, unknown>): Record<string, unknown> => {
  return {
    id: 'tap_oidc',
    tenantId: 'tenant_123',
    protocol: 'oidc',
    label: 'Campus OIDC',
    enabled: true,
    isDefault: true,
    configJson:
      '{"issuer":"https://idp.example.edu","clientId":"credtrail","clientSecret":"secret"}',
    createdAt: '2026-03-16T12:00:00.000Z',
    updatedAt: '2026-03-16T12:00:00.000Z',
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
  mockedFindTenantMembership.mockResolvedValue(sampleMembership('admin'));
  mockedFindTenantById.mockReset();
  mockedFindTenantById.mockResolvedValue(sampleTenant());
  mockedCreateAuditLog.mockReset();
  mockedCreateAuditLog.mockResolvedValue(sampleAuditLog());
  mockedFindTenantAuthPolicy.mockReset();
  mockedFindTenantAuthPolicy.mockResolvedValue(sampleAuthPolicy());
  mockedUpsertTenantAuthPolicy.mockReset();
  mockedUpsertTenantAuthPolicy.mockResolvedValue(sampleAuthPolicy({ loginMode: 'sso_required' }));
  mockedListTenantAuthProviders.mockReset();
  mockedListTenantAuthProviders.mockResolvedValue([
    sampleAuthProvider(),
    sampleAuthProvider({
      id: 'tap_saml',
      protocol: 'saml',
      label: 'Campus SAML',
      isDefault: false,
      configJson:
        '{"ssoLoginUrl":"https://idp.example.edu/sso","idpEntityId":"https://idp.example.edu/entity"}',
    }),
  ]);
  mockedCreateTenantAuthProvider.mockReset();
  mockedCreateTenantAuthProvider.mockResolvedValue(sampleAuthProvider());
  mockedUpdateTenantAuthProvider.mockReset();
  mockedUpdateTenantAuthProvider.mockResolvedValue(
    sampleAuthProvider({
      id: 'tap_saml',
      protocol: 'saml',
      label: 'Campus SAML',
      enabled: false,
      isDefault: false,
    }),
  );
  mockedDeleteTenantAuthProvider.mockReset();
  mockedDeleteTenantAuthProvider.mockResolvedValue(true);
});

describe('enterprise auth policy governance', () => {
  it('reads and updates enterprise tenant auth policy with audit logging', async () => {
    const env = createEnv();

    const getResponse = await app.request(
      '/v1/tenants/tenant_123/auth-policy',
      {
        method: 'GET',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );

    expect(getResponse.status).toBe(200);
    const getBody = await getResponse.json<Record<string, unknown>>();
    expect(getBody.loginMode).toBe('hybrid');
    expect(getBody.defaultProviderId).toBe('tap_oidc');

    const putResponse = await app.request(
      '/v1/tenants/tenant_123/auth-policy',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'credtrail_session=session-token',
        },
        body: JSON.stringify({
          loginMode: 'sso_required',
          breakGlassEnabled: true,
          localMfaRequired: true,
          defaultProviderId: 'tap_oidc',
          enforceForRoles: 'all_users',
        }),
      },
      env,
    );

    expect(putResponse.status).toBe(200);
    const putBody = await putResponse.json<Record<string, unknown>>();
    expect(putBody.loginMode).toBe('sso_required');
    expect(mockedCreateAuditLog).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({
        tenantId: 'tenant_123',
        actorUserId: 'usr_admin',
        action: 'tenant.auth_policy_upserted',
        targetType: 'tenant_auth_policy',
        targetId: 'tenant_123',
      }),
    );
  });

  it('manages provider-neutral enterprise auth providers with audit logging', async () => {
    const env = createEnv();

    const listResponse = await app.request(
      '/v1/tenants/tenant_123/auth-providers',
      {
        method: 'GET',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json<Array<Record<string, unknown>>>();
    expect(listBody).toHaveLength(2);
    expect(listBody[0]?.protocol).toBe('oidc');
    expect(listBody[1]?.protocol).toBe('saml');

    const createResponse = await app.request(
      '/v1/tenants/tenant_123/auth-providers',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'credtrail_session=session-token',
        },
        body: JSON.stringify({
          protocol: 'oidc',
          label: 'Campus OIDC',
          enabled: true,
          isDefault: true,
          configJson:
            '{"issuer":"https://idp.example.edu","clientId":"credtrail","clientSecret":"secret"}',
        }),
      },
      env,
    );

    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json<Record<string, unknown>>();
    expect(createBody.label).toBe('Campus OIDC');
    expect(mockedCreateAuditLog).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({
        action: 'tenant.auth_provider_created',
        targetType: 'tenant_auth_provider',
      }),
    );

    const updateResponse = await app.request(
      '/v1/tenants/tenant_123/auth-providers/tap_saml',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'credtrail_session=session-token',
        },
        body: JSON.stringify({
          protocol: 'saml',
          label: 'Campus SAML',
          enabled: false,
          isDefault: false,
          configJson:
            '{"ssoLoginUrl":"https://idp.example.edu/sso","idpEntityId":"https://idp.example.edu/entity"}',
        }),
      },
      env,
    );

    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json<Record<string, unknown>>();
    expect(updateBody.enabled).toBe(false);

    const deleteResponse = await app.request(
      '/v1/tenants/tenant_123/auth-providers/tap_saml',
      {
        method: 'DELETE',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );

    expect(deleteResponse.status).toBe(200);
    const deleteBody = await deleteResponse.json<Record<string, unknown>>();
    expect(deleteBody.removed).toBe(true);
    expect(mockedCreateAuditLog).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({
        action: 'tenant.auth_provider_deleted',
        targetType: 'tenant_auth_provider',
        targetId: 'tap_saml',
      }),
    );
  });

  it('keeps enterprise auth governance gated behind enterprise plan checks', async () => {
    const env = createEnv();
    mockedFindTenantById.mockResolvedValue(sampleTenant({ planTier: 'team' }));

    const response = await app.request(
      '/v1/tenants/tenant_123/auth-providers',
      {
        method: 'GET',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );

    expect(response.status).toBe(403);
    const body = await response.json<ErrorResponse>();
    expect(body.error).toContain('enterprise');
  });
});
