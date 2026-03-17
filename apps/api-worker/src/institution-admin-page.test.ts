import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockedFindTenantAuthPolicy,
  mockedListTenantAuthProviders,
  mockedListTenantBreakGlassAccounts,
  mockedListAccessibleTenantContextsForUser,
} = vi.hoisted(() => {
  return {
    mockedFindTenantAuthPolicy: vi.fn(),
    mockedListTenantAuthProviders: vi.fn(),
    mockedListTenantBreakGlassAccounts: vi.fn(),
    mockedListAccessibleTenantContextsForUser: vi.fn(),
  };
});

vi.mock('@credtrail/db', async () => {
  const actual = await vi.importActual<typeof import('@credtrail/db')>('@credtrail/db');

  return {
    ...actual,
    findActiveSessionByHash: vi.fn(),
    findTenantAuthPolicy: mockedFindTenantAuthPolicy,
    findTenantById: vi.fn(),
    findTenantMembership: vi.fn(),
    findUserById: vi.fn(),
    listAccessibleTenantContextsForUser: mockedListAccessibleTenantContextsForUser,
    listBadgeIssuanceRules: vi.fn(),
    listBadgeIssuanceRuleVersions: vi.fn(),
    listTenantBreakGlassAccounts: mockedListTenantBreakGlassAccounts,
    listTenantAuthProviders: mockedListTenantAuthProviders,
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
  findUserById,
  listBadgeIssuanceRules,
  listBadgeIssuanceRuleVersions,
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

const mockedFindActiveSessionByHash = vi.mocked(findActiveSessionByHash);
const mockedTouchSession = vi.mocked(touchSession);
const mockedFindTenantMembership = vi.mocked(findTenantMembership);
const mockedFindTenantById = vi.mocked(findTenantById);
const mockedFindUserById = vi.mocked(findUserById);
const mockedListBadgeIssuanceRules = vi.mocked(listBadgeIssuanceRules);
const mockedListBadgeIssuanceRuleVersions = vi.mocked(listBadgeIssuanceRuleVersions);
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
  RULE_BUILDER_TUTORIAL_EMBED_URL?: string;
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
  mockedFindTenantAuthPolicy.mockReset();
  mockedFindTenantAuthPolicy.mockResolvedValue({
    tenantId: 'tenant_123',
    loginMode: 'hybrid',
    breakGlassEnabled: true,
    localMfaRequired: true,
    defaultProviderId: 'tap_oidc',
    enforceForRoles: 'all_users',
    createdAt: '2026-02-18T12:00:00.000Z',
    updatedAt: '2026-02-18T12:00:00.000Z',
  });
  mockedFindUserById.mockReset();
  mockedFindUserById.mockResolvedValue({
    id: 'usr_admin',
    email: 'admin@tenant-123.edu',
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
  mockedListBadgeIssuanceRules.mockReset();
  mockedListBadgeIssuanceRules.mockResolvedValue([
    {
      id: 'brl_123',
      tenantId: 'tenant_123',
      name: 'CS101 Excellence Rule',
      description: 'Issue badge for CS101 completion and grade threshold.',
      badgeTemplateId: 'badge_template_001',
      lmsProviderKind: 'canvas',
      activeVersionId: 'brv_123',
      createdByUserId: 'usr_admin',
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:00:00.000Z',
    },
  ]);
  mockedListBadgeIssuanceRuleVersions.mockReset();
  mockedListBadgeIssuanceRuleVersions.mockResolvedValue([
    {
      id: 'brv_123',
      tenantId: 'tenant_123',
      ruleId: 'brl_123',
      versionNumber: 1,
      status: 'draft',
      ruleJson: '{"conditions":{"type":"grade_threshold","courseId":"CS101","minScore":80}}',
      changeSummary: 'Initial draft',
      createdByUserId: 'usr_admin',
      approvedByUserId: null,
      approvedAt: null,
      activatedByUserId: null,
      activatedAt: null,
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
  mockedListTenantAuthProviders.mockReset();
  mockedListTenantAuthProviders.mockResolvedValue([
    {
      id: 'tap_oidc',
      tenantId: 'tenant_123',
      protocol: 'oidc',
      label: 'Campus OIDC',
      enabled: true,
      isDefault: true,
      configJson:
        '{"issuer":"https://idp.example.edu","clientId":"credtrail","clientSecret":"secret"}',
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:00:00.000Z',
    },
  ]);
  mockedListTenantBreakGlassAccounts.mockReset();
  mockedListTenantBreakGlassAccounts.mockResolvedValue([
    {
      tenantId: 'tenant_123',
      userId: 'usr_break_glass',
      email: 'admin@tenant-123.edu',
      createdByUserId: 'usr_admin',
      lastUsedAt: null,
      lastEnrollmentEmailSentAt: '2026-02-18T12:05:00.000Z',
      revokedAt: null,
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:05:00.000Z',
      betterAuthUserId: 'ba_usr_break_glass',
      localCredentialEnabled: true,
      twoFactorEnabled: true,
    },
  ]);
  mockedListAccessibleTenantContextsForUser.mockReset();
  mockedListAccessibleTenantContextsForUser.mockResolvedValue([
    {
      tenantId: 'tenant_123',
      tenantSlug: 'tenant-123',
      tenantDisplayName: 'Tenant 123',
      tenantPlanTier: 'team',
      membershipRole: 'admin',
    },
  ]);
});

describe('GET /tenants/:tenantId/admin', () => {
  it('redirects to login when no session cookie is present', async () => {
    const env = createEnv();
    const response = await app.request('/tenants/tenant_123/admin', undefined, env);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/login?tenantId=tenant_123&next=%2Ftenants%2Ftenant_123%2Fadmin&reason=auth_required',
    );
  });

  it('returns 403 page when membership role is below admin', async () => {
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
    const body = await response.text();

    expect(response.status).toBe(403);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(body).toContain('Admin role required');
    expect(body).toContain('institution admin access');
  });

  it('shows empty-state CTA when no rules exist', async () => {
    const env = createEnv();
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
    mockedTouchSession.mockResolvedValue();
    mockedListBadgeIssuanceRules.mockResolvedValue([]);
    mockedListBadgeIssuanceRuleVersions.mockResolvedValue([]);

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
    expect(body).toContain('No badge rules found.');
    expect(body).toContain('/tenants/tenant_123/admin/rules/new');
    expect(body).toContain('Create your first rule');
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
    expect(body).toContain('Upload Badge Template Image');
    expect(body).toContain('Create Tenant API Key');
    expect(body).toContain('Create Org Unit');
    expect(body).toContain('Governance Delegation');
    expect(body).toContain('Rule Builder Workspace');
    expect(body).toContain('Evaluate Rule');
    expect(body).toContain('Issued Badges Ledger');
    expect(body).toContain('Institution admin workstreams');
    expect(body).toContain('Credential operations');
    expect(body).toContain('Rule design');
    expect(body).toContain('Access and structure');
    expect(body).not.toContain('Enterprise Auth');
    expect(body).toContain('Badge Rules (1)');
    expect(body).toContain('CS101 Excellence Rule');
    expect(body).toContain('TypeScript Foundations');
    expect(body).toContain('/showcase/tenant_123?badgeTemplateId=badge_template_001');
    expect(body).toContain('/showcase/tenant_123/criteria?badgeTemplateId=badge_template_001');
    expect(body).toContain('/v1/tenants/tenant_123/assertions/manual-issue');
    expect(body).toContain('/v1/tenants/tenant_123/assertions');
    expect(body).toContain('/v1/tenants/tenant_123/api-keys');
    expect(body).toContain('/v1/tenants/tenant_123/org-units');
    expect(body).toContain('/v1/tenants/tenant_123/badge-templates');
    expect(body).toContain('/v1/tenants/tenant_123/users');
    expect(body).toContain('/v1/tenants/tenant_123/badge-rules');
    expect(body).toContain('/v1/tenants/tenant_123/badge-rule-value-lists');
    expect(body).toContain('/v1/tenants/tenant_123/badge-rules/preview-simulate');
    expect(body).toContain('/v1/tenants/tenant_123/badge-rules/review-queue');
    expect(body).toContain('id="badge-template-image-upload-form"');
    expect(body).toContain('id="badge-template-image-upload-status"');
    expect(body).toContain('name="file"');
    expect(body).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(body).toContain('id="membership-scope-form"');
    expect(body).toContain('id="membership-scope-remove-form"');
    expect(body).toContain('id="delegated-grant-form"');
    expect(body).toContain('id="delegated-revoke-form"');
    expect(body).toContain('name="allowedAction" type="checkbox" value="manage_lifecycle"');
    expect(body).toContain('/admin/audit-logs?tenantId=tenant_123');
    expect(body).toContain('href="#manual-issue-panel"');
    expect(body).toContain('href="/tenants/tenant_123/admin/rules/new"');
    expect(body).toContain('href="#api-key-panel"');
    expect(body).toContain('href="#issued-badges-panel"');
    expect(body).toContain('id="issued-badges-filter-form"');
    expect(body).toContain('id="issued-badges-body"');
    expect(body).toContain('id="issued-badges-status"');
    expect(body).toContain('id="issued-badges-action-status"');
    expect(body).toContain('id="assertion-lifecycle-view-form"');
    expect(body).toContain('id="assertion-lifecycle-transition-form"');
    expect(body).toContain('id="rule-governance-form"');
    expect(body).toContain('id="rule-builder-panel"');
    expect(body).toContain('id="rule-value-list-form"');
    expect(body).toContain('id="rule-value-list-body"');
    expect(body).toContain('id="rule-review-queue-refresh"');
    expect(body).toContain('id="rule-review-queue-body"');
    expect(body).toContain('Open rule builder');
    expect(body).toContain('id="assertion-lifecycle-output"');
    expect(body).toContain('id="rule-governance-output"');
    expect(body).toContain('value="credential_expired"');
    expect(body).toContain(
      '/v1/tenants/tenant_123/badge-rules/brl_123/versions/brv_123/submit-approval',
    );
    expect(body).toContain('/v1/tenants/tenant_123/api-keys/tak_active/revoke');
    expect(body).toContain('Active API Keys (1)');
    expect(body).toContain('Revoked keys: 1');
    expect(body).toContain('User: admin@tenant-123.edu');
    expect(body).toContain('title="User ID: usr_admin"');
    expect(body).toContain('/assets/ui/foundation.');
    expect(body).toContain('/assets/ui/institution-admin.');
    expect(body).not.toContain('Switch organization');
    expect(mockedListBadgeTemplates).toHaveBeenCalledWith(fakeDb, {
      tenantId: 'tenant_123',
      includeArchived: false,
    });
    expect(mockedFindUserById).toHaveBeenCalledWith(fakeDb, 'usr_admin');
    expect(mockedListBadgeIssuanceRules).toHaveBeenCalledWith(fakeDb, {
      tenantId: 'tenant_123',
    });
    expect(mockedListBadgeIssuanceRuleVersions).toHaveBeenCalledWith(fakeDb, {
      tenantId: 'tenant_123',
      ruleId: 'brl_123',
    });
  });

  it('shows an explicit switch-organization entry point only for multi-tenant admins', async () => {
    const env = createEnv();
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
    mockedTouchSession.mockResolvedValue();
    mockedListAccessibleTenantContextsForUser.mockResolvedValue([
      {
        tenantId: 'tenant_123',
        tenantSlug: 'tenant-123',
        tenantDisplayName: 'Tenant 123',
        tenantPlanTier: 'team',
        membershipRole: 'admin',
      },
      {
        tenantId: 'tenant_456',
        tenantSlug: 'tenant-456',
        tenantDisplayName: 'Tenant 456',
        tenantPlanTier: 'enterprise',
        membershipRole: 'admin',
      },
    ]);

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
    expect(body).toContain('Switch organization');
    expect(body).toContain('/account/organizations?next=%2Ftenants%2Ftenant_123%2Fadmin');
    expect(body).not.toContain('Choose a CredTrail organization');
  });

  it('renders enterprise auth settings for enterprise tenants', async () => {
    const env = createEnv();
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
    mockedTouchSession.mockResolvedValue();
    mockedFindTenantById.mockResolvedValue({
      id: 'tenant_123',
      slug: 'tenant-123',
      displayName: 'Tenant 123',
      planTier: 'enterprise',
      issuerDomain: 'tenant-123.credtrail.test',
      didWeb: 'did:web:credtrail.test:tenant_123',
      isActive: true,
      createdAt: '2026-02-18T12:00:00.000Z',
      updatedAt: '2026-02-18T12:00:00.000Z',
    });

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
    expect(body).toContain('Enterprise Auth');
    expect(body).toContain('Login mode');
    expect(body).toContain('Campus OIDC');
    expect(body).toContain('id="enterprise-auth-policy-form"');
    expect(body).toContain('id="enterprise-auth-provider-form"');
    expect(body).toContain('Break-glass local accounts');
    expect(body).toContain('admin@tenant-123.edu');
    expect(body).toContain('/v1/tenants/tenant_123/break-glass-accounts');
    expect(body).toContain('/v1/tenants/tenant_123/auth-policy');
    expect(body).toContain('/v1/tenants/tenant_123/auth-providers');
  });
});

describe('GET /tenants/:tenantId/admin/rules/new', () => {
  it('redirects to login when no session cookie is present', async () => {
    const env = createEnv();
    const response = await app.request('/tenants/tenant_123/admin/rules/new', undefined, env);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/login?tenantId=tenant_123&next=%2Ftenants%2Ftenant_123%2Fadmin%2Frules%2Fnew&reason=auth_required',
    );
  });

  it('renders dedicated rule-builder page for admin membership', async () => {
    const env = createEnv();
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
    mockedTouchSession.mockResolvedValue();

    const response = await app.request(
      '/tenants/tenant_123/admin/rules/new',
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
    expect(body).toContain('Visual Rule Builder');
    expect(body).toContain('id="rule-create-form"');
    expect(body).toContain('data-rule-step-target="metadata"');
    expect(body).toContain('data-rule-step-target="conditions"');
    expect(body).toContain('data-rule-step-target="test"');
    expect(body).toContain('data-rule-step-target="review"');
    expect(body).toContain('id="rule-builder-condition-list"');
    expect(body).toContain('id="rule-builder-definition-json"');
    expect(body).toContain('id="rule-builder-summary-validity"');
    expect(body).toContain('id="rule-builder-summary-last-test"');
    expect(body).toContain('id="rule-builder-step-prev"');
    expect(body).toContain('id="rule-builder-step-next"');
    expect(body).toContain('id="rule-builder-submit"');
    expect(body).toContain('id="rule-builder-test-preset"');
    expect(body).toContain('id="rule-builder-apply-test-preset"');
    expect(body).toContain('id="rule-builder-test-output"');
    expect(body).toContain('id="rule-builder-value-list-body"');
    expect(body).toContain('name="reviewOnMissingFacts"');
    expect(body).toContain('id="rule-builder-simulate"');
    expect(body).toContain('id="rule-builder-simulate-output"');
    expect(body).toContain('Build in four passes');
    expect(body).toContain('Reuse proven patterns');
    expect(body).toContain('Draft summary');
    expect(body).toContain('Five-minute walkthrough');
    expect(body).toContain('Condition help');
    expect(body).toContain('RULE_BUILDER_TUTORIAL_EMBED_URL');
    expect(body).toContain('href="/tenants/tenant_123/admin"');
  });

  it('renders walkthrough embed when tutorial env URL is configured', async () => {
    const env = {
      ...createEnv(),
      RULE_BUILDER_TUTORIAL_EMBED_URL: 'https://videos.example.edu/embed/rule-builder',
    };
    mockedFindActiveSessionByHash.mockResolvedValue(sampleSession());
    mockedTouchSession.mockResolvedValue();

    const response = await app.request(
      '/tenants/tenant_123/admin/rules/new',
      {
        headers: {
          Cookie: 'credtrail_session=session-token',
        },
      },
      env,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('id="rule-builder-tutorial-embed"');
    expect(body).toContain('src="https://videos.example.edu/embed/rule-builder"');
    expect(body).not.toContain('RULE_BUILDER_TUTORIAL_EMBED_URL');
  });
});
