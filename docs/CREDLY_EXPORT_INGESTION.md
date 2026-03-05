# Credly Export Ingestion

`badging-msl` adds a Credly export ingestion endpoint that reuses the OB2 migration conversion pipeline.

## Endpoint

`POST /v1/tenants/:tenantId/migrations/credly/ingest?dryRun=true|false`

Auth: tenant session with issuer role (`owner`, `admin`, or `issuer`).

## Request

- Content type: `multipart/form-data`
- File field name: `file`
- Supported file types: `.json`, `.csv`
- Query param:
- `dryRun=true` (default) validates and previews only
- `dryRun=false` enqueues valid rows as `import_migration_batch` jobs

## Supported Input Shapes

JSON:

- Array of badge rows
- Or object with `data` array (Credly API export style)

CSV:

- Credly export/template columns are normalized case-insensitively
- Common headers include:
- `First Name`, `Last Name`, `Recipient Email`
- `Badge Template ID`, `Badge Template Name`
- `Issued At`

## Response

Returns:

- `source`: `credly_export`
- `batchId`
- `totalRows`, `validRows`, `invalidRows`, `queuedRows`
- `rows`: per-row status (`valid`/`invalid`), errors, warnings, and dry-run diff previews
