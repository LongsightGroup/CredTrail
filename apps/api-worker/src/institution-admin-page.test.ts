import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    findActiveSessionByHash: vi.fn(),
    findTenantById: vi.fn(),
    findTenantMembership: vi.fn(),
    listBadgeTemplates: vi.fn(),
    listTenantApiKeys: vi.fn(),
    listTenantOrgUnits: vi.fn(),
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
  findTenantById,
  findTenantMembership,
  listBadgeTemplates,
  listTenantApiKeys,
  listTenantOrgUnits,
  touchSession,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRecord,
} from '@credtrail/db';
import { createPostgresDatabase } from '@credtrail/db/postgres';

import { app } from './index';

interface ErrorResponse {
  error: string;
}

const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedTouchSession = vi.mocked(touchSession);
const mockedFindTenantMembership = vi.mocked(findTenantMembership);
const mockedFindTenantById = vi.mocked(findTenantById);
const mockedListBadgeTemplates = vi.mocked(listBadgeTemplates);
const mockedListTenantOrgUnits = vi.mocked(listTenantOrgUnits);
const mockedListTenantApiKeys = vi.mocked(listTenantApiKeys);
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
    expiresAt: '2026-02-18T23:00:00.000Z',
    lastSeenAt: '2026-02-18T12:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-02-18T12:00:00.000Z',
  };
};

const sampleMembership = (role: TenantMembershipRecord['role']): TenantMembershipRecord => {
  return {
    tenantId: 'tenant_123',
    userId: 'usr_admin',
    role,
    createdAt: '2026-02-18T12:00:00.000Z',
    updatedAt: '2026-02-18T12:00:00.000Z',
  };
};

beforeEach(() => {
  mockedCreatePostgresDatabase.mockReset();
  mockedCreatePostgresDatabase.mockReturnValue(fakeDb);
  mockedFindActiveSessionByHash.mockReset();
  mockedTouchSession.mockReset();
  mockedFindTenantMembership.mockReset();
  mockedFindTenantMembership.mockResolvedValue(sampleMembership('admin'));
  mockedFindTenantById.mockReset();
  mockedFindTenantById.mockResolvedValue({
    id: 'tenant_123',
    slug: 'tenant-123',
    displayName: 'Tenant 123',
    planTier: 'team',
    issuerDomain: 'tenant-123.credtrail.test',
    didWeb: 'did:web:credtrail.test:tenant_123',
    isActive: true,
    createdAt: '2026-02-18T12:00:00.000Z',
    updatedAt: '2026-02-18T12:00:00.000Z',
  });
  mockedListBadgeTemplates.mockReset();
  mockedListBadgeTemplates.mockResolvedValue([
    {
      id: 'badge_template_001',
      tenantId: 'tenant_123',
      slug: 'typescript-foundations',
      title: 'TypeScript Foundations',
      description: 'Awarded for TypeScript basics.',
      criteriaUri: 'https://example.edu/criteria',
      imageUri: 'https://example.edu/badges/typescript.png',
      createdByUserId: 'usr_admin',
      ownerOrgUnitId: 'tenant_123:org:institution',
      governanceMetadataJson: null,
      isArchived: false,
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:00:00.000Z',
    },
  ]);
  mockedListTenantOrgUnits.mockReset();
  mockedListTenantOrgUnits.mockResolvedValue([
    {
      id: 'tenant_123:org:institution',
      tenantId: 'tenant_123',
      unitType: 'institution',
      slug: 'institution',
      displayName: 'Institution',
      parentOrgUnitId: null,
      isActive: true,
      createdByUserId: 'usr_admin',
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:00:00.000Z',
    },
  ]);
  mockedListTenantApiKeys.mockReset();
  mockedListTenantApiKeys.mockResolvedValue([
    {
      id: 'tak_active',
      tenantId: 'tenant_123',
      label: 'Issuer integration',
      keyPrefix: 'ctak_abc123',
      keyHash: 'hash_active',
      scopesJson: '["queue.issue","queue.revoke"]',
      createdByUserId: 'usr_admin',
      expiresAt: null,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:00:00.000Z',
    },
    {
      id: 'tak_revoked',
      tenantId: 'tenant_123',
      label: 'Old key',
      keyPrefix: 'ctak_old123',
      keyHash: 'hash_revoked',
      scopesJson: '["queue.issue"]',
      createdByUserId: 'usr_admin',
      expiresAt: null,
      lastUsedAt: null,
      revokedAt: '2026-02-18T12:30:00.000Z',
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:30:00.000Z',
    },
  ]);
});

describe('GET /tenants/:tenantId/admin', () => {
  it('returns 401 when no session cookie is present', async () => {
    const env = createEnv();
    const response = await app.request('/tenants/tenant_123/admin', undefined, env);
    const body = await response.json<ErrorResponse>();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  it('returns 403 when membership role is below admin', async () => {
    const env = createEnv();
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
    mockedTouchSession.mockResolvedValue();
    mockedFindTenantMembership.mockResolvedValue(sampleMembership('viewer'));

    const response = await app.request(
      '/tenants/tenant_123/admin',
      {
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );
    const body = await response.json<ErrorResponse>();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Insufficient role for requested action');
  });

  it('renders institution admin dashboard for admin membership', async () => {
    const env = createEnv();
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
    mockedTouchSession.mockResolvedValue();

    const response = await app.request(
      '/tenants/tenant_123/admin',
      {
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('Institution Admin');
    expect(body).toContain('Manual Issue Badge');
    expect(body).toContain('Create Tenant API Key');
    expect(body).toContain('Create Org Unit');
    expect(body).toContain('TypeScript Foundations');
    expect(body).toContain('/showcase/tenant_123?badgeTemplateId=badge_template_001');
    expect(body).toContain('/v1/tenants/tenant_123/assertions/manual-issue');
    expect(body).toContain('/v1/tenants/tenant_123/api-keys');
    expect(body).toContain('/v1/tenants/tenant_123/org-units');
    expect(body).toContain('/v1/tenants/tenant_123/api-keys/tak_active/revoke');
    expect(body).toContain('Active API Keys (1)');
    expect(body).toContain('Revoked keys: 1');
    expect(mockedListBadgeTemplates).toHaveBeenCalledWith(fakeDb, {
      tenantId: 'tenant_123',
      includeArchived: false,
    });
  });
});
