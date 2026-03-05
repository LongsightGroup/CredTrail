import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    createAuditLog: vi.fn(),
    findActiveSessionByHash: vi.fn(),
    findBadgeTemplateById: vi.fn(),
    findTenantMembership: vi.fn(),
    hasTenantMembershipOrgUnitAccess: vi.fn(),
    hasTenantMembershipOrgUnitScopeAssignments: vi.fn(),
    touchSession: vi.fn(),
    updateBadgeTemplate: vi.fn(),
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
  findBadgeTemplateById,
  findTenantMembership,
  hasTenantMembershipOrgUnitAccess,
  hasTenantMembershipOrgUnitScopeAssignments,
  touchSession,
  updateBadgeTemplate,
  type BadgeTemplateRecord,
  type SessionRecord,
  type SqlDatabase,
  type TenantMembershipRecord,
} from '@credtrail/db';
import { createPostgresDatabase } from '@credtrail/db/postgres';
import { BADGE_TEMPLATE_IMAGE_MAX_BYTES } from './badges/template-image-storage';
import { app } from './index';

const mockedCreateAuditLog = vi.mocked(createAuditLog);
const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedFindBadgeTemplateById = vi.mocked(findBadgeTemplateById);
const mockedFindTenantMembership = vi.mocked(findTenantMembership);
const mockedHasTenantMembershipOrgUnitAccess = vi.mocked(hasTenantMembershipOrgUnitAccess);
const mockedHasTenantMembershipOrgUnitScopeAssignments = vi.mocked(
  hasTenantMembershipOrgUnitScopeAssignments,
);
const mockedTouchSession = vi.mocked(touchSession);
const mockedUpdateBadgeTemplate = vi.mocked(updateBadgeTemplate);
const mockedCreatePostgresDatabase = vi.mocked(createPostgresDatabase);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const createEnv = (badgeObjects: R2Bucket): {
  APP_ENV: string;
  DATABASE_URL: string;
  BADGE_OBJECTS: R2Bucket;
  PLATFORM_DOMAIN: string;
} => {
  return {
    APP_ENV: 'test',
    DATABASE_URL: 'postgres://credtrail-test.local/db',
    BADGE_OBJECTS: badgeObjects,
    PLATFORM_DOMAIN: 'credtrail.test',
  };
};

const sampleSession = (): SessionRecord => {
  return {
    id: 'ses_123',
    tenantId: 'tenant_123',
    userId: 'usr_admin',
    sessionTokenHash: 'session_hash',
    expiresAt: '2026-02-23T23:00:00.000Z',
    lastSeenAt: '2026-02-23T12:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-02-23T12:00:00.000Z',
  };
};

const sampleMembership = (): TenantMembershipRecord => {
  return {
    tenantId: 'tenant_123',
    userId: 'usr_admin',
    role: 'admin',
    createdAt: '2026-02-23T12:00:00.000Z',
    updatedAt: '2026-02-23T12:00:00.000Z',
  };
};

const sampleTemplate = (overrides?: Partial<BadgeTemplateRecord>): BadgeTemplateRecord => {
  return {
    id: 'badge_template_001',
    tenantId: 'tenant_123',
    slug: 'typescript-foundations',
    title: 'TypeScript Foundations',
    description: 'Awarded for TypeScript basics.',
    criteriaUri: null,
    imageUri: null,
    createdByUserId: 'usr_admin',
    ownerOrgUnitId: 'tenant_123:org:institution',
    governanceMetadataJson: null,
    isArchived: false,
    createdAt: '2026-02-23T12:00:00.000Z',
    updatedAt: '2026-02-23T12:00:00.000Z',
    ...overrides,
  };
};

interface InMemoryImmutableStore {
  head: (key: string) => Promise<{ key: string } | null>;
  get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
  put: (
    key: string,
    value: string,
    _options?: unknown,
  ) => Promise<{
    key: string;
    etag: string;
    version: string;
    size: number;
    uploaded: Date;
  } | null>;
}

const createBadgeObjectStore = (): {
  store: R2Bucket;
  entries: Map<string, string>;
} => {
  const entries = new Map<string, string>();
  const store: InMemoryImmutableStore = {
    head(key) {
      return Promise.resolve(entries.has(key) ? { key } : null);
    },
    get(key) {
      const value = entries.get(key);

      if (value === undefined) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        text: () => Promise.resolve(value),
      });
    },
    put(key, value) {
      entries.set(key, value);
      return Promise.resolve({
        key,
        etag: 'etag_123',
        version: 'v1',
        size: new TextEncoder().encode(value).length,
        uploaded: new Date('2026-02-23T12:30:00.000Z'),
      });
    },
  };

  return {
    store: store as unknown as R2Bucket,
    entries,
  };
};

const samplePngBytes = (): Uint8Array => {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
};

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
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
  mockedFindBadgeTemplateById.mockReset();
  mockedFindBadgeTemplateById.mockResolvedValue(sampleTemplate());
  mockedHasTenantMembershipOrgUnitScopeAssignments.mockReset();
  mockedHasTenantMembershipOrgUnitScopeAssignments.mockResolvedValue(false);
  mockedHasTenantMembershipOrgUnitAccess.mockReset();
  mockedHasTenantMembershipOrgUnitAccess.mockResolvedValue(true);
  mockedUpdateBadgeTemplate.mockReset();
  mockedUpdateBadgeTemplate.mockImplementation((_db, request) => {
    return Promise.resolve(
      sampleTemplate({
        imageUri: request.imageUri ?? null,
      }),
    );
  });
  mockedCreateAuditLog.mockReset();
  mockedCreateAuditLog.mockResolvedValue({
    id: 'audit_123',
    tenantId: 'tenant_123',
    actorUserId: 'usr_admin',
    action: 'badge_template.image_uploaded',
    targetType: 'badge_template',
    targetId: 'badge_template_001',
    metadataJson: null,
    occurredAt: '2026-02-23T12:30:00.000Z',
    createdAt: '2026-02-23T12:30:00.000Z',
  });
});

describe('badge template image upload routes', () => {
  it('uploads a PNG image, stores it in object storage, and serves it publicly', async () => {
    const { store, entries } = createBadgeObjectStore();
    const env = createEnv(store);
    const formData = new FormData();
    formData.set(
      'file',
      new File([bytesToArrayBuffer(samplePngBytes())], 'typescript-badge.png', { type: 'image/png' }),
    );

    const uploadResponse = await app.request(
      '/v1/tenants/tenant_123/badge-templates/badge_template_001/image-upload',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
        body: formData,
      },
      env,
    );
    const uploadBody = await uploadResponse.json<{
      tenantId: string;
      template: {
        imageUri: string | null;
      };
      image: {
        path: string;
        url: string;
        mimeType: string;
        byteSize: number;
      };
    }>();

    expect(uploadResponse.status).toBe(201);
    expect(uploadBody.tenantId).toBe('tenant_123');
    expect(uploadBody.image.mimeType).toBe('image/png');
    expect(uploadBody.image.byteSize).toBe(samplePngBytes().byteLength);
    expect(uploadBody.image.path).toContain('/badges/assets/tenant_123/badge_template_001/');
    expect(uploadBody.image.url).toContain('/badges/assets/tenant_123/badge_template_001/');
    expect(uploadBody.template.imageUri).toBe(uploadBody.image.url);
    expect(entries.size).toBe(1);
    expect(mockedUpdateBadgeTemplate).toHaveBeenCalledTimes(1);
    expect(mockedCreateAuditLog).toHaveBeenCalledTimes(1);

    const publicAssetPath = new URL(uploadBody.image.url).pathname;
    const publicResponse = await app.request(publicAssetPath, undefined, env);
    const publicBody = new Uint8Array(await publicResponse.arrayBuffer());

    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get('content-type')).toContain('image/png');
    expect(publicResponse.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(publicBody).toEqual(samplePngBytes());
  });

  it('returns 422 when file type is unsupported', async () => {
    const { store } = createBadgeObjectStore();
    const env = createEnv(store);
    const formData = new FormData();
    formData.set(
      'file',
      new File([bytesToArrayBuffer(new Uint8Array([0x47, 0x49, 0x46]))], 'badge.gif', {
        type: 'image/gif',
      }),
    );

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-templates/badge_template_001/image-upload',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
        body: formData,
      },
      env,
    );
    const body = await response.json<{ error: string }>();

    expect(response.status).toBe(422);
    expect(body.error).toContain('Unsupported image type');
  });

  it('returns 422 when content bytes do not match declared mime type', async () => {
    const { store } = createBadgeObjectStore();
    const env = createEnv(store);
    const formData = new FormData();
    formData.set(
      'file',
      new File([bytesToArrayBuffer(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))], 'badge.png', {
        type: 'image/png',
      }),
    );

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-templates/badge_template_001/image-upload',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
        body: formData,
      },
      env,
    );
    const body = await response.json<{ error: string }>();

    expect(response.status).toBe(422);
    expect(body.error).toBe('Uploaded file content does not match declared image type');
  });

  it('returns 413 when upload exceeds byte limit', async () => {
    const { store } = createBadgeObjectStore();
    const env = createEnv(store);
    const oversizedBytes = new Uint8Array(BADGE_TEMPLATE_IMAGE_MAX_BYTES + 1);
    oversizedBytes.set(samplePngBytes(), 0);
    const formData = new FormData();
    formData.set(
      'file',
      new File([bytesToArrayBuffer(oversizedBytes)], 'big-image.png', { type: 'image/png' }),
    );

    const response = await app.request(
      '/v1/tenants/tenant_123/badge-templates/badge_template_001/image-upload',
      {
        method: 'POST',
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
        body: formData,
      },
      env,
    );
    const body = await response.json<{ error: string }>();

    expect(response.status).toBe(413);
    expect(body.error).toContain('byte limit');
  });

  it('returns 404 for unknown public image asset path', async () => {
    const { store } = createBadgeObjectStore();
    const env = createEnv(store);
    const response = await app.request(
      '/badges/assets/tenant_123/badge_template_001/asset_missing',
      undefined,
      env,
    );

    expect(response.status).toBe(404);
  });
});
