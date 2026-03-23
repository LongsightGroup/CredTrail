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
      ],
      generatedAt: "2026-03-22T12:00:00.000Z",
    },
  };
};

describe("renderExecutiveDashboardPage", () => {
  it("renders a dedicated executive shell with linked assets instead of inline route-local styles", () => {
    const html = renderExecutiveDashboardPage(sampleExecutiveDashboard());

    expect(html).toContain("Executive Dashboard</p>");
    expect(html).toContain("College of Engineering credential momentum");
    expect(html).toContain("Executive snapshot");
    expect(html).toContain('data-reporting-visual-kind="trend-series"');
    expect(html).toContain('data-reporting-visual-kind="comparison-ranked"');
    expect(html).toContain(pageAssetPath("foundationCss"));
    expect(html).toContain(pageAssetPath("executiveDashboardCss"));
    expect(html).not.toContain(".executive-hero {");
    expect(html).toContain('body data-variant="open"');
  });

  it("keeps the first screen KPI-first and preserves the executive JSON handoff", () => {
    const html = renderExecutiveDashboardPage(sampleExecutiveDashboard());

    expect(html).toContain('data-executive-audience="college"');
    expect(html).toContain("College executive view");
    expect(html).toContain("College of Engineering credential momentum");
    expect(html).toContain("Issued badges");
    expect(html).toContain("18");
    expect(html).toContain("Compare departments");
    expect(html).toContain(
      "/v1/tenants/tenant_123/executive?window=last-90-days&amp;audience=college&amp;state=active&amp;focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng&amp;comparisonLevel=department",
    );
    expect(html).not.toContain("issuedFrom=2025-12-23");
    expect(html).not.toContain("issuedTo=2026-03-22");
    expect(html.indexOf('aria-label="Executive KPI summary"')).toBeLessThan(
      html.indexOf('data-reporting-visual-kind="trend-series"'),
    );
    expect(html.indexOf('data-reporting-visual-kind="trend-series"')).toBeLessThan(
      html.indexOf('data-reporting-visual-kind="comparison-ranked"'),
    );
  });

  it("changes hero framing for system slices and keeps sparse slices intentional", () => {
    const systemDashboard = sampleExecutiveDashboard();
    systemDashboard.defaults.audience = "system";
    systemDashboard.defaults.focusUnitType = "institution";
    systemDashboard.rollup.focusUnitType = "institution";
    systemDashboard.rollup.focusDisplayName = "Tenant 123 Institution";
    systemDashboard.rollup.comparisonLevel = "college";

    const sparseDashboard = sampleExecutiveDashboard();
    sparseDashboard.rollup.rows = [];
    sparseDashboard.kpiCatalog.modules = [
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

    const systemHtml = renderExecutiveDashboardPage(systemDashboard);
    const sparseHtml = renderExecutiveDashboardPage(sparseDashboard);

    expect(systemHtml).toContain("System-level executive view");
    expect(systemHtml).toContain("System credential momentum");
    expect(sparseHtml).toContain("Focused slice");
    expect(sparseHtml).toContain("Summary-first view");
    expect(sparseHtml).toContain(
      "This view stays intentionally narrow so leaders can trust the current slice instead of reading invented rankings.",
    );
  });

  it("renders breadcrumbed drilldown links that stay on the executive route family", () => {
    const html = renderExecutiveDashboardPage(sampleExecutiveDashboard());

    expect(html).toContain('aria-label="Executive drilldown path"');
    expect(html).toContain(">Tenant 123 Institution<");
    expect(html).toContain(">College of Engineering<");
    expect(html).toContain(">Back to Tenant 123 Institution<");
    expect(html).toContain(">Computer Science<");
    expect(html).toContain(">Mathematics<");
    expect(html).toContain(
      "/tenants/tenant_123/executive?window=last-90-days&amp;audience=college&amp;state=active&amp;focusOrgUnitId=tenant_123%3Aorg%3Adepartment-cs&amp;comparisonLevel=program",
    );
    expect(html).not.toContain("/admin/reporting");
    expect(html).not.toContain("Phase 23 will extend the executive route family");
  });

  it("renders the unavailable state through the same dedicated executive asset shell", () => {
    const html = renderExecutiveUnavailablePage();

    expect(html).toContain("Executive dashboard unavailable");
    expect(html).toContain(pageAssetPath("executiveDashboardCss"));
    expect(html).not.toContain("Institution Admin");
  });
});
