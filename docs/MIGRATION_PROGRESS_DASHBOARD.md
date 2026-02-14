# Migration Progress Dashboard

`badging-pgc` adds tenant migration progress and retry controls over queued `import_migration_batch` jobs.

## Endpoints

`GET /v1/tenants/:tenantId/migrations/progress?source=all|file_upload|credly_export&limit=1..200`

`POST /v1/tenants/:tenantId/migrations/batches/:batchId/retry`

Auth: tenant session with issuer role (`owner`, `admin`, or `issuer`).

## Progress Response

`GET /migrations/progress` returns:

- `totals`: aggregate row counts by queue state (`pending`, `processing`, `completed`, `failed`)
- `batches`: grouped summaries by `batchId` + source, including:
- `fileName`, `format`
- row counts by status
- `retryableRows`
- `failedRowNumbers` (up to 50)
- `latestError`
- `firstQueuedAt`, `lastUpdatedAt`

## Retry Controls

`POST /migrations/batches/:batchId/retry` request body (optional):

- `source`: `file_upload` or `credly_export`
- `rowNumbers`: specific failed row numbers to retry

Retry behavior:

- only failed rows are reset to `pending`
- `attemptCount` is reset so queue processing can run again
- returns retry counts (`matched`, `retried`, `skippedNotFailed`) and refreshed batch summary
