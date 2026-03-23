import { describe, expect, it } from "vitest";

import { pageAssetPath } from "../ui/page-assets";
import { renderExecutiveDashboardPage, renderExecutiveUnavailablePage } from "./executive-dashboard-page";
import type { TenantExecutiveDashboardRecord } from "./executive-rollup-loader";

const sampleExecutiveDashboard = (): TenantExecutiveDashboardRecord => {
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
        from: "2025-12-23",
        to: "2026-03-22",
        badgeTemplateId: undefined,
        orgUnitId: undefined,
        state: "active",
        focusOrgUnitId: "tenant_123:org:college-eng",
        level: "department",
      },
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
          valueKind: "count",
          emphasis: "primary",
        },
        {
          key: "claimRate",
          label: "Claim rate",
          description: "Claim activity in the current slice.",
          valueKind: "percentage",
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
      ],
      generatedAt: "2026-03-22T12:00:00.000Z",
    },
  };
};

describe("renderExecutiveDashboardPage", () => {
  it("renders a dedicated executive shell with linked assets instead of inline route-local styles", () => {
    const html = renderExecutiveDashboardPage(sampleExecutiveDashboard());

    expect(html).toContain("<h1>Executive Dashboard</h1>");
    expect(html).toContain("Read-only executive summary");
    expect(html).toContain("Executive snapshot");
    expect(html).toContain("Top comparison rows");
    expect(html).toContain(pageAssetPath("foundationCss"));
    expect(html).toContain(pageAssetPath("executiveDashboardCss"));
    expect(html).not.toContain(".executive-hero {");
    expect(html).toContain('body data-variant="open"');
  });

  it("keeps the first screen KPI-first and preserves the executive JSON handoff", () => {
    const html = renderExecutiveDashboardPage(sampleExecutiveDashboard());

    expect(html).toContain('data-executive-audience="college"');
    expect(html).toContain("Issued badges");
    expect(html).toContain("18");
    expect(html).toContain("Compare departments");
    expect(html).toContain('/v1/tenants/tenant_123/executive?');
    expect(html).toContain("state=active");
    expect(html).toContain("focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng");
  });

  it("renders the unavailable state through the same dedicated executive asset shell", () => {
    const html = renderExecutiveUnavailablePage();

    expect(html).toContain("Executive dashboard unavailable");
    expect(html).toContain(pageAssetPath("executiveDashboardCss"));
    expect(html).not.toContain("Institution Admin");
  });
});
