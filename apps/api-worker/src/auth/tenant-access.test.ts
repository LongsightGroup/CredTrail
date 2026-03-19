import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@credtrail/db", async () => {
  const actual = await vi.importActual<typeof import("@credtrail/db")>("@credtrail/db");

  return {
    ...actual,
    findTenantMembership: vi.fn(),
  };
});

import { findTenantMembership, type SqlDatabase, type TenantMembershipRecord } from "@credtrail/db";
import { ADMIN_ROLES, requirePrincipalTenantRole, type TenantAccessContext } from "./tenant-access";
import type { AuthenticatedPrincipal, RequestedTenantContext } from "./auth-context";

interface FakeBindings {
  BOOTSTRAP_ADMIN_TOKEN?: string;
}

type FakeContext = TenantAccessContext<FakeBindings>;

const mockedFindTenantMembership = vi.mocked(findTenantMembership);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const createContext = (): FakeContext => {
  return {
    env: {},
    req: {
      header: vi.fn(),
    },
    json: (payload: unknown, status = 200) => {
      return Response.json(payload, {
        status,
      });
    },
  };
};

const samplePrincipal = (): AuthenticatedPrincipal => {
  return {
    userId: "usr_123",
    authSessionId: "ses_123",
    authMethod: "better_auth",
    expiresAt: "2026-02-18T22:00:00.000Z",
  };
};

const requestedTenant = (overrides?: Partial<RequestedTenantContext>): RequestedTenantContext => {
  return {
    tenantId: "tenant_requested",
    source: "route",
    authoritative: true,
    ...overrides,
  };
};

const membershipRecord = (overrides?: Partial<TenantMembershipRecord>): TenantMembershipRecord => {
  return {
    tenantId: "tenant_requested",
    userId: "usr_123",
    role: "admin",
    createdAt: "2026-02-18T12:00:00.000Z",
    updatedAt: "2026-02-18T12:00:00.000Z",
    ...overrides,
  };
};

beforeEach(() => {
  mockedFindTenantMembership.mockReset();
});

describe("requirePrincipalTenantRole", () => {
  it("returns 401 when no authenticated principal is available", async () => {
    const response = await requirePrincipalTenantRole({
      context: createContext(),
      principal: null,
      requestedTenant: requestedTenant(),
      allowedRoles: ADMIN_ROLES,
      resolveDatabase: () => fakeDb,
    });

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(401);
    await expect((response as Response).json()).resolves.toEqual({
      error: "Not authenticated",
    });
  });

  it("authorizes using principal user id plus requested tenant membership lookup", async () => {
    mockedFindTenantMembership.mockResolvedValue(membershipRecord());

    const result = await requirePrincipalTenantRole({
      context: createContext(),
      principal: samplePrincipal(),
      requestedTenant: requestedTenant({
        tenantId: "tenant_path",
        source: "legacy_session",
        authoritative: false,
      }),
      allowedRoles: ADMIN_ROLES,
      resolveDatabase: () => fakeDb,
    });

    expect(mockedFindTenantMembership).toHaveBeenCalledWith(fakeDb, "tenant_path", "usr_123");
    expect(result).toEqual({
      principal: samplePrincipal(),
      requestedTenant: requestedTenant({
        tenantId: "tenant_path",
        source: "legacy_session",
        authoritative: false,
      }),
      membershipRole: "admin",
    });
  });

  it("returns 403 when the requested tenant membership role is insufficient", async () => {
    mockedFindTenantMembership.mockResolvedValue(
      membershipRecord({
        role: "viewer",
      }),
    );

    const response = await requirePrincipalTenantRole({
      context: createContext(),
      principal: samplePrincipal(),
      requestedTenant: requestedTenant(),
      allowedRoles: ADMIN_ROLES,
      resolveDatabase: () => fakeDb,
    });

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(403);
    await expect((response as Response).json()).resolves.toEqual({
      error: "Insufficient role for requested action",
    });
  });
});
