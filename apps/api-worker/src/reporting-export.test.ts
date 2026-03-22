import { describe, expect, it } from "vitest";

import type { TenantAssertionLedgerExportRowRecord } from "@credtrail/db";

import {
  buildCsvAttachmentHeaders,
  buildCsvFilename,
  createExportTooLargeError,
  serializeCsv,
} from "./reporting/csv-export";
import {
  LEDGER_EXPORT_COLUMNS,
  buildTenantAssertionLedgerCsvExport,
  shapeTenantAssertionLedgerExportRows,
} from "./reporting/ledger-export";

const sampleLedgerRow = (
  overrides?: Partial<TenantAssertionLedgerExportRowRecord>,
): TenantAssertionLedgerExportRowRecord => {
  return {
    assertionId: "assertion_123",
    tenantId: "tenant_123",
    publicId: "public_123",
    badgeTemplateId: "badge_template_science",
    badgeTitle: "Foundations of Microbiology",
    recipientIdentity: '=HYPERLINK("https://example.edu")',
    recipientIdentityType: "email",
    issuedAt: "2026-03-10T15:45:00.000Z",
    issuedByUserId: "user_issuer",
    revokedAt: null,
    state: "suspended",
    source: "lifecycle_event",
    reasonCode: "administrative_hold",
    reason: "Paused during registrar review",
    transitionedAt: "2026-03-12T10:15:00.000Z",
    orgUnitId: "org_program_microbiology",
    orgUnitDisplayName: "Microbiology Program",
    attributionSource: "historical_backfill",
    currentInstitutionName: "CredTrail University",
    currentCollegeName: "College of Science",
    currentDepartmentName: "Biology Department",
    currentProgramName: "Microbiology Program",
    ...overrides,
  };
};

describe("reporting csv export helpers", () => {
  it("serializes UTF-8 CSV with BOM, explicit columns, formula safety, filenames, and attachment headers", () => {
    const csv = serializeCsv({
      rows: [
        {
          label: "Issued",
          dangerousCell: "=SUM(A1:A2)",
        },
      ],
      columns: [
        { key: "label", header: "Label" },
        { key: "dangerousCell", header: "Dangerous Cell" },
      ],
    });

    const filename = buildCsvFilename("Issued Badge Ledger", "2026-03-21T14:30:00.000Z");
    const headers = buildCsvAttachmentHeaders(filename);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.replace(/^\uFEFF/, "").split("\n")[0]).toBe("Label,Dangerous Cell");
    expect(csv).toMatch(/'=SUM\(A1:A2\)/);
    expect(filename).toBe("issued-badge-ledger-2026-03-21.csv");
    expect(headers).toEqual({
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="issued-badge-ledger-2026-03-21.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    });
  });

  it("shapes ledger rows with stable attribution fields and clearly optional current-tree convenience columns", () => {
    const shapedRows = shapeTenantAssertionLedgerExportRows([
      sampleLedgerRow({
        currentCollegeName: null,
        currentDepartmentName: null,
        currentProgramName: null,
      }),
    ]);

    expect(LEDGER_EXPORT_COLUMNS.map((column) => column.header)).toEqual([
      "Assertion ID",
      "Public ID",
      "Badge Template ID",
      "Badge Title",
      "Recipient Identity",
      "Recipient Identity Type",
      "Issued At",
      "Issued By User ID",
      "Lifecycle State",
      "Lifecycle Source",
      "Lifecycle Reason Code",
      "Lifecycle Reason",
      "Lifecycle Transitioned At",
      "Attributed Org Unit ID",
      "Attributed Org Unit Name",
      "Attribution Source",
      "Current Institution Name",
      "Current College Name (Current Tree)",
      "Current Department Name (Current Tree)",
      "Current Program Name (Current Tree)",
    ]);

    expect(shapedRows).toEqual([
      {
        assertionId: "assertion_123",
        publicId: "public_123",
        badgeTemplateId: "badge_template_science",
        badgeTitle: "Foundations of Microbiology",
        recipientIdentity: '=HYPERLINK("https://example.edu")',
        recipientIdentityType: "email",
        issuedAt: "2026-03-10T15:45:00.000Z",
        issuedByUserId: "user_issuer",
        lifecycleState: "suspended",
        lifecycleSource: "lifecycle_event",
        lifecycleReasonCode: "administrative_hold",
        lifecycleReason: "Paused during registrar review",
        lifecycleTransitionedAt: "2026-03-12T10:15:00.000Z",
        attributedOrgUnitId: "org_program_microbiology",
        attributedOrgUnitName: "Microbiology Program",
        attributionSource: "historical_backfill",
        currentInstitutionName: "CredTrail University",
        currentCollegeName: "",
        currentDepartmentName: "",
        currentProgramName: "",
      },
    ]);
  });

  it("surfaces a reusable export-too-large error keyed to the 5000-row synchronous cap", () => {
    expect(createExportTooLargeError()).toEqual({
      status: "too_large",
      error: "export_too_large",
      rowLimit: 5000,
      message: "Synchronous export is limited to 5000 rows. Narrow your filters and try again.",
    });

    const exportParts = buildTenantAssertionLedgerCsvExport({
      status: "too_large",
      rowLimit: 5000,
    });

    expect(exportParts).toEqual({
      error: {
        status: "too_large",
        error: "export_too_large",
        rowLimit: 5000,
        message: "Synchronous export is limited to 5000 rows. Narrow your filters and try again.",
      },
      status: "too_large",
    });
  });
});
