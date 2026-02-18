import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  findMagicLinkTokenByHash,
  isMagicLinkTokenValid,
  markMagicLinkTokenUsed,
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
const mockedFindMagicLinkTokenByHash = vi.mocked(findMagicLinkTokenByHash);
const mockedIsMagicLinkTokenValid = vi.mocked(isMagicLinkTokenValid);
const mockedMarkMagicLinkTokenUsed = vi.mocked(markMagicLinkTokenUsed);
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
  mockedFindMagicLinkTokenByHash.mockReset();
  mockedIsMagicLinkTokenValid.mockReset();
  mockedMarkMagicLinkTokenUsed.mockReset();
  mockedMarkMagicLinkTokenUsed.mockResolvedValue();
  mockedUpsertUserByEmail.mockReset();
  mockedUpsertUserByEmail.mockResolvedValue({
    id: 'usr_123',
    email: 'learner@example.edu',
  });
});

describe('magic-link auth routes', () => {
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
});
