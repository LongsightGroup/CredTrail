import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedCreateLearnerRecordEntry,
  mockedListLearnerRecordEntries,
  mockedPatchLearnerRecordEntry,
  mockedFindTenantMembership,
  mockedResolveBetterAuthPrincipal,
  mockedResolveBetterAuthRequestedTenant,
} = vi.hoisted(() => {
  return {
    mockedCreateLearnerRecordEntry: vi.fn(),
    mockedListLearnerRecordEntries: vi.fn(),
    mockedPatchLearnerRecordEntry: vi.fn(),
    mockedFindTenantMembership: vi.fn(),
    mockedResolveBetterAuthPrincipal: vi.fn(),
    mockedResolveBetterAuthRequestedTenant: vi.fn(),
  };
});

vi.mock("@credtrail/db", async () => {
  const actual = await vi.importActual<typeof import("@credtrail/db")>("@credtrail/db");

  return {
    ...actual,
    createLearnerRecordEntry: mockedCreateLearnerRecordEntry,
    listLearnerRecordEntries: mockedListLearnerRecordEntries,
    patchLearnerRecordEntry: mockedPatchLearnerRecordEntry,
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

import { app } from "../index";

const createEnv = () => {
  return {
    APP_ENV: "test",
    DATABASE_URL: "postgres://credtrail-test.local/db",
    BADGE_OBJECTS: {} as R2Bucket,
    PLATFORM_DOMAIN: "credtrail.test",
  };
};

const sampleLearnerRecordEntry = () => {
  return {
    id: "lre_123",
    tenantId: "tenant_123",
    learnerProfileId: "lpr_123",
    trustLevel: "issuer_verified" as const,
    recordType: "course" as const,
    status: "active" as const,
    title: "Intro to Cybersecurity",
    description: "Completed with distinction.",
    issuerName: "CredTrail University",
    issuerUserId: "usr_admin",
    sourceSystem: "credtrail_admin" as const,
    sourceRecordId: null,
    issuedAt: "2026-03-24T15:00:00.000Z",
    revisedAt: null,
    revokedAt: null,
    evidenceLinksJson:
      '["https://credtrail.example.edu/evidence/intro-cybersecurity/project"]',
    detailsJson: '{"grade":"A"}',
    createdAt: "2026-03-24T15:00:00.000Z",
    updatedAt: "2026-03-24T15:00:00.000Z",
  };
};

beforeEach(() => {
  mockedCreateLearnerRecordEntry.mockReset();
  mockedListLearnerRecordEntries.mockReset();
  mockedPatchLearnerRecordEntry.mockReset();
  mockedFindTenantMembership.mockReset();
  mockedResolveBetterAuthPrincipal.mockReset();
  mockedResolveBetterAuthRequestedTenant.mockReset();

  mockedFindTenantMembership.mockResolvedValue({
    tenantId: "tenant_123",
    userId: "usr_admin",
    role: "admin",
    createdAt: "2026-03-24T15:00:00.000Z",
    updatedAt: "2026-03-24T15:00:00.000Z",
  });
  mockedResolveBetterAuthPrincipal.mockResolvedValue({
    userId: "usr_admin",
    authSessionId: "ses_admin",
    authMethod: "better_auth",
    expiresAt: "2026-03-26T15:00:00.000Z",
  });
  mockedResolveBetterAuthRequestedTenant.mockResolvedValue({
    tenantId: "tenant_123",
    source: "route",
    authoritative: true,
  });
  mockedCreateLearnerRecordEntry.mockResolvedValue(sampleLearnerRecordEntry());
  mockedListLearnerRecordEntries.mockResolvedValue([sampleLearnerRecordEntry()]);
  mockedPatchLearnerRecordEntry.mockResolvedValue(sampleLearnerRecordEntry());
});

describe("learner-record routes", () => {
  it("allows a tenant admin to create and list learner-record entries", async () => {
    const createResponse = await app.request(
      "/v1/tenants/tenant_123/learner-record-entries",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "better-auth.session_token=better-auth-test",
        },
        body: JSON.stringify({
          learnerProfileId: "lpr_123",
          trustLevel: "issuer_verified",
          recordType: "course",
          title: "Intro to Cybersecurity",
          description: "Completed with distinction.",
          status: "active",
          provenance: {
            issuerName: "CredTrail University",
            sourceSystem: "credtrail_admin",
            issuedAt: "2026-03-24T15:00:00.000Z",
            evidenceLinks: ["https://credtrail.example.edu/evidence/intro-cybersecurity/project"],
          },
          details: {
            grade: "A",
          },
        }),
      },
      createEnv(),
    );

    expect(createResponse.status).toBe(201);
    expect(await createResponse.json()).toEqual({
      status: "created",
      item: {
        id: "lre_123",
        kind: "record_entry",
        tenantId: "tenant_123",
        learnerProfileId: "lpr_123",
        trustLevel: "issuer_verified",
        status: "active",
        recordType: "course",
        title: "Intro to Cybersecurity",
        description: "Completed with distinction.",
        sourceEntryId: "lre_123",
        badgeTemplateId: null,
        publicBadgeId: null,
        editable: true,
        details: {
          grade: "A",
        },
        provenance: {
          issuerName: "CredTrail University",
          issuerUserId: "usr_admin",
          sourceSystem: "credtrail_admin",
          sourceRecordId: null,
          issuedAt: "2026-03-24T15:00:00.000Z",
          revisedAt: null,
          revokedAt: null,
          evidenceLinks: [
            "https://credtrail.example.edu/evidence/intro-cybersecurity/project",
          ],
        },
      },
    });
    expect(mockedCreateLearnerRecordEntry).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: "tenant_123",
        learnerProfileId: "lpr_123",
        trustLevel: "issuer_verified",
        recordType: "course",
        title: "Intro to Cybersecurity",
      }),
    );

    const listResponse = await app.request(
      "/v1/tenants/tenant_123/learner-record-entries?learnerProfileId=lpr_123",
      {
        headers: {
          cookie: "better-auth.session_token=better-auth-test",
        },
      },
      createEnv(),
    );

    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual({
      tenantId: "tenant_123",
      learnerProfileId: "lpr_123",
      count: 1,
      items: [
        {
          id: "lre_123",
          kind: "record_entry",
          tenantId: "tenant_123",
          learnerProfileId: "lpr_123",
          trustLevel: "issuer_verified",
          status: "active",
          recordType: "course",
          title: "Intro to Cybersecurity",
          description: "Completed with distinction.",
          sourceEntryId: "lre_123",
          badgeTemplateId: null,
          publicBadgeId: null,
          editable: true,
          details: {
            grade: "A",
          },
          provenance: {
            issuerName: "CredTrail University",
            issuerUserId: "usr_admin",
            sourceSystem: "credtrail_admin",
            sourceRecordId: null,
            issuedAt: "2026-03-24T15:00:00.000Z",
            revisedAt: null,
            revokedAt: null,
            evidenceLinks: [
              "https://credtrail.example.edu/evidence/intro-cybersecurity/project",
            ],
          },
        },
      ],
    });
    expect(mockedListLearnerRecordEntries).toHaveBeenCalledWith(expect.any(Object), {
      tenantId: "tenant_123",
      learnerProfileId: "lpr_123",
      trustLevel: undefined,
      status: undefined,
    });
  });

  it("rejects non-admin access to learner-record management routes", async () => {
    mockedFindTenantMembership.mockResolvedValueOnce({
      tenantId: "tenant_123",
      userId: "usr_viewer",
      role: "viewer",
      createdAt: "2026-03-24T15:00:00.000Z",
      updatedAt: "2026-03-24T15:00:00.000Z",
    });

    const response = await app.request(
      "/v1/tenants/tenant_123/learner-record-entries?learnerProfileId=lpr_123",
      {
        headers: {
          cookie: "better-auth.session_token=better-auth-test",
        },
      },
      createEnv(),
    );

    expect(response.status).toBe(403);
    expect(mockedListLearnerRecordEntries).not.toHaveBeenCalled();
  });

  it("allows updates that preserve the explicit trust and provenance contract", async () => {
    const response = await app.request(
      "/v1/tenants/tenant_123/learner-record-entries/lre_123",
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: "better-auth.session_token=better-auth-test",
        },
        body: JSON.stringify({
          description: "Completed with distinction and capstone presentation.",
          status: "revoked",
          provenance: {
            issuerName: "CredTrail University",
            sourceSystem: "credtrail_admin",
            issuedAt: "2026-03-24T15:00:00.000Z",
            revokedAt: "2026-03-25T15:00:00.000Z",
            evidenceLinks: ["https://credtrail.example.edu/evidence/intro-cybersecurity/project"],
          },
        }),
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "updated",
      item: {
        id: "lre_123",
        kind: "record_entry",
        tenantId: "tenant_123",
        learnerProfileId: "lpr_123",
        trustLevel: "issuer_verified",
        status: "active",
        recordType: "course",
        title: "Intro to Cybersecurity",
        description: "Completed with distinction.",
        sourceEntryId: "lre_123",
        badgeTemplateId: null,
        publicBadgeId: null,
        editable: true,
        details: {
          grade: "A",
        },
        provenance: {
          issuerName: "CredTrail University",
          issuerUserId: "usr_admin",
          sourceSystem: "credtrail_admin",
          sourceRecordId: null,
          issuedAt: "2026-03-24T15:00:00.000Z",
          revisedAt: null,
          revokedAt: null,
          evidenceLinks: [
            "https://credtrail.example.edu/evidence/intro-cybersecurity/project",
          ],
        },
      },
    });
    expect(mockedPatchLearnerRecordEntry).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: "tenant_123",
        entryId: "lre_123",
        description: "Completed with distinction and capstone presentation.",
        status: "revoked",
      }),
    );
  });
});
