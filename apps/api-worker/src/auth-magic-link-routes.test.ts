import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteCookie, setCookie } from 'hono/cookie';

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    createAuditLog: vi.fn(),
    createMagicLinkToken: vi.fn(),
    createSession: vi.fn(),
    ensureTenantMembership: vi.fn(),
    findActiveSessionByHash: vi.fn(),
    findMagicLinkTokenByHash: vi.fn(),
    isMagicLinkTokenValid: vi.fn(),
    markMagicLinkTokenUsed: vi.fn(),
    revokeSessionByHash: vi.fn(),
    touchSession: vi.fn(),
    upsertUserByEmail: vi.fn(),
  };
});

vi.mock('@credtrail/db/postgres', () => {
  return {
    createPostgresDatabase: vi.fn(),
  };
});

import {
  createAuditLog,
  createMagicLinkToken,
  createSession,
  ensureTenantMembership,
  findActiveSessionByHash,
  findMagicLinkTokenByHash,
  isMagicLinkTokenValid,
  markMagicLinkTokenUsed,
  revokeSessionByHash,
  touchSession,
  upsertUserByEmail,
  type SessionRecord,
  type SqlDatabase,
} from '@credtrail/db';
import { createPostgresDatabase } from '@credtrail/db/postgres';

import { app } from './index';

const mockedCreateAuditLog = vi.mocked(createAuditLog);
const mockedCreateMagicLinkToken = vi.mocked(createMagicLinkToken);
const mockedCreateSession = vi.mocked(createSession);
const mockedEnsureTenantMembership = vi.mocked(ensureTenantMembership);
const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedFindMagicLinkTokenByHash = vi.mocked(findMagicLinkTokenByHash);
const mockedIsMagicLinkTokenValid = vi.mocked(isMagicLinkTokenValid);
const mockedMarkMagicLinkTokenUsed = vi.mocked(markMagicLinkTokenUsed);
const mockedRevokeSessionByHash = vi.mocked(revokeSessionByHash);
const mockedTouchSession = vi.mocked(touchSession);
const mockedUpsertUserByEmail = vi.mocked(upsertUserByEmail);
const mockedCreatePostgresDatabase = vi.mocked(createPostgresDatabase);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const createEnv = (
  appEnv: string,
): {
  APP_ENV: string;
  DATABASE_URL: string;
  BADGE_OBJECTS: R2Bucket;
  PLATFORM_DOMAIN: string;
} => {
  return {
    APP_ENV: appEnv,
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
    expiresAt: '2026-02-18T22:00:00.000Z',
    lastSeenAt: '2026-02-18T12:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-02-18T12:00:00.000Z',
    ...overrides,
  };
};

interface MockedLegacyAuthProvider {
  createMagicLinkSession: ReturnType<typeof vi.fn>;
  createLtiSession: ReturnType<typeof vi.fn>;
  resolveAuthenticatedPrincipal: ReturnType<typeof vi.fn>;
  resolveRequestedTenantContext: ReturnType<typeof vi.fn>;
  revokeCurrentSession: ReturnType<typeof vi.fn>;
}

const loadAppWithMockedLegacyAuthProvider = async (options?: {
  principal?: {
    userId: string;
    authSessionId: string;
    authMethod: 'legacy_magic_link' | 'legacy_lti';
    expiresAt: string;
  };
  requestedTenant?: {
    tenantId: string;
    source: 'route' | 'legacy_session';
    authoritative: boolean;
  };
}): Promise<{
  app: typeof app;
  provider: MockedLegacyAuthProvider;
}> => {
  vi.resetModules();
  const principal = options?.principal ?? {
    userId: 'usr_adapter',
    authSessionId: 'ses_adapter',
    authMethod: 'legacy_magic_link' as const,
    expiresAt: '2026-02-18T22:00:00.000Z',
  };
  const requestedTenant = options?.requestedTenant ?? {
    tenantId: 'tenant_123',
    source: 'legacy_session' as const,
    authoritative: false,
  };
  const provider: MockedLegacyAuthProvider = {
    createMagicLinkSession: vi.fn((context: Parameters<typeof setCookie>[0]) => {
      setCookie(context, 'credtrail_session', 'adapter-session', {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
      });
      return Promise.resolve(principal);
    }),
    createLtiSession: vi.fn(),
    resolveAuthenticatedPrincipal: vi.fn(() => Promise.resolve(principal)),
    resolveRequestedTenantContext: vi.fn(() => Promise.resolve(requestedTenant)),
    revokeCurrentSession: vi.fn((context: Parameters<typeof deleteCookie>[0]) => {
      deleteCookie(context, 'credtrail_session', {
        path: '/',
      });
      return Promise.resolve();
    }),
  };

  vi.doMock('./auth/legacy-auth-adapter', async () => {
    const actual =
      await vi.importActual<typeof import('./auth/legacy-auth-adapter')>(
        './auth/legacy-auth-adapter',
      );

    return {
      ...actual,
      createLegacyAuthProvider: vi.fn(() => provider),
      resolveLegacySessionRecord: vi.fn(() => Promise.resolve(null)),
    };
  });

  const { app: isolatedApp } = await import('./index');

  return {
    app: isolatedApp,
    provider,
  };
};

beforeEach(() => {
  mockedCreatePostgresDatabase.mockReset();
  mockedCreatePostgresDatabase.mockReturnValue(fakeDb);
  mockedCreateAuditLog.mockReset();
  mockedCreateAuditLog.mockResolvedValue({
    id: 'audit_123',
    tenantId: 'tenant_123',
    actorUserId: 'usr_123',
    action: 'membership.role_assigned',
    targetType: 'membership',
    targetId: 'tenant_123:usr_123',
    metadataJson: null,
    occurredAt: '2026-02-18T12:00:00.000Z',
    createdAt: '2026-02-18T12:00:00.000Z',
  });
  mockedCreateMagicLinkToken.mockReset();
  mockedCreateMagicLinkToken.mockResolvedValue({
    id: 'mlt_123',
    tenantId: 'tenant_123',
    userId: 'usr_123',
    magicTokenHash: 'hash_123',
    expiresAt: '2026-02-18T12:10:00.000Z',
    usedAt: null,
    createdAt: '2026-02-18T12:00:00.000Z',
  });
  mockedCreateSession.mockReset();
  mockedCreateSession.mockResolvedValue(sampleSession());
  mockedEnsureTenantMembership.mockReset();
  mockedEnsureTenantMembership.mockResolvedValue({
    membership: {
      tenantId: 'tenant_123',
      userId: 'usr_123',
      role: 'viewer',
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:00:00.000Z',
    },
    created: false,
  });
  mockedFindActiveSessionByHash.mockReset();
  mockedFindMagicLinkTokenByHash.mockReset();
  mockedIsMagicLinkTokenValid.mockReset();
  mockedMarkMagicLinkTokenUsed.mockReset();
  mockedMarkMagicLinkTokenUsed.mockResolvedValue();
  mockedRevokeSessionByHash.mockReset();
  mockedRevokeSessionByHash.mockResolvedValue();
  mockedTouchSession.mockReset();
  mockedTouchSession.mockResolvedValue();
  mockedUpsertUserByEmail.mockReset();
  mockedUpsertUserByEmail.mockResolvedValue({
    id: 'usr_123',
    email: 'learner@example.edu',
  });
});

afterEach(() => {
  vi.doUnmock('./auth/legacy-auth-adapter');
});

describe('hosted auth adapter wiring', () => {
  it('delegates JSON magic-link verification to the internal auth provider', async () => {
    const { app: isolatedApp, provider } = await loadAppWithMockedLegacyAuthProvider();

    const response = await isolatedApp.request(
      '/v1/auth/magic-link/verify',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          token: 'adapter-token-1234567890',
        }),
      },
      createEnv('production'),
    );
    const body = await response.json<{
      status: string;
      tenantId: string;
      userId: string;
      expiresAt: string;
    }>();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'authenticated',
      tenantId: 'tenant_123',
      userId: 'usr_adapter',
      expiresAt: '2026-02-18T22:00:00.000Z',
    });
    expect(response.headers.get('set-cookie')).toContain('credtrail_session=adapter-session');
    expect(provider.createMagicLinkSession).toHaveBeenCalledTimes(1);
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it('delegates browser magic-link verification to the internal auth provider', async () => {
    const { app: isolatedApp, provider } = await loadAppWithMockedLegacyAuthProvider();

    const response = await isolatedApp.request(
      '/auth/magic-link/verify?token=adapter-token-1234567890',
      undefined,
      createEnv('production'),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/tenants/tenant_123/admin');
    expect(response.headers.get('set-cookie')).toContain('credtrail_session=adapter-session');
    expect(provider.createMagicLinkSession).toHaveBeenCalledTimes(1);
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it('delegates session inspection to the internal auth provider', async () => {
    const { app: isolatedApp, provider } = await loadAppWithMockedLegacyAuthProvider();

    const response = await isolatedApp.request(
      '/v1/auth/session',
      {
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      createEnv('production'),
    );
    const body = await response.json<{
      status: string;
      tenantId: string;
      userId: string;
      expiresAt: string;
    }>();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'authenticated',
      tenantId: 'tenant_123',
      userId: 'usr_adapter',
      expiresAt: '2026-02-18T22:00:00.000Z',
    });
    expect(provider.resolveAuthenticatedPrincipal).toHaveBeenCalledTimes(1);
    expect(provider.resolveRequestedTenantContext).toHaveBeenCalledTimes(1);
  });

  it('delegates logout to the internal auth provider', async () => {
    const { app: isolatedApp, provider } = await loadAppWithMockedLegacyAuthProvider();

    const response = await isolatedApp.request(
      '/v1/auth/logout',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      createEnv('production'),
    );
    const body = await response.json<{
      status: string;
    }>();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'signed_out',
    });
    expect(response.headers.get('set-cookie')).toContain('credtrail_session=');
    expect(provider.revokeCurrentSession).toHaveBeenCalledTimes(1);
    expect(mockedRevokeSessionByHash).not.toHaveBeenCalled();
  });
});

describe('magic-link auth routes', () => {
  it('renders login page with magic-link form and linked page assets', async () => {
    const env = createEnv('production');
    const response = await app.request(
      '/login?tenantId=sakai&next=%2Ftenants%2Fsakai%2Fadmin',
      undefined,
      env,
    );
    const body = await response.text();
    const stylesheetMatch = /<link rel="stylesheet" href="([^"]*\/assets\/ui\/auth-login\.[^"]+\.css)"/.exec(
      body,
    );
    const scriptMatch = /<script defer src="([^"]*\/assets\/ui\/auth-login\.[^"]+\.js)"><\/script>/.exec(
      body,
    );
    const stylesheetPath =
      stylesheetMatch?.[1] ?? null;
    const scriptPath = scriptMatch?.[1] ?? null;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(body).toContain('Access your CredTrail tenant');
    expect(body).toContain('Email me a sign-in link');
    expect(body).toContain('The sign-in email comes from CredTrail and expires in 10 minutes.');
    expect(body).toContain('id="magic-link-login-form"');
    expect(body).toContain('name="tenantId"');
    expect(body).toContain('value="sakai"');
    expect(body).toContain('/assets/ui/foundation.');
    expect(body).not.toContain('.ct-login__hero {');
    expect(stylesheetPath).not.toBeNull();
    expect(scriptPath).not.toBeNull();

    const stylesheetResponse = await app.request(stylesheetPath ?? '', undefined, env);
    const scriptResponse = await app.request(scriptPath ?? '', undefined, env);

    expect(stylesheetResponse.status).toBe(200);
    expect(stylesheetResponse.headers.get('content-type')).toContain('text/css');
    expect(stylesheetResponse.headers.get('cache-control')).toContain('immutable');
    expect(scriptResponse.status).toBe(200);
    expect(scriptResponse.headers.get('content-type')).toContain('text/javascript');
    expect(scriptResponse.headers.get('cache-control')).toContain('immutable');
  });

  it('returns token + url in development mode for magic-link request', async () => {
    const response = await app.request(
      '/v1/auth/magic-link/request',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: 'tenant_123',
          email: 'learner@example.edu',
        }),
      },
      createEnv('development'),
    );
    const body = await response.json<{
      status: string;
      deliveryStatus: string;
      magicLinkToken: string;
      magicLinkUrl: string;
    }>();

    expect(response.status).toBe(202);
    expect(body.status).toBe('sent');
    expect(typeof body.magicLinkToken).toBe('string');
    expect(body.magicLinkToken.length).toBeGreaterThan(0);
    expect(body.magicLinkUrl).toContain('/auth/magic-link/verify?token=');
    expect(body.magicLinkUrl).toContain('next=');
  });

  it('supports browser GET verify and sets session cookie before redirect', async () => {
    mockedFindMagicLinkTokenByHash.mockResolvedValue({
      id: 'mlt_123',
      tenantId: 'tenant_123',
      userId: 'usr_123',
      magicTokenHash: 'hash_123',
      expiresAt: '2026-02-18T13:00:00.000Z',
      usedAt: null,
      createdAt: '2026-02-18T12:00:00.000Z',
    });
    mockedIsMagicLinkTokenValid.mockReturnValue(true);
    mockedCreateSession.mockResolvedValue(sampleSession());

    const response = await app.request(
      '/auth/magic-link/verify?token=test-token&next=%2Ftenants%2Ftenant_123%2Fadmin',
      undefined,
      createEnv('production'),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/tenants/tenant_123/admin');
    expect(response.headers.get('set-cookie')).toContain('credtrail_session=');
    expect(mockedMarkMagicLinkTokenUsed).toHaveBeenCalledTimes(1);
  });

  it('returns authenticated session details for the current session cookie', async () => {
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());

    const response = await app.request(
      '/v1/auth/session',
      {
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      createEnv('production'),
    );
    const body = await response.json<{
      status: string;
      tenantId: string;
      userId: string;
      expiresAt: string;
    }>();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'authenticated',
      tenantId: 'tenant_123',
      userId: 'usr_123',
      expiresAt: '2026-02-18T22:00:00.000Z',
    });
    expect(mockedTouchSession).toHaveBeenCalledWith(fakeDb, 'ses_123', expect.any(String));
  });

  it('revokes the current session on logout and clears the session cookie', async () => {
    const response = await app.request(
      '/v1/auth/logout',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      createEnv('production'),
    );
    const body = await response.json<{
      status: string;
    }>();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'signed_out',
    });
    expect(response.headers.get('set-cookie')).toContain('credtrail_session=');
    expect(mockedRevokeSessionByHash).toHaveBeenCalledWith(
      fakeDb,
      expect.any(String),
      expect.any(String),
    );
  });
});
