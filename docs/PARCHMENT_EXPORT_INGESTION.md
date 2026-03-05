# Parchment and Canvas Credentials Ingestion

`badging-ryp` adds a migration path for Canvas Credentials (Badgr) and Parchment Digital Badges exports.

## Endpoint

`POST /v1/tenants/:tenantId/migrations/parchment/ingest?dryRun=true|false`

Auth: tenant session with issuer role (`owner`, `admin`, or `issuer`).

## One-Click Import Flow

1. Export badge data from Canvas Credentials/Parchment as CSV or JSON.
2. Upload the export file to `/migrations/parchment/ingest` with `dryRun=true` to validate rows and preview diffs.
3. Re-submit the same file with `dryRun=false` to queue valid rows for import.
4. Track progress with `/v1/tenants/:tenantId/migrations/progress?source=parchment_export`.
5. Retry failed rows with `/v1/tenants/:tenantId/migrations/batches/:batchId/retry`.

## Input Support

CSV:

- Parchment bulk-award style columns:
- `identifier`
- `badge class id`
- `first name`, `last name`
- `issue date`
- `narrative`
- `evidence url`
- `evidence narrative`
- Also accepts common variants like `recipient email`, `badge name`, and issuer metadata columns.

JSON:

- Assertion arrays (`[]`, `data[]`, `rows[]`, `result[]`, or `assertions[]`)
- Nested issuer exports with `badge_classes[].assertions[]`
- Assertion-style fields such as `id`, `recipient.identity`, `badgeclass`, `issuedOn`, `narrative`, and `evidence[]`

## Data Mapping

Mapped into existing OB2 conversion inputs:

- `identifier` / `recipient.identity` -> `ob2Assertion.recipient.identity`
- `first name` + `last name` / `recipient.name` -> `ob2Assertion.recipient.name`
- `badge class id` / `badgeclass.id` -> `ob2BadgeClass.id` and `ob2Assertion.badge`
- `badge class name` / `badgeclass.name` -> `ob2BadgeClass.name`
- `issue date` / `issuedOn` -> `ob2Assertion.issuedOn`
- `narrative` -> `ob2Assertion.narrative`
- `evidence url` + `evidence narrative` / `evidence[]` -> `ob2Assertion.evidence[]`
- issuer fields -> `ob2BadgeClass.issuer` and optional `ob2Issuer`

## Output

The endpoint returns the standard migration batch response:

- `source`: `parchment_export`
- `batchId`
- `totalRows`, `validRows`, `invalidRows`, `queuedRows`
- `rows`: per-row `valid`/`invalid`, errors, warnings, and dry-run diff previews
