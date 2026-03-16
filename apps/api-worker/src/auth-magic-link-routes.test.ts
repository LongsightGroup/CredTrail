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
  requestMagicLink: ReturnType<typeof vi.fn>;
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
    requestMagicLink: vi.fn(),
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

interface MockedInternalAuthProvider {
  requestMagicLink: ReturnType<typeof vi.fn>;
  createMagicLinkSession: ReturnType<typeof vi.fn>;
  createLtiSession: ReturnType<typeof vi.fn>;
  resolveAuthenticatedPrincipal: ReturnType<typeof vi.fn>;
  resolveRequestedTenantContext: ReturnType<typeof vi.fn>;
  revokeCurrentSession: ReturnType<typeof vi.fn>;
}

const loadAppWithMockedHostedAuthProviders = async (options?: {
  requestMagicLinkResult?: {
    tenantId: string;
    email: string;
    deliveryStatus: 'sent' | 'skipped' | 'failed';
    expiresAt?: string | undefined;
    debugMagicLinkToken?: string | undefined;
    debugMagicLinkUrl?: string | undefined;
  };
  betterAuthInitiallyAuthenticated?: boolean;
  betterAuthPrincipal?: {
    userId: string;
    authSessionId: string;
    authMethod: 'better_auth';
    expiresAt: string;
  };
  betterAuthRequestedTenant?: {
    tenantId: string;
    source: 'route' | 'legacy_session';
    authoritative: boolean;
  };
}): Promise<{
  app: typeof app;
  betterAuthProvider: MockedInternalAuthProvider;
  legacyAuthProvider: MockedInternalAuthProvider;
}> => {
  vi.resetModules();

  const betterAuthPrincipal = options?.betterAuthPrincipal ?? {
    userId: 'usr_better',
    authSessionId: 'ba_ses_123',
    authMethod: 'better_auth' as const,
    expiresAt: '2026-02-18T22:00:00.000Z',
  };
  const betterAuthRequestedTenant = options?.betterAuthRequestedTenant ?? {
    tenantId: 'tenant_123',
    source: 'route' as const,
    authoritative: true,
  };
  let betterAuthAuthenticated = options?.betterAuthInitiallyAuthenticated ?? false;

  const betterAuthProvider: MockedInternalAuthProvider = {
    requestMagicLink: vi.fn(() =>
      Promise.resolve(
        options?.requestMagicLinkResult ?? {
          tenantId: 'tenant_123',
          email: 'learner@example.edu',
          deliveryStatus: 'sent' as const,
          expiresAt: '2026-02-18T12:10:00.000Z',
          debugMagicLinkToken: 'better-token-1234567890',
          debugMagicLinkUrl:
            'https://credtrail.test/auth/magic-link/verify?token=better-token-1234567890&next=%2Ftenants%2Ftenant_123%2Fadmin',
        },
      ),
    ),
    createMagicLinkSession: vi.fn((context: Parameters<typeof setCookie>[0]) => {
      betterAuthAuthenticated = true;
      setCookie(context, 'better-auth.session_token', 'better-session', {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
      });
      return Promise.resolve(betterAuthPrincipal);
    }),
    createLtiSession: vi.fn(),
    resolveAuthenticatedPrincipal: vi.fn(() =>
      Promise.resolve(betterAuthAuthenticated ? betterAuthPrincipal : null),
    ),
    resolveRequestedTenantContext: vi.fn(() =>
      Promise.resolve(betterAuthAuthenticated ? betterAuthRequestedTenant : null),
    ),
    revokeCurrentSession: vi.fn((context: Parameters<typeof deleteCookie>[0]) => {
      betterAuthAuthenticated = false;
      deleteCookie(context, 'better-auth.session_token', {
        path: '/',
      });
      return Promise.resolve();
    }),
  };

  const legacyAuthProvider: MockedInternalAuthProvider = {
    requestMagicLink: vi.fn(),
    createMagicLinkSession: vi.fn((context: Parameters<typeof setCookie>[0]) => {
      setCookie(context, 'credtrail_session', 'legacy-session', {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
      });
      return Promise.resolve({
        userId: 'usr_legacy',
        authSessionId: 'ses_legacy',
        authMethod: 'legacy_magic_link' as const,
        expiresAt: '2026-02-18T20:00:00.000Z',
      });
    }),
    createLtiSession: vi.fn(),
    resolveAuthenticatedPrincipal: vi.fn(() => Promise.resolve(null)),
    resolveRequestedTenantContext: vi.fn(() => Promise.resolve(null)),
    revokeCurrentSession: vi.fn((context: Parameters<typeof deleteCookie>[0]) => {
      deleteCookie(context, 'credtrail_session', {
        path: '/',
      });
      return Promise.resolve();
    }),
  };

  vi.doMock('./auth/better-auth-adapter', async () => {
    const actual =
      await vi.importActual<typeof import('./auth/better-auth-adapter')>(
        './auth/better-auth-adapter',
      );

    return {
      ...actual,
      createBetterAuthProvider: vi.fn(() => betterAuthProvider),
    };
  });

  vi.doMock('./auth/legacy-auth-adapter', async () => {
    const actual =
      await vi.importActual<typeof import('./auth/legacy-auth-adapter')>(
        './auth/legacy-auth-adapter',
      );

    return {
      ...actual,
      createLegacyAuthProvider: vi.fn(() => legacyAuthProvider),
      resolveLegacySessionRecord: vi.fn(() => Promise.resolve(null)),
    };
  });

  const { app: isolatedApp } = await import('./index');

  return {
    app: isolatedApp,
    betterAuthProvider,
    legacyAuthProvider,
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
  vi.doUnmock('./auth/better-auth-adapter');
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

  it('delegates hosted magic-link requests to Better Auth while preserving user and membership upserts', async () => {
    mockedEnsureTenantMembership.mockResolvedValue({
      membership: {
        tenantId: 'tenant_123',
        userId: 'usr_123',
        role: 'viewer',
        createdAt: '2026-02-18T12:00:00.000Z',
        updatedAt: '2026-02-18T12:00:00.000Z',
      },
      created: true,
    });

    const { app: isolatedApp, betterAuthProvider, legacyAuthProvider } =
      await loadAppWithMockedHostedAuthProviders();

    const response = await isolatedApp.request(
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
      tenantId: string;
      email: string;
      expiresAt: string;
      magicLinkToken: string;
      magicLinkUrl: string;
    }>();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      status: 'sent',
      deliveryStatus: 'sent',
      tenantId: 'tenant_123',
      email: 'learner@example.edu',
      expiresAt: '2026-02-18T12:10:00.000Z',
      magicLinkToken: 'better-token-1234567890',
      magicLinkUrl:
        'https://credtrail.test/auth/magic-link/verify?token=better-token-1234567890&next=%2Ftenants%2Ftenant_123%2Fadmin',
    });
    expect(mockedUpsertUserByEmail).toHaveBeenCalledWith(fakeDb, 'learner@example.edu');
    expect(mockedEnsureTenantMembership).toHaveBeenCalledWith(fakeDb, 'tenant_123', 'usr_123');
    expect(mockedCreateAuditLog).toHaveBeenCalledTimes(1);
    expect(betterAuthProvider.requestMagicLink).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: 'tenant_123',
        email: 'learner@example.edu',
      }),
    );
    expect(legacyAuthProvider.requestMagicLink).not.toHaveBeenCalled();
    expect(mockedCreateMagicLinkToken).not.toHaveBeenCalled();
  });

  it('delegates JSON verify to Better Auth-backed session creation instead of legacy token tables', async () => {
    const { app: isolatedApp, betterAuthProvider, legacyAuthProvider } =
      await loadAppWithMockedHostedAuthProviders();

    const response = await isolatedApp.request(
      '/v1/auth/magic-link/verify',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          token: 'better-token-1234567890',
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
      userId: 'usr_better',
      expiresAt: '2026-02-18T22:00:00.000Z',
    });
    expect(response.headers.get('set-cookie')).toContain('better-auth.session_token=better-session');
    expect(betterAuthProvider.createMagicLinkSession).toHaveBeenCalledTimes(1);
    expect(legacyAuthProvider.createMagicLinkSession).not.toHaveBeenCalled();
    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(mockedFindMagicLinkTokenByHash).not.toHaveBeenCalled();
    expect(mockedMarkMagicLinkTokenUsed).not.toHaveBeenCalled();
  });

  it('delegates browser GET verify to Better Auth-backed session creation instead of legacy token tables', async () => {
    const { app: isolatedApp, betterAuthProvider, legacyAuthProvider } =
      await loadAppWithMockedHostedAuthProviders();

    const response = await isolatedApp.request(
      '/auth/magic-link/verify?token=better-token-1234567890&next=%2Ftenants%2Ftenant_123%2Fadmin',
      undefined,
      createEnv('production'),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/tenants/tenant_123/admin');
    expect(response.headers.get('set-cookie')).toContain('better-auth.session_token=better-session');
    expect(betterAuthProvider.createMagicLinkSession).toHaveBeenCalledTimes(1);
    expect(legacyAuthProvider.createMagicLinkSession).not.toHaveBeenCalled();
    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(mockedFindMagicLinkTokenByHash).not.toHaveBeenCalled();
    expect(mockedMarkMagicLinkTokenUsed).not.toHaveBeenCalled();
  });

  it('uses Better Auth-backed session inspection and logout without falling back to legacy session tables', async () => {
    const { app: isolatedApp, betterAuthProvider, legacyAuthProvider } =
      await loadAppWithMockedHostedAuthProviders({
        betterAuthInitiallyAuthenticated: true,
      });

    const sessionResponse = await isolatedApp.request(
      '/v1/auth/session',
      {
        headers: {
          Cookie: 'better-auth.session_token=better-session',
        },
      },
      createEnv('production'),
    );
    const sessionBody = await sessionResponse.json<{
      status: string;
      tenantId: string;
      userId: string;
      expiresAt: string;
    }>();

    expect(sessionResponse.status).toBe(200);
    expect(sessionBody).toEqual({
      status: 'authenticated',
      tenantId: 'tenant_123',
      userId: 'usr_better',
      expiresAt: '2026-02-18T22:00:00.000Z',
    });
    expect(betterAuthProvider.resolveAuthenticatedPrincipal).toHaveBeenCalled();
    expect(legacyAuthProvider.resolveAuthenticatedPrincipal).not.toHaveBeenCalled();

    const logoutResponse = await isolatedApp.request(
      '/v1/auth/logout',
      {
        method: 'POST',
        headers: {
          Cookie: 'better-auth.session_token=better-session',
        },
      },
      createEnv('production'),
    );
    const logoutBody = await logoutResponse.json<{
      status: string;
    }>();

    expect(logoutResponse.status).toBe(200);
    expect(logoutBody).toEqual({
      status: 'signed_out',
    });
    expect(logoutResponse.headers.get('set-cookie')).toContain('better-auth.session_token=');
    expect(betterAuthProvider.revokeCurrentSession).toHaveBeenCalledTimes(1);
    expect(legacyAuthProvider.revokeCurrentSession).not.toHaveBeenCalled();
    expect(mockedRevokeSessionByHash).not.toHaveBeenCalled();

    const afterLogoutResponse = await isolatedApp.request(
      '/v1/auth/session',
      {
        headers: {
          Cookie: 'better-auth.session_token=better-session',
        },
      },
      createEnv('production'),
    );
    const afterLogoutBody = await afterLogoutResponse.json<{
      error: string;
    }>();

    expect(afterLogoutResponse.status).toBe(401);
    expect(afterLogoutBody).toEqual({
      error: 'Not authenticated',
    });
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
