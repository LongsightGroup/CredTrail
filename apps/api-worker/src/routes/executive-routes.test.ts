import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedFindTenantMembership,
  mockedLoadTenantExecutiveDashboard,
  mockedResolveBetterAuthPrincipal,
  mockedResolveBetterAuthRequestedTenant,
} = vi.hoisted(() => {
  return {
    mockedFindTenantMembership: vi.fn(),
    mockedLoadTenantExecutiveDashboard: vi.fn(),
    mockedResolveBetterAuthPrincipal: vi.fn(),
    mockedResolveBetterAuthRequestedTenant: vi.fn(),
  };
});

vi.mock("@credtrail/db", async () => {
  const actual = await vi.importActual<typeof import("@credtrail/db")>("@credtrail/db");

  return {
    ...actual,
    findTenantMembership: mockedFindTenantMembership,
  };
});

vi.mock("@credtrail/db/postgres", () => {
  return {
    createPostgresDatabase: vi.fn(() => ({
      prepare: vi.fn(),
    })),
  };
});

vi.mock("../auth/better-auth-adapter", async () => {
  const actual = await vi.importActual<typeof import("../auth/better-auth-adapter")>(
    "../auth/better-auth-adapter",
  );

  return {
    ...actual,
    createBetterAuthProvider: vi.fn(() => ({
      requestMagicLink: vi.fn(),
      createMagicLinkSession: vi.fn(),
      createLtiSession: vi.fn(),
      resolveAuthenticatedPrincipal: mockedResolveBetterAuthPrincipal,
      resolveRequestedTenantContext: mockedResolveBetterAuthRequestedTenant,
      revokeCurrentSession: vi.fn(async () => {}),
    })),
  };
});

vi.mock("../executive/executive-rollup-loader", async () => {
  const actual = await vi.importActual<typeof import("../executive/executive-rollup-loader")>(
    "../executive/executive-rollup-loader",
  );

  return {
    ...actual,
    loadTenantExecutiveDashboard: mockedLoadTenantExecutiveDashboard,
  };
});

import { findTenantMembership } from "@credtrail/db";

import { app } from "../index";

const mockedFindTenantMembershipDb = vi.mocked(findTenantMembership);

const createEnv = () => {
  return {
    APP_ENV: "test",
    DATABASE_URL: "postgres://credtrail-test.local/db",
    BADGE_OBJECTS: {} as R2Bucket,
    PLATFORM_DOMAIN: "credtrail.test",
  };
};

const sampleExecutiveDashboard = () => {
  return {
    tenantId: "tenant_123",
    access: {
      tenantId: "tenant_123",
      membershipRole: "viewer" as const,
      visibility: "scoped" as const,
      scopedOrgUnitIds: ["tenant_123:org:college-eng"],
    },
    defaults: {
      audience: "college" as const,
      window: "last-90-days" as const,
      focusOrgUnitId: "tenant_123:org:college-eng",
      focusUnitType: "college" as const,
      comparisonLevel: "department" as const,
      comparisonGroupBy: "orgUnit" as const,
      reportingFilters: {
        issuedFrom: "2025-12-23",
        issuedTo: "2026-03-22",
        badgeTemplateId: undefined,
        orgUnitId: undefined,
        state: "active" as const,
      },
      hierarchyFilters: {
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: undefined,
        orgUnitId: undefined,
        state: "active" as const,
        focusOrgUnitId: "tenant_123:org:college-eng",
        level: "department" as const,
      },
    },
    orgUnits: [
      {
        id: "tenant_123:org:institution",
        tenantId: "tenant_123",
        unitType: "institution" as const,
        slug: "institution",
        displayName: "Tenant 123 Institution",
        parentOrgUnitId: null,
        createdByUserId: "usr_admin",
        isActive: true,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
      },
      {
        id: "tenant_123:org:college-eng",
        tenantId: "tenant_123",
        unitType: "college" as const,
        slug: "college-eng",
        displayName: "College of Engineering",
        parentOrgUnitId: "tenant_123:org:institution",
        createdByUserId: "usr_admin",
        isActive: true,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
      },
    ],
    overview: {
      tenantId: "tenant_123",
      filters: {
        issuedFrom: "2025-12-23",
        issuedTo: "2026-03-22",
        badgeTemplateId: null,
        orgUnitId: null,
        state: "active",
      },
      counts: {
        issued: 18,
        active: 15,
        suspended: 2,
        revoked: 1,
        pendingReview: 1,
        claimRate: 44.4,
        shareRate: 27.8,
      },
      generatedAt: "2026-03-22T12:00:00.000Z",
    },
    trends: {
      tenantId: "tenant_123",
      filters: {
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: null,
        orgUnitId: null,
        state: "active",
      },
      bucket: "day" as const,
      series: [
        {
          bucketStart: "2026-03-20",
          issuedCount: 4,
          publicBadgeViewCount: 6,
          verificationViewCount: 3,
          shareClickCount: 2,
          learnerClaimCount: 2,
          walletAcceptCount: 1,
        },
        {
          bucketStart: "2026-03-21",
          issuedCount: 6,
          publicBadgeViewCount: 9,
          verificationViewCount: 5,
          shareClickCount: 3,
          learnerClaimCount: 3,
          walletAcceptCount: 2,
        },
      ],
      generatedAt: "2026-03-22T12:00:00.000Z",
    },
    kpiCatalog: {
      audience: "college" as const,
      focusOrgUnitId: "tenant_123:org:college-eng",
      comparisonLevel: "department" as const,
      kpis: [
        {
          key: "issued" as const,
          label: "Issued badges",
          description: "Issuance volume in the current slice.",
          valueKind: "count" as const,
          emphasis: "primary" as const,
        },
        {
          key: "claimRate" as const,
          label: "Claim rate",
          description: "Claim activity in the current slice.",
          valueKind: "percentage" as const,
          emphasis: "supporting" as const,
        },
      ],
      modules: [
        {
          id: "comparison-summary",
          kind: "comparison_summary" as const,
          title: "Compare departments",
          description: "Compare visible departments.",
          audience: "college" as const,
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department" as const,
          groupBy: "orgUnit" as const,
        },
      ],
    },
    rollup: {
      tenantId: "tenant_123",
      focusOrgUnitId: "tenant_123:org:college-eng",
      focusDisplayName: "College of Engineering",
      focusParentOrgUnitId: "tenant_123:org:institution",
      focusUnitType: "college" as const,
      comparisonLevel: "department" as const,
      focusLineageOrgUnitIds: ["tenant_123:org:institution", "tenant_123:org:college-eng"],
      filters: {
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: null,
        orgUnitId: null,
        state: "active",
      },
      rows: [
        {
          level: "department" as const,
          orgUnitId: "tenant_123:org:department-cs",
          displayName: "Computer Science",
          parentOrgUnitId: "tenant_123:org:college-eng",
          issuedCount: 10,
          publicBadgeViewCount: 16,
          verificationViewCount: 8,
          shareClickCount: 5,
          learnerClaimCount: 4,
          walletAcceptCount: 2,
          claimRate: 40,
          shareRate: 30,
        },
        {
          level: "department" as const,
          orgUnitId: "tenant_123:org:department-math",
          displayName: "Mathematics",
          parentOrgUnitId: "tenant_123:org:college-eng",
          issuedCount: 8,
          publicBadgeViewCount: 10,
          verificationViewCount: 4,
          shareClickCount: 3,
          learnerClaimCount: 4,
          walletAcceptCount: 1,
          claimRate: 50,
          shareRate: 25,
        },
      ],
      generatedAt: "2026-03-22T12:00:00.000Z",
    },
  };
};

beforeEach(() => {
  mockedFindTenantMembershipDb.mockReset();
  mockedLoadTenantExecutiveDashboard.mockReset();
  mockedResolveBetterAuthPrincipal.mockReset();
  mockedResolveBetterAuthRequestedTenant.mockReset();

  mockedFindTenantMembershipDb.mockResolvedValue({
    tenantId: "tenant_123",
    userId: "usr_exec",
    role: "viewer",
    createdAt: "2026-03-21T12:00:00.000Z",
    updatedAt: "2026-03-21T12:00:00.000Z",
  });
  mockedResolveBetterAuthPrincipal.mockResolvedValue({
    userId: "usr_exec",
    authSessionId: "ses_exec",
    authMethod: "better_auth",
    expiresAt: "2026-03-22T14:00:00.000Z",
  });
  mockedResolveBetterAuthRequestedTenant.mockResolvedValue({
    tenantId: "tenant_123",
    source: "route",
    authoritative: true,
  });
  mockedLoadTenantExecutiveDashboard.mockResolvedValue(sampleExecutiveDashboard());
});

describe("executive routes", () => {
  it("returns the executive dashboard payload for tenant-wide and scoped members through the JSON route", async () => {
    const response = await app.request(
      "/v1/tenants/tenant_123/executive?state=active&focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng",
      {
        headers: {
          cookie: "better-auth.session_token=better-auth-test",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(mockedLoadTenantExecutiveDashboard).toHaveBeenCalledWith({
      db: expect.any(Object),
      tenantId: "tenant_123",
      userId: "usr_exec",
      membershipRole: "viewer",
      query: {
        state: "active",
        focusOrgUnitId: "tenant_123:org:college-eng",
      },
    });

    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      dashboard: {
        tenantId: "tenant_123",
        defaults: {
          audience: "college",
        },
        rollup: {
          focusDisplayName: "College of Engineering",
        },
      },
    });
  });

  it("returns 403 when the executive loader rejects the member's visible scope", async () => {
    mockedLoadTenantExecutiveDashboard.mockResolvedValueOnce(null);

    const response = await app.request(
      "/v1/tenants/tenant_123/executive?focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng",
      {
        headers: {
          cookie: "better-auth.session_token=better-auth-test",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Executive dashboard access is unavailable for this tenant scope",
    });
  });

  it("renders a read-only executive page that stays outside admin operations and preserves JSON handoff", async () => {
    const response = await app.request(
      "/tenants/tenant_123/executive?state=active&focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng",
      {
        headers: {
          cookie: "better-auth.session_token=better-auth-test",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain("<h1>Executive Dashboard</h1>");
    expect(html).toContain("Read-only executive summary");
    expect(html).toContain("College of Engineering");
    expect(html).toContain("Compare departments");
    expect(html).toContain('/v1/tenants/tenant_123/executive?');
    expect(html).toContain("state=active");
    expect(html).toContain("focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng");
    expect(html).not.toContain("Institution Admin");
    expect(html).not.toContain("Rules and Access");
  });

  it("renders a 403 executive page when the member does not have executive visibility", async () => {
    mockedLoadTenantExecutiveDashboard.mockResolvedValueOnce(null);

    const response = await app.request(
      "/tenants/tenant_123/executive",
      {
        headers: {
          cookie: "better-auth.session_token=better-auth-test",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(403);
    const html = await response.text();
    expect(html).toContain("Executive dashboard unavailable");
    expect(html).toContain("Your tenant membership does not expose an executive dashboard slice.");
  });
});
