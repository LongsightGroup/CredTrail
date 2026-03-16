import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    createAuthIdentityLink: vi.fn(),
    findAuthIdentityLinkByAuthUserId: vi.fn(),
    findAuthIdentityLinkByCredtrailUserId: vi.fn(),
    findUserByEmail: vi.fn(),
  };
});

import {
  createAuthIdentityLink,
  findAuthIdentityLinkByAuthUserId,
  findAuthIdentityLinkByCredtrailUserId,
  findUserByEmail,
  type SqlDatabase,
} from '@credtrail/db';
import { resolveAuthenticatedPrincipal } from './better-auth-adapter';

interface FakeBindings {
  APP_ENV?: string;
}

interface FakeContext {
  env: FakeBindings;
}

const mockedCreateAuthIdentityLink = vi.mocked(createAuthIdentityLink);
const mockedFindAuthIdentityLinkByAuthUserId = vi.mocked(findAuthIdentityLinkByAuthUserId);
const mockedFindAuthIdentityLinkByCredtrailUserId = vi.mocked(findAuthIdentityLinkByCredtrailUserId);
const mockedFindUserByEmail = vi.mocked(findUserByEmail);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const sampleLink = (overrides?: {
  authUserId?: string;
  credtrailUserId?: string;
  emailSnapshot?: string | null;
}): {
  id: string;
  authSystem: string;
  authUserId: string;
  authAccountId: string | null;
  credtrailUserId: string;
  emailSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
} => {
  return {
    id: 'ail_123',
    authSystem: 'better_auth',
    authUserId: overrides?.authUserId ?? 'ba_usr_123',
    authAccountId: 'ba_account_123',
    credtrailUserId: overrides?.credtrailUserId ?? 'usr_123',
    emailSnapshot: overrides?.emailSnapshot ?? 'student@example.edu',
    createdAt: '2026-03-16T20:00:00.000Z',
    updatedAt: '2026-03-16T20:00:00.000Z',
  };
};

const sampleUser = (overrides?: { id?: string; email?: string }): { id: string; email: string } => {
  return {
    id: overrides?.id ?? 'usr_123',
    email: overrides?.email ?? 'student@example.edu',
  };
};

const createInput = (sessionOverride?: {
  sessionId?: string;
  authUserId?: string;
  email?: string | null;
  emailVerified?: boolean;
}): {
  resolveDatabase: () => SqlDatabase;
  resolveSession: () => Promise<{
    sessionId: string;
    accountId: string | null;
    expiresAt: string;
    user: {
      id: string;
      email: string | null;
      emailVerified: boolean;
    } | null;
  }>;
} => {
  return {
    resolveDatabase: () => fakeDb,
    resolveSession: () =>
      Promise.resolve({
        sessionId: sessionOverride?.sessionId ?? 'ba_ses_123',
        accountId: 'ba_account_123',
        expiresAt: '2026-03-17T20:00:00.000Z',
        user: {
          id: sessionOverride?.authUserId ?? 'ba_usr_123',
          email: sessionOverride?.email ?? 'Student@Example.edu',
          emailVerified: sessionOverride?.emailVerified ?? true,
        },
      }),
  };
};

beforeEach(() => {
  mockedCreateAuthIdentityLink.mockReset();
  mockedFindAuthIdentityLinkByAuthUserId.mockReset();
  mockedFindAuthIdentityLinkByCredtrailUserId.mockReset();
  mockedFindUserByEmail.mockReset();
});

describe('better auth adapter', () => {
  it('links unlinked Better Auth users to existing CredTrail users by normalized verified email', async () => {
    mockedFindAuthIdentityLinkByAuthUserId.mockResolvedValue(null);
    mockedFindUserByEmail.mockResolvedValue(sampleUser());
    mockedFindAuthIdentityLinkByCredtrailUserId.mockResolvedValue(null);
    mockedCreateAuthIdentityLink.mockResolvedValue(sampleLink());

    const principal = await resolveAuthenticatedPrincipal(
      { env: {} } satisfies FakeContext,
      createInput(),
    );

    expect(principal).toEqual({
      userId: 'usr_123',
      authSessionId: 'ba_ses_123',
      authMethod: 'better_auth',
      expiresAt: '2026-03-17T20:00:00.000Z',
    });
    expect(mockedFindUserByEmail).toHaveBeenCalledWith(fakeDb, 'Student@Example.edu');
    expect(mockedCreateAuthIdentityLink).toHaveBeenCalledWith(fakeDb, {
      authSystem: 'better_auth',
      authUserId: 'ba_usr_123',
      authAccountId: 'ba_account_123',
      credtrailUserId: 'usr_123',
      emailSnapshot: 'Student@Example.edu',
    });
  });

  it('reuses an existing auth identity link without trying to relink by email', async () => {
    mockedFindAuthIdentityLinkByAuthUserId.mockResolvedValue(sampleLink());

    const principal = await resolveAuthenticatedPrincipal(
      { env: {} } satisfies FakeContext,
      createInput(),
    );

    expect(principal).toEqual({
      userId: 'usr_123',
      authSessionId: 'ba_ses_123',
      authMethod: 'better_auth',
      expiresAt: '2026-03-17T20:00:00.000Z',
    });
    expect(mockedFindUserByEmail).not.toHaveBeenCalled();
    expect(mockedCreateAuthIdentityLink).not.toHaveBeenCalled();
  });

  it('fails closed when Better Auth identity data is missing or the email match is unsafe', async () => {
    mockedFindAuthIdentityLinkByAuthUserId.mockResolvedValue(null);

    const missingIdentityPrincipal = await resolveAuthenticatedPrincipal(
      { env: {} } satisfies FakeContext,
      createInput({
        email: null,
        emailVerified: false,
      }),
    );

    mockedFindUserByEmail.mockResolvedValue(sampleUser());
    mockedFindAuthIdentityLinkByCredtrailUserId.mockResolvedValue(
      sampleLink({
        authUserId: 'ba_usr_conflict',
      }),
    );

    const conflictingLinkPrincipal = await resolveAuthenticatedPrincipal(
      { env: {} } satisfies FakeContext,
      createInput(),
    );

    expect(missingIdentityPrincipal).toBeNull();
    expect(conflictingLinkPrincipal).toBeNull();
    expect(mockedCreateAuthIdentityLink).not.toHaveBeenCalled();
  });
});
