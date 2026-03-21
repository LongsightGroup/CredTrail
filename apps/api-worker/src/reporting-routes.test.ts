import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetTenantReportingOverview,
  mockedResolveBetterAuthPrincipal,
  mockedResolveBetterAuthRequestedTenant,
} = vi.hoisted(() => {
  return {
    mockedGetTenantReportingOverview: vi.fn(),
    mockedResolveBetterAuthPrincipal: vi.fn(),
    mockedResolveBetterAuthRequestedTenant: vi.fn(),
  };
});

vi.mock("@credtrail/db", async () => {
  const actual = await vi.importActual<typeof import("@credtrail/db")>("@credtrail/db");

  return {
    ...actual,
    findTenantMembership: vi.fn(),
    getTenantReportingOverview: mockedGetTenantReportingOverview,
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

import { findTenantMembership, getTenantReportingOverview, type SqlDatabase } from "@credtrail/db";
import { createPostgresDatabase } from "@credtrail/db/postgres";

import { app } from "./index";

const mockedFindTenantMembership = vi.mocked(findTenantMembership);
const mockedCreatePostgresDatabase = vi.mocked(createPostgresDatabase);
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
          available: false,
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
