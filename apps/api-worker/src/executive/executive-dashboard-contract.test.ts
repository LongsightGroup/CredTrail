import { describe, expect, it } from "vitest";

import type { TenantOrgUnitRecord } from "@credtrail/db";

import { inferExecutiveDashboardDefaults } from "./executive-dashboard-contract";

const createOrgUnit = (
  overrides: Partial<TenantOrgUnitRecord> & Pick<TenantOrgUnitRecord, "id" | "unitType" | "displayName">,
): TenantOrgUnitRecord => {
  return {
    id: overrides.id,
    tenantId: overrides.tenantId ?? "tenant_123",
    unitType: overrides.unitType,
    slug: overrides.slug ?? overrides.id.split(":").at(-1) ?? "org-unit",
    displayName: overrides.displayName,
    parentOrgUnitId: overrides.parentOrgUnitId ?? null,
    createdByUserId: overrides.createdByUserId ?? "usr_admin",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-03-21T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-21T12:00:00.000Z",
  };
};

const sampleExecutiveOrgUnits = (): TenantOrgUnitRecord[] => {
  return [
    createOrgUnit({
      id: "tenant_123:org:institution",
      unitType: "institution",
      displayName: "Tenant 123 Institution",
    }),
    createOrgUnit({
      id: "tenant_123:org:college-arts",
      unitType: "college",
      displayName: "College of Arts",
      parentOrgUnitId: "tenant_123:org:institution",
    }),
    createOrgUnit({
      id: "tenant_123:org:college-eng",
      unitType: "college",
      displayName: "College of Engineering",
      parentOrgUnitId: "tenant_123:org:institution",
    }),
    createOrgUnit({
      id: "tenant_123:org:department-history",
      unitType: "department",
      displayName: "History",
      parentOrgUnitId: "tenant_123:org:college-arts",
    }),
    createOrgUnit({
      id: "tenant_123:org:department-cs",
      unitType: "department",
      displayName: "Computer Science",
      parentOrgUnitId: "tenant_123:org:college-eng",
    }),
    createOrgUnit({
      id: "tenant_123:org:department-math",
      unitType: "department",
      displayName: "Mathematics",
      parentOrgUnitId: "tenant_123:org:college-eng",
    }),
    createOrgUnit({
      id: "tenant_123:org:program-cs",
      unitType: "program",
      displayName: "BS Computer Science",
      parentOrgUnitId: "tenant_123:org:department-cs",
    }),
  ];
};

describe("inferExecutiveDashboardDefaults", () => {
  it("defaults tenant-wide executive access to a system audience and institution-root comparison", () => {
    expect(
      inferExecutiveDashboardDefaults({
        today: "2026-03-22",
        query: {},
        visibility: "tenant",
        scopedOrgUnitIds: [],
        orgUnits: sampleExecutiveOrgUnits(),
      }),
    ).toEqual({
      audience: "system",
      window: "last-90-days",
      focusOrgUnitId: "tenant_123:org:institution",
      comparisonLevel: "college",
      comparisonGroupBy: "orgUnit",
      reportingFilters: {
        issuedFrom: "2025-12-23",
        issuedTo: "2026-03-22",
      },
      hierarchyFilters: {
        issuedFrom: "2025-12-23",
        issuedTo: "2026-03-22",
        focusOrgUnitId: "tenant_123:org:institution",
        level: "college",
      },
    });
  });

  it("defaults scoped executive access to the visible root and preserves explicit reporting filters", () => {
    expect(
      inferExecutiveDashboardDefaults({
        today: "2026-03-22",
        query: {
          window: "last-30-days",
          badgeTemplateId: "badge_template_science",
          state: "active",
        },
        visibility: "scoped",
        scopedOrgUnitIds: ["tenant_123:org:college-eng"],
        orgUnits: sampleExecutiveOrgUnits(),
      }),
    ).toEqual({
      audience: "college",
      window: "last-30-days",
      focusOrgUnitId: "tenant_123:org:college-eng",
      comparisonLevel: "department",
      comparisonGroupBy: "orgUnit",
      reportingFilters: {
        issuedFrom: "2026-02-21",
        issuedTo: "2026-03-22",
        badgeTemplateId: "badge_template_science",
        state: "active",
      },
      hierarchyFilters: {
        issuedFrom: "2026-02-21",
        issuedTo: "2026-03-22",
        badgeTemplateId: "badge_template_science",
        state: "active",
        focusOrgUnitId: "tenant_123:org:college-eng",
        level: "department",
      },
    });
  });

  it("stays deterministic for the same visible hierarchy and scoped roots", () => {
    const input = {
      today: "2026-03-22",
      query: {},
      visibility: "scoped" as const,
      scopedOrgUnitIds: ["tenant_123:org:college-eng", "tenant_123:org:college-arts"],
      orgUnits: sampleExecutiveOrgUnits(),
    };

    expect(inferExecutiveDashboardDefaults(input)).toEqual(inferExecutiveDashboardDefaults(input));
    expect(inferExecutiveDashboardDefaults(input)).toMatchObject({
      audience: "college",
      focusOrgUnitId: "tenant_123:org:college-arts",
      comparisonLevel: "department",
      window: "last-90-days",
    });
  });
});
