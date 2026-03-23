import { describe, expect, it } from "vitest";
import {
  buildExecutiveDashboardPath,
  buildExecutiveDrilldownPath,
  buildExecutiveDashboardQueryEntries,
} from "./executive-dashboard-paths";

describe("executive dashboard paths", () => {
  it("keeps the executive landing route outside admin paths", () => {
    expect(
      buildExecutiveDashboardPath("tenant_123", {
        window: "last-30-days",
        focusOrgUnitId: "tenant_123:org:college-eng",
      }),
    ).toBe(
      "/tenants/tenant_123/executive?window=last-30-days&focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng",
    );
  });

  it("preserves drilldown state inside the executive route family", () => {
    expect(
      buildExecutiveDrilldownPath("tenant_123", {
        issuedFrom: "2026-01-01",
        issuedTo: "2026-03-22",
        state: "active",
        focusOrgUnitId: "tenant_123:org:college-eng",
        comparisonLevel: "department",
      }),
    ).toBe(
      "/tenants/tenant_123/executive?issuedFrom=2026-01-01&issuedTo=2026-03-22&state=active&focusOrgUnitId=tenant_123%3Aorg%3Acollege-eng&comparisonLevel=department",
    );
  });

  it("preserves the current executive filters when drilling deeper into a visible row", () => {
    expect(
      buildExecutiveDrilldownPath(
        "tenant_123",
        {
          window: "last-30-days",
          state: "active",
          badgeTemplateId: "badge_template_science",
          orgUnitId: "tenant_123:org:college-eng",
          focusOrgUnitId: "tenant_123:org:college-eng",
          comparisonLevel: "department",
        },
        {
          focusOrgUnitId: "tenant_123:org:department-cs",
          comparisonLevel: "program",
        },
      ),
    ).toBe(
      "/tenants/tenant_123/executive?window=last-30-days&state=active&badgeTemplateId=badge_template_science&orgUnitId=tenant_123%3Aorg%3Acollege-eng&focusOrgUnitId=tenant_123%3Aorg%3Adepartment-cs&comparisonLevel=program",
    );
  });

  it("builds stable query entries for future executive links without leaking into admin routes", () => {
    expect(
      buildExecutiveDashboardQueryEntries({
        window: "last-90-days",
        audience: "system",
        badgeTemplateId: "badge_template_science",
        orgUnitId: "tenant_123:org:college-eng",
        focusOrgUnitId: "tenant_123:org:college-eng",
        comparisonLevel: "department",
      }),
    ).toEqual([
      ["window", "last-90-days"],
      ["audience", "system"],
      ["badgeTemplateId", "badge_template_science"],
      ["orgUnitId", "tenant_123:org:college-eng"],
      ["focusOrgUnitId", "tenant_123:org:college-eng"],
      ["comparisonLevel", "department"],
    ]);
  });
});
