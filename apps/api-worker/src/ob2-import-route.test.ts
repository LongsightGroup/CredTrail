import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
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

import {
  findActiveSessionByHash,
  findTenantMembership,
  touchSession,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRecord,
} from '@credtrail/db';
import { createPostgresDatabase } from '@credtrail/db/postgres';

import { app } from './index';

const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedFindTenantMembership = vi.mocked(findTenantMembership);
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

const sampleSession = (): SessionRecord => {
  return {
    id: 'ses_123',
    tenantId: 'tenant_123',
    userId: 'usr_123',
    sessionTokenHash: 'session_hash',
    expiresAt: '2026-03-01T00:00:00.000Z',
    lastSeenAt: '2026-02-14T12:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-02-14T12:00:00.000Z',
  };
};

const sampleMembership = (): TenantMembershipRecord => {
  return {
    tenantId: 'tenant_123',
    userId: 'usr_123',
    role: 'issuer',
    createdAt: '2026-02-14T12:00:00.000Z',
    updatedAt: '2026-02-14T12:00:00.000Z',
  };
};

beforeEach(() => {
  mockedCreatePostgresDatabase.mockReset();
  mockedCreatePostgresDatabase.mockReturnValue(fakeDb);
  mockedFindActiveSessionByHash.mockReset();
  mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
  mockedFindTenantMembership.mockReset();
  mockedFindTenantMembership.mockResolvedValue(sampleMembership());
  mockedTouchSession.mockReset();
  mockedTouchSession.mockResolvedValue();
});

describe('POST /v1/tenants/:tenantId/migrations/ob2/convert', () => {
  it('converts OB2 assertion payloads into normalized import candidates', async () => {
    const env = createEnv();

    const response = await app.request(
      '/v1/tenants/tenant_123/migrations/ob2/convert',
      {
        method: 'POST',
        headers: {
          cookie: 'credtrail_session=test-session-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ob2Assertion: {
            '@context': 'https://w3id.org/openbadges/v2',
            type: 'Assertion',
            recipient: {
              type: 'email',
              identity: 'learner@example.edu',
            },
            badge: {
              type: 'BadgeClass',
              id: 'https://issuer.test/badges/24',
              name: 'Migration Foundations',
              criteria: {
                id: 'https://issuer.test/badges/24/criteria',
              },
              image: {
                id: 'https://issuer.test/badges/24/image',
              },
              issuer: {
                id: 'https://issuer.test/issuers/1',
                name: 'Issuer Test',
                url: 'https://issuer.test',
              },
            },
            issuedOn: '2025-10-01T12:00:00Z',
          },
        }),
      },
      env,
    );

    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(body.tenantId).toBe('tenant_123');

    const conversion = body.conversion as Record<string, unknown>;
    expect(conversion).toBeDefined();

    const createBadgeTemplateRequest = conversion
      .createBadgeTemplateRequest as Record<string, unknown>;
    const manualIssueRequest = conversion.manualIssueRequest as Record<string, unknown>;

    expect(createBadgeTemplateRequest.title).toBe('Migration Foundations');
    expect(manualIssueRequest.recipientIdentity).toBe('learner@example.edu');
    expect(manualIssueRequest.recipientIdentityType).toBe('email');
  });

  it('requires tenant authentication', async () => {
    const env = createEnv();

    const response = await app.request(
      '/v1/tenants/tenant_123/migrations/ob2/convert',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ob2Assertion: {
            type: 'Assertion',
          },
        }),
      },
      env,
    );

    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });
});
