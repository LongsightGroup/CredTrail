import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetTenantReportingComparisons,
  mockedGetTenantReportingEngagementCounts,
  mockedGetTenantReportingOverview,
  mockedGetTenantReportingTrends,
  mockedResolveBetterAuthPrincipal,
  mockedResolveBetterAuthRequestedTenant,
} = vi.hoisted(() => {
  return {
    mockedGetTenantReportingComparisons: vi.fn(),
    mockedGetTenantReportingEngagementCounts: vi.fn(),
    mockedGetTenantReportingOverview: vi.fn(),
    mockedGetTenantReportingTrends: vi.fn(),
    mockedResolveBetterAuthPrincipal: vi.fn(),
    mockedResolveBetterAuthRequestedTenant: vi.fn(),
  };
});

vi.mock("@credtrail/db", async () => {
  const actual = await vi.importActual<typeof import("@credtrail/db")>("@credtrail/db");

  return {
    ...actual,
    findTenantMembership: vi.fn(),
    getTenantReportingEngagementCounts: mockedGetTenantReportingEngagementCounts,
    getTenantReportingOverview: mockedGetTenantReportingOverview,
    getTenantReportingTrends: mockedGetTenantReportingTrends,
    listTenantReportingComparisons: mockedGetTenantReportingComparisons,
  };
});

vi.mock("@credtrail/db/postgres", () => {
  return {
    createPostgresDatabase: vi.fn(),
  };
});

vi.mock("./auth/better-auth-adapter", async () => {
  const actual = await vi.importActual<typeof import("./auth/better-auth-adapter")>(
    "./auth/better-auth-adapter",
  );

  return {
    ...actual,
    createBetterAuthProvider: vi.fn(() => ({
      requestMagicLink: vi.fn(),
      createMagicLinkSession: vi.fn(),
      createLtiSession: vi.fn(),
      resolveAuthenticatedPrincipal: mockedResolveBetterAuthPrincipal,
      resolveRequestedTenantContext: mockedResolveBetterAuthRequestedTenant,
      revokeCurrentSession: vi.fn(() => Promise.resolve()),
    })),
  };
});

import {
  findTenantMembership,
  getTenantReportingEngagementCounts,
  getTenantReportingOverview,
  getTenantReportingTrends,
  listTenantReportingComparisons,
  type SqlDatabase,
} from "@credtrail/db";
import { createPostgresDatabase } from "@credtrail/db/postgres";

import { app } from "./index";

const mockedFindTenantMembership = vi.mocked(findTenantMembership);
const mockedGetTenantReportingComparisonsDb = vi.mocked(listTenantReportingComparisons);
const mockedGetTenantReportingEngagementCountsDb = vi.mocked(getTenantReportingEngagementCounts);
const mockedCreatePostgresDatabase = vi.mocked(createPostgresDatabase);
const mockedGetTenantReportingTrendsDb = vi.mocked(getTenantReportingTrends);
const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const createEnv = () => {
  return {
    APP_ENV: "test",
    DATABASE_URL: "postgres://credtrail-test.local/db",
    BADGE_OBJECTS: {} as R2Bucket,
    PLATFORM_DOMAIN: "credtrail.test",
  };
};

beforeEach(() => {
  mockedCreatePostgresDatabase.mockReset();
  mockedCreatePostgresDatabase.mockReturnValue(fakeDb);
  mockedFindTenantMembership.mockReset();
  mockedFindTenantMembership.mockResolvedValue({
    tenantId: "tenant_123",
    userId: "usr_admin",
    role: "admin",
    createdAt: "2026-03-21T12:00:00.000Z",
    updatedAt: "2026-03-21T12:00:00.000Z",
  });
  mockedGetTenantReportingOverview.mockReset();
  mockedGetTenantReportingOverview.mockResolvedValue({
    tenantId: "tenant_123",
    filters: {
      issuedFrom: "2026-03-01",
      issuedTo: "2026-03-31",
      badgeTemplateId: null,
      orgUnitId: null,
      state: null,
    },
    counts: {
      issued: 14,
      active: 12,
      suspended: 1,
      revoked: 1,
      pendingReview: 1,
    },
    generatedAt: "2026-03-21T12:00:00.000Z",
  });
  mockedGetTenantReportingEngagementCountsDb.mockReset();
  mockedGetTenantReportingEngagementCountsDb.mockResolvedValue({
    issuedCount: 14,
    publicBadgeViewCount: 41,
    verificationViewCount: 16,
    shareClickCount: 7,
    learnerClaimCount: 5,
    walletAcceptCount: 4,
    claimRate: 35.7,
    shareRate: 28.6,
  });
  mockedGetTenantReportingTrendsDb.mockReset();
  mockedGetTenantReportingTrendsDb.mockResolvedValue({
    tenantId: "tenant_123",
    filters: {
      from: "2026-03-01",
      to: "2026-03-31",
      badgeTemplateId: null,
      orgUnitId: null,
    },
    bucket: "day",
    series: [
      {
        bucketStart: "2026-03-01",
        issuedCount: 3,
        publicBadgeViewCount: 8,
        verificationViewCount: 2,
        shareClickCount: 1,
        learnerClaimCount: 1,
        walletAcceptCount: 1,
      },
      {
        bucketStart: "2026-03-02",
        issuedCount: 2,
        publicBadgeViewCount: 5,
        verificationViewCount: 3,
        shareClickCount: 2,
        learnerClaimCount: 1,
        walletAcceptCount: 1,
      },
    ],
    generatedAt: "2026-03-21T12:00:00.000Z",
  });
  mockedGetTenantReportingComparisonsDb.mockReset();
  mockedGetTenantReportingComparisonsDb.mockImplementation(
    async (_db, input: { groupBy: "badgeTemplate" | "orgUnit" }) => {
      if (input.groupBy === "orgUnit") {
        return [
          {
            groupBy: "orgUnit",
            groupId: "tenant_123:org:institution",
            issuedCount: 14,
            publicBadgeViewCount: 41,
            verificationViewCount: 16,
            shareClickCount: 7,
            learnerClaimCount: 5,
            walletAcceptCount: 4,
            claimRate: 35.7,
            shareRate: 28.6,
          },
        ];
      }

      return [
        {
          groupBy: "badgeTemplate",
          groupId: "badge_template_001",
          issuedCount: 9,
          publicBadgeViewCount: 28,
          verificationViewCount: 11,
          shareClickCount: 5,
          learnerClaimCount: 4,
          walletAcceptCount: 3,
          claimRate: 44.4,
          shareRate: 33.3,
        },
      ];
    },
  );
  mockedResolveBetterAuthPrincipal.mockReset();
  mockedResolveBetterAuthPrincipal.mockResolvedValue({
    userId: "usr_admin",
    authSessionId: "ba_ses_123",
    authMethod: "better_auth",
    expiresAt: "2026-03-21T23:00:00.000Z",
  });
  mockedResolveBetterAuthRequestedTenant.mockReset();
  mockedResolveBetterAuthRequestedTenant.mockResolvedValue(null);
});

describe("GET /v1/tenants/:tenantId/reporting/overview", () => {
  it("returns reporting overview counts and metric definitions for tenant admins", async () => {
    const response = await app.request(
      "/v1/tenants/tenant_123/reporting/overview?issuedFrom=2026-03-01&issuedTo=2026-03-31",
      {
        headers: {
          Cookie: "better-auth.session_token=session-token",
        },
      },
      createEnv(),
    );
    const body = await response.json<{
      status: string;
      counts: {
        issued: number;
        pendingReview: number;
      };
      metrics: Array<{
        key: string;
        available: boolean;
        value: number | null;
      }>;
    }>();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.counts).toEqual(
      expect.objectContaining({
        issued: 14,
        pendingReview: 1,
      }),
    );
    expect(body.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "issued",
          available: true,
          value: 14,
        }),
        expect.objectContaining({
          key: "claimRate",
          available: true,
          value: null,
        }),
      ]),
    );
    expect(mockedGetTenantReportingOverview).toHaveBeenCalledWith(fakeDb, {
      tenantId: "tenant_123",
      issuedFrom: "2026-03-01",
      issuedTo: "2026-03-31",
      badgeTemplateId: undefined,
      orgUnitId: undefined,
      state: undefined,
    });
  });

  it("returns 400 when the reporting query is invalid", async () => {
    const response = await app.request(
      "/v1/tenants/tenant_123/reporting/overview?issuedFrom=2026-03-31&issuedTo=2026-03-01",
      {
        headers: {
          Cookie: "better-auth.session_token=session-token",
        },
      },
      createEnv(),
    );
    const body = await response.json<{ error: string }>();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid reporting overview query");
  });

  it("returns 403 when the authenticated user is not a tenant admin", async () => {
    mockedFindTenantMembership.mockResolvedValue({
      tenantId: "tenant_123",
      userId: "usr_admin",
      role: "viewer",
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
    });

    const response = await app.request(
      "/v1/tenants/tenant_123/reporting/overview",
      {
        headers: {
          Cookie: "better-auth.session_token=session-token",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(403);
  });
});

describe("GET /v1/tenants/:tenantId/reporting/engagement", () => {
  it("returns raw engagement counts separately from rate metrics", async () => {
    const response = await app.request(
      "/v1/tenants/tenant_123/reporting/engagement?from=2026-03-01&to=2026-03-31",
      {
        headers: {
          Cookie: "better-auth.session_token=session-token",
        },
      },
      createEnv(),
    );
    const body = await response.json<{
      status: string;
      counts: {
        publicBadgeViewCount: number;
      };
      rates: {
        claimRate: number;
        shareRate: number;
      };
    }>();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.counts).toEqual(
      expect.objectContaining({
        publicBadgeViewCount: 41,
      }),
    );
    expect(body.rates).toEqual({
      claimRate: 35.7,
      shareRate: 28.6,
    });
    expect(mockedGetTenantReportingEngagementCountsDb).toHaveBeenCalledWith(fakeDb, {
      tenantId: "tenant_123",
      from: "2026-03-01",
      to: "2026-03-31",
      badgeTemplateId: undefined,
      orgUnitId: undefined,
    });
  });
});

describe("GET /v1/tenants/:tenantId/reporting/trends", () => {
  it("returns time-bucketed issuance and engagement series for the selected filters", async () => {
    const response = await app.request(
      "/v1/tenants/tenant_123/reporting/trends?from=2026-03-01&to=2026-03-31&bucket=day",
      {
        headers: {
          Cookie: "better-auth.session_token=session-token",
        },
      },
      createEnv(),
    );
    const body = await response.json<{
      status: string;
      bucket: string;
      series: Array<{
        bucketStart: string;
        issuedCount: number;
        learnerClaimCount: number;
      }>;
    }>();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.bucket).toBe("day");
    expect(body.series).toEqual([
      expect.objectContaining({
        bucketStart: "2026-03-01",
        issuedCount: 3,
        learnerClaimCount: 1,
      }),
      expect.objectContaining({
        bucketStart: "2026-03-02",
        issuedCount: 2,
        learnerClaimCount: 1,
      }),
    ]);
    expect(mockedGetTenantReportingTrendsDb).toHaveBeenCalledWith(fakeDb, {
      tenantId: "tenant_123",
      from: "2026-03-01",
      to: "2026-03-31",
      badgeTemplateId: undefined,
      orgUnitId: undefined,
      bucket: "day",
    });
  });
});

describe("GET /v1/tenants/:tenantId/reporting/comparisons", () => {
  it("returns comparison rows for the requested grouping", async () => {
    const response = await app.request(
      "/v1/tenants/tenant_123/reporting/comparisons?from=2026-03-01&to=2026-03-31&groupBy=badgeTemplate",
      {
        headers: {
          Cookie: "better-auth.session_token=session-token",
        },
      },
      createEnv(),
    );
    const body = await response.json<{
      status: string;
      rows: Array<{
        groupBy: string;
        groupId: string;
        counts: {
          issuedCount: number;
        };
        rates: {
          shareRate: number;
        };
      }>;
    }>();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.rows).toEqual([
      expect.objectContaining({
        groupBy: "badgeTemplate",
        groupId: "badge_template_001",
        counts: expect.objectContaining({
          issuedCount: 9,
        }),
        rates: expect.objectContaining({
          shareRate: 33.3,
        }),
      }),
    ]);
    expect(mockedGetTenantReportingComparisonsDb).toHaveBeenCalledWith(fakeDb, {
      tenantId: "tenant_123",
      from: "2026-03-01",
      to: "2026-03-31",
      badgeTemplateId: undefined,
      orgUnitId: undefined,
      groupBy: "badgeTemplate",
    });
  });
});
