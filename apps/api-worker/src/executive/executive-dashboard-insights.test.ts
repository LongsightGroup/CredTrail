import { describe, expect, it } from "vitest";

import { buildExecutiveDashboardInsights } from "./executive-dashboard-insights";
import type { TenantExecutiveDashboardRecord } from "./executive-rollup-loader";

const sampleExecutiveDashboard = (
  overrides?: Partial<TenantExecutiveDashboardRecord["rollup"]>,
): TenantExecutiveDashboardRecord => {
  return {
    tenantId: "tenant_123",
    access: {
      tenantId: "tenant_123",
      membershipRole: "viewer",
      visibility: "scoped",
      scopedOrgUnitIds: ["tenant_123:org:college-eng"],
    },
    defaults: {
      audience: "college",
      window: "last-90-days",
      focusOrgUnitId: "tenant_123:org:college-eng",
      focusUnitType: "college",
      comparisonLevel: "department",
      comparisonGroupBy: "orgUnit",
      reportingFilters: {
        issuedFrom: "2025-12-23",
        issuedTo: "2026-03-22",
        badgeTemplateId: undefined,
        orgUnitId: undefined,
        state: "active",
      },
      hierarchyFilters: {
        issuedFrom: "2025-12-23",
        issuedTo: "2026-03-22",
        badgeTemplateId: undefined,
        orgUnitId: undefined,
        state: "active",
        focusOrgUnitId: "tenant_123:org:college-eng",
        level: "department",
      },
      pathState: {
        audience: "college",
        window: "last-90-days",
        state: "active",
        focusOrgUnitId: "tenant_123:org:college-eng",
        comparisonLevel: "department",
      },
    },
    navigation: {
      current: {
        kind: "drilldown",
        label: "College of Engineering",
        focusOrgUnitId: "tenant_123:org:college-eng",
        comparisonLevel: "department",
        href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng&comparisonLevel=department",
      },
      breadcrumbs: [
        {
          kind: "drilldown",
          label: "Tenant 123 Institution",
          focusOrgUnitId: "tenant_123:org:institution",
          comparisonLevel: "college",
          href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Ainstitution&comparisonLevel=college",
        },
        {
          kind: "drilldown",
          label: "College of Engineering",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
          href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng&comparisonLevel=department",
        },
      ],
      parent: {
        kind: "drilldown",
        label: "Tenant 123 Institution",
        focusOrgUnitId: "tenant_123:org:institution",
        comparisonLevel: "college",
        href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Ainstitution&comparisonLevel=college",
      },
      back: {
        kind: "drilldown",
        label: "Tenant 123 Institution",
        focusOrgUnitId: "tenant_123:org:institution",
        comparisonLevel: "college",
        href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Ainstitution&comparisonLevel=college",
      },
      drilldowns: [
        {
          kind: "drilldown",
          label: "Computer Science",
          focusOrgUnitId: "tenant_123:org:department-cs",
          comparisonLevel: "program",
          href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Adepartment-cs&comparisonLevel=program",
        },
        {
          kind: "drilldown",
          label: "Mathematics",
          focusOrgUnitId: "tenant_123:org:department-math",
          comparisonLevel: "department",
          href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Adepartment-math&comparisonLevel=department",
        },
      ],
    },
    orgUnits: [],
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
      bucket: "day",
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
      audience: "college",
      focusOrgUnitId: "tenant_123:org:college-eng",
      comparisonLevel: "department",
      kpis: [
        {
          key: "issued",
          label: "Issued badges",
          description: "Issuance volume in the current slice.",
          source: "assertions",
          available: true,
          availabilityNote: null,
          emphasis: "primary",
        },
        {
          key: "claimRate",
          label: "Claim rate",
          description: "Claim activity in the current slice.",
          source: "assertion_engagement_events + assertions",
          available: true,
          availabilityNote: null,
          emphasis: "supporting",
        },
      ],
      modules: [
        {
          id: "comparison-summary",
          kind: "comparison_summary",
          title: "Compare departments",
          description: "Compare visible departments.",
          audience: "college",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
          groupBy: "orgUnit",
        },
        {
          id: "top-movers-claim-rate",
          kind: "top_movers",
          title: "Highest claim rate across departments",
          description: "Surface the strongest claim behavior.",
          audience: "college",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
          groupBy: "orgUnit",
          metricKey: "claimRate",
          ranking: "top",
        },
        {
          id: "lagging-share-rate",
          kind: "laggards",
          title: "Lowest share rate across departments",
          description: "Surface the weakest sharing behavior.",
          audience: "college",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
          groupBy: "orgUnit",
          metricKey: "shareRate",
          ranking: "bottom",
        },
        {
          id: "drilldown",
          kind: "drilldown",
          title: "Drill into departments",
          description: "Carry the current slice into deeper executive review.",
          audience: "college",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
          groupBy: "orgUnit",
        },
      ],
    },
    rollup: {
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
        {
          level: "department",
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
        {
          level: "department",
          orgUnitId: "tenant_123:org:department-history",
          displayName: "History",
          parentOrgUnitId: "tenant_123:org:college-eng",
          issuedCount: 2,
          publicBadgeViewCount: 3,
          verificationViewCount: 1,
          shareClickCount: 0,
          learnerClaimCount: 1,
          walletAcceptCount: 0,
          claimRate: 50,
          shareRate: 0,
        },
      ],
      generatedAt: "2026-03-22T12:00:00.000Z",
      ...overrides,
    },
  };
};

describe("buildExecutiveDashboardInsights", () => {
  it("derives top-issued comparison stories from current rollup rows", () => {
    const insights = buildExecutiveDashboardInsights(sampleExecutiveDashboard());
    const comparison = insights.modules.find((module) => module.id === "comparison-summary");

    expect(comparison?.visual?.kind).toBe("comparison-ranked");
    expect(comparison?.visual?.series[0]).toMatchObject({
      label: "Computer Science",
      value: 10,
    });
    expect(comparison?.visual?.summaryOverride).toContain("issued badges");
  });

  it("builds rate leader and laggard stories with minimum-issued protection", () => {
    const insights = buildExecutiveDashboardInsights(sampleExecutiveDashboard());
    const claimLeader = insights.modules.find((module) => module.id === "top-movers-claim-rate");
    const shareLaggard = insights.modules.find((module) => module.id === "lagging-share-rate");

    expect(claimLeader?.visual?.series[0]).toMatchObject({
      label: "Mathematics",
      value: 50,
    });
    expect(claimLeader?.visual?.summaryOverride).toContain("claim rate");
    expect(shareLaggard?.visual?.series[0]).toMatchObject({
      label: "Mathematics",
      value: 25,
    });
    expect(shareLaggard?.note).toContain("lowest share rates");
    expect(shareLaggard?.visual?.series.every((series) => series.label !== "History")).toBe(true);
  });

  it("falls back to a focus-summary story when no honest comparison exists", () => {
    const dashboard = sampleExecutiveDashboard({
      focusUnitType: "college",
      comparisonLevel: "college",
      rows: [],
    });

    dashboard.kpiCatalog.modules = [
      {
        id: "focus-summary",
        kind: "focus_summary",
        title: "Current college summary",
        description: "Keep the executive story centered on this college.",
        audience: "college",
        focusOrgUnitId: "tenant_123:org:college-eng",
        comparisonLevel: "college",
      },
    ];

    const insights = buildExecutiveDashboardInsights(dashboard);

    const firstModule = insights.modules[0];

    expect(firstModule).toBeDefined();
    expect(firstModule?.id).toBe("focus-summary");
    expect(firstModule?.summaryItems).toEqual(
      expect.arrayContaining([
        { label: "Focus", value: "College of Engineering" },
        { label: "Audience", value: "College" },
      ]),
    );
    expect(firstModule?.visual).toBeUndefined();
  });

  it("replaces the placeholder drilldown note with real executive route-family links", () => {
    const insights = buildExecutiveDashboardInsights(sampleExecutiveDashboard());
    const drilldown = insights.modules.find((module) => module.id === "drilldown");

    expect(drilldown?.note).toContain("Stay inside the executive route family");
    expect(drilldown?.note).not.toContain("Phase 23 will extend");
    expect(drilldown?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Computer Science",
          href: "/tenants/tenant_123/executive?window=last-90-days&audience=college&state=active&focusOrgUnitId=tenant_123%3Aorg%3Adepartment-cs&comparisonLevel=program",
        }),
      ]),
    );
  });
});
