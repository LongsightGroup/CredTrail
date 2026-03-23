import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetTenantExecutiveRollup,
  mockedGetTenantReportingOverview,
  mockedGetTenantReportingTrends,
  mockedListTenantMembershipOrgUnitScopes,
  mockedListTenantOrgUnits,
} = vi.hoisted(() => {
  return {
    mockedGetTenantExecutiveRollup: vi.fn(),
    mockedGetTenantReportingOverview: vi.fn(),
    mockedGetTenantReportingTrends: vi.fn(),
    mockedListTenantMembershipOrgUnitScopes: vi.fn(),
    mockedListTenantOrgUnits: vi.fn(),
  };
});

vi.mock("@credtrail/db", async () => {
  const actual = await vi.importActual<typeof import("@credtrail/db")>("@credtrail/db");

  return {
    ...actual,
    getTenantExecutiveRollup: mockedGetTenantExecutiveRollup,
    getTenantReportingOverview: mockedGetTenantReportingOverview,
    getTenantReportingTrends: mockedGetTenantReportingTrends,
    listTenantMembershipOrgUnitScopes: mockedListTenantMembershipOrgUnitScopes,
    listTenantOrgUnits: mockedListTenantOrgUnits,
  };
});

import {
  getTenantExecutiveRollup,
  getTenantReportingOverview,
  getTenantReportingTrends,
  listTenantMembershipOrgUnitScopes,
  listTenantOrgUnits,
  type SqlDatabase,
  type TenantMembershipOrgUnitScopeRecord,
  type TenantOrgUnitRecord,
} from "@credtrail/db";

import { loadTenantExecutiveDashboard } from "./executive-rollup-loader";

const mockedGetTenantExecutiveRollupDb = vi.mocked(getTenantExecutiveRollup);
const mockedGetTenantReportingOverviewDb = vi.mocked(getTenantReportingOverview);
const mockedGetTenantReportingTrendsDb = vi.mocked(getTenantReportingTrends);
const mockedListTenantMembershipOrgUnitScopesDb = vi.mocked(listTenantMembershipOrgUnitScopes);
const mockedListTenantOrgUnitsDb = vi.mocked(listTenantOrgUnits);

const fakeDb = {
  prepare: vi.fn(),
} as unknown as SqlDatabase;

const sampleExecutiveOrgUnits = (): TenantOrgUnitRecord[] => {
  return [
    {
      id: "tenant_123:org:institution",
      tenantId: "tenant_123",
      unitType: "institution",
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
      unitType: "college",
      slug: "college-eng",
      displayName: "College of Engineering",
      parentOrgUnitId: "tenant_123:org:institution",
      createdByUserId: "usr_admin",
      isActive: true,
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
    },
    {
      id: "tenant_123:org:department-cs",
      tenantId: "tenant_123",
      unitType: "department",
      slug: "department-cs",
      displayName: "Computer Science",
      parentOrgUnitId: "tenant_123:org:college-eng",
      createdByUserId: "usr_admin",
      isActive: true,
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
    },
    {
      id: "tenant_123:org:program-cs",
      tenantId: "tenant_123",
      unitType: "program",
      slug: "program-cs",
      displayName: "Computer Science Program",
      parentOrgUnitId: "tenant_123:org:department-cs",
      createdByUserId: "usr_admin",
      isActive: true,
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
    },
  ];
};

const sampleScope = (
  overrides: Partial<TenantMembershipOrgUnitScopeRecord> = {},
): TenantMembershipOrgUnitScopeRecord => {
  return {
    tenantId: "tenant_123",
    userId: "usr_exec",
    orgUnitId: "tenant_123:org:college-eng",
    role: "issuer",
    createdByUserId: "usr_admin",
    createdAt: "2026-03-21T12:00:00.000Z",
    updatedAt: "2026-03-21T12:00:00.000Z",
    ...overrides,
  };
};

beforeEach(() => {
  mockedListTenantMembershipOrgUnitScopesDb.mockReset();
  mockedListTenantOrgUnitsDb.mockReset();
  mockedGetTenantReportingOverviewDb.mockReset();
  mockedGetTenantReportingTrendsDb.mockReset();
  mockedGetTenantExecutiveRollupDb.mockReset();

  mockedListTenantOrgUnitsDb.mockResolvedValue(sampleExecutiveOrgUnits());
  mockedGetTenantReportingOverviewDb.mockResolvedValue({
    tenantId: "tenant_123",
    filters: {
      issuedFrom: "2025-12-23",
      issuedTo: "2026-03-22",
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
      claimRate: 0.5,
      shareRate: 0.25,
    },
    generatedAt: "2026-03-22T12:00:00.000Z",
  });
  mockedGetTenantReportingTrendsDb.mockResolvedValue({
    tenantId: "tenant_123",
    filters: {
      from: "2025-12-23",
      to: "2026-03-22",
      badgeTemplateId: null,
      orgUnitId: null,
      state: null,
    },
    bucket: "day",
    series: [
      {
        bucketStart: "2026-03-20",
        issuedCount: 2,
        publicBadgeViewCount: 3,
        verificationViewCount: 1,
        shareClickCount: 1,
        learnerClaimCount: 1,
        walletAcceptCount: 0,
      },
    ],
    generatedAt: "2026-03-22T12:00:00.000Z",
  });
});

describe("loadTenantExecutiveDashboard", () => {
  it("builds a tenant-wide system executive payload from current reporting truth", async () => {
    mockedGetTenantExecutiveRollupDb.mockResolvedValue({
      tenantId: "tenant_123",
      focusOrgUnitId: "tenant_123:org:institution",
      focusDisplayName: "Tenant 123 Institution",
      focusParentOrgUnitId: null,
      focusUnitType: "institution",
      comparisonLevel: "college",
      focusLineageOrgUnitIds: ["tenant_123:org:institution"],
      filters: {
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: null,
        orgUnitId: null,
        state: null,
      },
      rows: [],
      generatedAt: "2026-03-22T12:00:00.000Z",
    });

    const result = await loadTenantExecutiveDashboard({
      db: fakeDb,
      tenantId: "tenant_123",
      userId: "usr_admin",
      membershipRole: "admin",
      query: {},
      today: "2026-03-22",
    });

    expect(result).toMatchObject({
      tenantId: "tenant_123",
      access: {
        visibility: "tenant",
        scopedOrgUnitIds: [],
      },
      defaults: {
        audience: "system",
        focusOrgUnitId: "tenant_123:org:institution",
        comparisonLevel: "college",
      },
      kpiCatalog: {
        audience: "system",
      },
    });
    expect(mockedGetTenantExecutiveRollupDb).toHaveBeenCalledWith(fakeDb, {
      tenantId: "tenant_123",
      from: "2025-12-23",
      to: "2026-03-22",
      badgeTemplateId: undefined,
      orgUnitId: undefined,
      state: undefined,
      focusOrgUnitId: "tenant_123:org:institution",
      comparisonLevel: "college",
      scopedRootOrgUnitIds: undefined,
    });
  });

  it("keeps scoped executive payloads rooted in the visible subtree", async () => {
    mockedListTenantMembershipOrgUnitScopesDb.mockResolvedValue([sampleScope()]);
    mockedGetTenantExecutiveRollupDb.mockResolvedValue({
      tenantId: "tenant_123",
      focusOrgUnitId: "tenant_123:org:college-eng",
      focusDisplayName: "College of Engineering",
      focusParentOrgUnitId: "tenant_123:org:institution",
      focusUnitType: "college",
      comparisonLevel: "department",
      focusLineageOrgUnitIds: ["tenant_123:org:institution", "tenant_123:org:college-eng"],
      filters: {
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: null,
        orgUnitId: null,
        state: null,
      },
      rows: [],
      generatedAt: "2026-03-22T12:00:00.000Z",
    });

    const result = await loadTenantExecutiveDashboard({
      db: fakeDb,
      tenantId: "tenant_123",
      userId: "usr_exec",
      membershipRole: "issuer",
      query: {},
      today: "2026-03-22",
    });

    expect(result).toMatchObject({
      access: {
        visibility: "scoped",
        scopedOrgUnitIds: ["tenant_123:org:college-eng"],
      },
      defaults: {
        audience: "college",
        focusOrgUnitId: "tenant_123:org:college-eng",
        comparisonLevel: "department",
      },
    });
    expect(mockedGetTenantExecutiveRollupDb).toHaveBeenCalledWith(fakeDb, {
      tenantId: "tenant_123",
      from: "2025-12-23",
      to: "2026-03-22",
      badgeTemplateId: undefined,
      orgUnitId: undefined,
      state: undefined,
      focusOrgUnitId: "tenant_123:org:college-eng",
      comparisonLevel: "department",
      scopedRootOrgUnitIds: ["tenant_123:org:college-eng"],
    });
  });

  it("builds visible breadcrumbs and deeper drilldown targets from the normalized executive slice", async () => {
    mockedListTenantMembershipOrgUnitScopesDb.mockResolvedValue([sampleScope()]);
    mockedGetTenantExecutiveRollupDb.mockResolvedValue({
      tenantId: "tenant_123",
      focusOrgUnitId: "tenant_123:org:college-eng",
      focusDisplayName: "College of Engineering",
      focusParentOrgUnitId: "tenant_123:org:institution",
      focusUnitType: "college",
      comparisonLevel: "department",
      focusLineageOrgUnitIds: ["tenant_123:org:institution", "tenant_123:org:college-eng"],
      filters: {
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: "badge_template_science",
        orgUnitId: null,
        state: "active",
      },
      rows: [
        {
          level: "department",
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
      ],
      generatedAt: "2026-03-22T12:00:00.000Z",
    });

    const result = await loadTenantExecutiveDashboard({
      db: fakeDb,
      tenantId: "tenant_123",
      userId: "usr_exec",
      membershipRole: "issuer",
      query: {
        state: "active",
        badgeTemplateId: "badge_template_science",
        focusOrgUnitId: "tenant_123:org:college-arts",
        comparisonLevel: "program",
      },
      today: "2026-03-22",
    });

    expect(result).toMatchObject({
      defaults: {
        focusOrgUnitId: "tenant_123:org:college-eng",
        comparisonLevel: "department",
        pathState: {
          window: "last-90-days",
          state: "active",
          badgeTemplateId: "badge_template_science",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
        },
      },
      navigation: {
        current: {
          kind: "drilldown",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
          href: "/tenants/tenant_123/executive?window=last-90-days&state=active&badgeTemplateId=badge_template_science&focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng&comparisonLevel=department",
        },
        breadcrumbs: [
          {
            kind: "drilldown",
            focusOrgUnitId: "tenant_123:org:college-eng",
            comparisonLevel: "department",
          },
        ],
        parent: null,
        back: null,
        drilldowns: [
          {
            kind: "drilldown",
            focusOrgUnitId: "tenant_123:org:department-cs",
            comparisonLevel: "program",
            href: "/tenants/tenant_123/executive?window=last-90-days&state=active&badgeTemplateId=badge_template_science&focusOrgUnitId=tenant_123%3Aorg%3Adepartment-cs&comparisonLevel=program",
          },
        ],
      },
    });
  });

  it("keeps terminal slices honest with focus-summary executive modules", async () => {
    mockedListTenantMembershipOrgUnitScopesDb.mockResolvedValue([
      sampleScope({
        orgUnitId: "tenant_123:org:program-cs",
        role: "viewer",
      }),
    ]);
    mockedGetTenantExecutiveRollupDb.mockResolvedValue({
      tenantId: "tenant_123",
      focusOrgUnitId: "tenant_123:org:program-cs",
      focusDisplayName: "Computer Science Program",
      focusParentOrgUnitId: "tenant_123:org:department-cs",
      focusUnitType: "program",
      comparisonLevel: "program",
      focusLineageOrgUnitIds: [
        "tenant_123:org:institution",
        "tenant_123:org:college-eng",
        "tenant_123:org:department-cs",
        "tenant_123:org:program-cs",
      ],
      filters: {
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: null,
        orgUnitId: null,
        state: null,
      },
      rows: [],
      generatedAt: "2026-03-22T12:00:00.000Z",
    });

    const result = await loadTenantExecutiveDashboard({
      db: fakeDb,
      tenantId: "tenant_123",
      userId: "usr_exec",
      membershipRole: "viewer",
      query: {},
      today: "2026-03-22",
    });

    expect(result?.defaults).toMatchObject({
      audience: "program",
      focusOrgUnitId: "tenant_123:org:program-cs",
      comparisonLevel: "program",
    });
    expect(result?.kpiCatalog.modules.map((module) => module.id)).toEqual([
      "focus-summary",
      "drilldown",
    ]);
    expect(result?.navigation).toMatchObject({
      current: {
        kind: "focus-summary",
        focusOrgUnitId: "tenant_123:org:program-cs",
        comparisonLevel: "program",
      },
      drilldowns: [],
    });
  });
});
