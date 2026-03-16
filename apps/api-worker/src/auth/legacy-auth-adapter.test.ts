import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    findActiveSessionByHash: vi.fn(),
    revokeSessionByHash: vi.fn(),
    touchSession: vi.fn(),
  };
});

import {
  findActiveSessionByHash,
  revokeSessionByHash,
  touchSession,
  type SessionRecord,
  type SqlDatabase,
} from '@credtrail/db';
import { resolveAuthenticatedPrincipal, revokeCurrentSession } from './legacy-auth-adapter';

interface FakeBindings {
  APP_ENV?: string;
}

interface FakeContext {
  env: FakeBindings;
  sessionToken?: string;
  clearedSessionCookie: boolean;
}

const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedRevokeSessionByHash = vi.mocked(revokeSessionByHash);
const mockedTouchSession = vi.mocked(touchSession);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const sampleSession = (overrides?: Partial<SessionRecord>): SessionRecord => {
  return {
    id: 'ses_123',
    tenantId: 'tenant_123',
    userId: 'usr_123',
    sessionTokenHash: 'session-token-hash',
    expiresAt: '2026-02-18T22:00:00.000Z',
    lastSeenAt: '2026-02-18T12:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-02-18T12:00:00.000Z',
    ...overrides,
  };
};

const createContext = (sessionToken?: string): FakeContext => {
  return {
    env: {},
    ...(sessionToken === undefined ? {} : { sessionToken }),
    clearedSessionCookie: false,
  };
};

const createAdapterInput = () => {
  return {
    resolveDatabase: () => fakeDb,
    readSessionToken: (context: FakeContext) => context.sessionToken,
    clearSessionCookie: (context: FakeContext) => {
      context.clearedSessionCookie = true;
    },
    sha256Hex: vi.fn(async (value: string) => `hashed:${value}`),
  };
};

beforeEach(() => {
  mockedFindActiveSessionByHash.mockReset();
  mockedRevokeSessionByHash.mockReset();
  mockedRevokeSessionByHash.mockResolvedValue();
  mockedTouchSession.mockReset();
  mockedTouchSession.mockResolvedValue();
});

describe('legacy auth adapter', () => {
  it('returns null principal when the session cookie is missing', async () => {
    const context = createContext();
    const principal = await resolveAuthenticatedPrincipal(context, createAdapterInput());

    expect(principal).toBeNull();
    expect(context.clearedSessionCookie).toBe(false);
    expect(mockedFindActiveSessionByHash).not.toHaveBeenCalled();
    expect(mockedTouchSession).not.toHaveBeenCalled();
  });

  it('clears stale cookies and resolves a null principal', async () => {
    const context = createContext('stale-token');

    mockedFindActiveSessionByHash.mockResolvedValue(null);

    const principal = await resolveAuthenticatedPrincipal(context, createAdapterInput());

    expect(principal).toBeNull();
    expect(context.clearedSessionCookie).toBe(true);
    expect(mockedFindActiveSessionByHash).toHaveBeenCalledWith(
      fakeDb,
      'hashed:stale-token',
      expect.any(String),
    );
  });

  it('maps valid legacy sessions to authenticated principals and touches the session', async () => {
    const context = createContext('live-token');

    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());

    const principal = await resolveAuthenticatedPrincipal(context, createAdapterInput());

    expect(principal).toEqual({
      userId: 'usr_123',
      authSessionId: 'ses_123',
      authMethod: 'legacy_magic_link',
      expiresAt: '2026-02-18T22:00:00.000Z',
    });
    expect(mockedTouchSession).toHaveBeenCalledWith(fakeDb, 'ses_123', expect.any(String));
  });

  it('revokes the current session and clears the cookie on logout', async () => {
    const context = createContext('live-token');

    await revokeCurrentSession(context, createAdapterInput());

    expect(context.clearedSessionCookie).toBe(true);
    expect(mockedRevokeSessionByHash).toHaveBeenCalledWith(
      fakeDb,
      'hashed:live-token',
      expect.any(String),
    );
  });
});
