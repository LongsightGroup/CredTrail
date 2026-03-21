import type {
  TenantAssertionLedgerExportResult,
  TenantAssertionLedgerExportRowRecord,
} from "@credtrail/db";

import {
  buildCsvAttachmentHeaders,
  buildCsvFilename,
  createExportTooLargeError,
  serializeCsv,
  type CsvColumn,
} from "./csv-export";

export interface TenantAssertionLedgerCsvRow {
  assertionId: string;
  publicId: string;
  badgeTemplateId: string;
  badgeTitle: string;
  recipientIdentity: string;
  recipientIdentityType: string;
  issuedAt: string;
  issuedByUserId: string;
  lifecycleState: string;
  lifecycleSource: string;
  lifecycleReasonCode: string;
  lifecycleReason: string;
  lifecycleTransitionedAt: string;
  attributedOrgUnitId: string;
  attributedOrgUnitName: string;
  attributionSource: string;
  currentInstitutionName: string;
  currentCollegeName: string;
  currentDepartmentName: string;
  currentProgramName: string;
}

export const LEDGER_EXPORT_COLUMNS: readonly CsvColumn<TenantAssertionLedgerCsvRow>[] = [
  { key: "assertionId", header: "Assertion ID" },
  { key: "publicId", header: "Public ID" },
  { key: "badgeTemplateId", header: "Badge Template ID" },
  { key: "badgeTitle", header: "Badge Title" },
  { key: "recipientIdentity", header: "Recipient Identity" },
  { key: "recipientIdentityType", header: "Recipient Identity Type" },
  { key: "issuedAt", header: "Issued At" },
  { key: "issuedByUserId", header: "Issued By User ID" },
  { key: "lifecycleState", header: "Lifecycle State" },
  { key: "lifecycleSource", header: "Lifecycle Source" },
  { key: "lifecycleReasonCode", header: "Lifecycle Reason Code" },
  { key: "lifecycleReason", header: "Lifecycle Reason" },
  { key: "lifecycleTransitionedAt", header: "Lifecycle Transitioned At" },
  { key: "attributedOrgUnitId", header: "Attributed Org Unit ID" },
  { key: "attributedOrgUnitName", header: "Attributed Org Unit Name" },
  { key: "attributionSource", header: "Attribution Source" },
  { key: "currentInstitutionName", header: "Current Institution Name" },
  { key: "currentCollegeName", header: "Current College Name (Current Tree)" },
  { key: "currentDepartmentName", header: "Current Department Name (Current Tree)" },
  { key: "currentProgramName", header: "Current Program Name (Current Tree)" },
] as const;

const stringOrEmpty = (value: string | null): string => {
  return value ?? "";
};

export const shapeTenantAssertionLedgerExportRows = (
  rows: readonly TenantAssertionLedgerExportRowRecord[],
): TenantAssertionLedgerCsvRow[] => {
  return rows.map((row) => {
    return {
      assertionId: row.assertionId,
      publicId: stringOrEmpty(row.publicId),
      badgeTemplateId: row.badgeTemplateId,
      badgeTitle: row.badgeTitle,
      recipientIdentity: row.recipientIdentity,
      recipientIdentityType: row.recipientIdentityType,
      issuedAt: row.issuedAt,
      issuedByUserId: stringOrEmpty(row.issuedByUserId),
      lifecycleState: row.state,
      lifecycleSource: row.source,
      lifecycleReasonCode: stringOrEmpty(row.reasonCode),
      lifecycleReason: stringOrEmpty(row.reason),
      lifecycleTransitionedAt: stringOrEmpty(row.transitionedAt),
      attributedOrgUnitId: row.orgUnitId,
      attributedOrgUnitName: row.orgUnitDisplayName,
      attributionSource: row.attributionSource,
      currentInstitutionName: stringOrEmpty(row.currentInstitutionName),
      currentCollegeName: stringOrEmpty(row.currentCollegeName),
      currentDepartmentName: stringOrEmpty(row.currentDepartmentName),
      currentProgramName: stringOrEmpty(row.currentProgramName),
    };
  });
};

export type TenantAssertionLedgerCsvExport =
  | {
      status: "ok";
      csv: string;
      filename: string;
      headers: Record<string, string>;
    }
  | {
      status: "too_large";
      error: ReturnType<typeof createExportTooLargeError>;
    };

export const buildTenantAssertionLedgerCsvExport = (
  result: TenantAssertionLedgerExportResult,
  generatedAt: string = new Date().toISOString(),
): TenantAssertionLedgerCsvExport => {
  if (result.status === "too_large") {
    return {
      status: "too_large",
      error: createExportTooLargeError(result.rowLimit),
    };
  }

  const filename = buildCsvFilename("Issued Badge Ledger", generatedAt);
  const csv = serializeCsv({
    rows: shapeTenantAssertionLedgerExportRows(result.rows),
    columns: LEDGER_EXPORT_COLUMNS,
  });

  return {
    status: "ok",
    csv,
    filename,
    headers: buildCsvAttachmentHeaders(filename),
  };
};
