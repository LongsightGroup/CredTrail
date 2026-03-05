-- Add per-tenant status list index support for BitstringStatusList revocation.

ALTER TABLE assertions ADD COLUMN IF NOT EXISTS status_list_index INTEGER;

WITH ranked_assertions AS (
  SELECT
    tenant_id,
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY issued_at ASC, id ASC) - 1 AS next_index
  FROM assertions
)
UPDATE assertions
SET status_list_index = (
  SELECT next_index
  FROM ranked_assertions
  WHERE ranked_assertions.tenant_id = assertions.tenant_id
    AND ranked_assertions.id = assertions.id
)
WHERE status_list_index IS NULL;

CREATE INDEX IF NOT EXISTS idx_assertions_tenant_status_list_index
  ON assertions (tenant_id, status_list_index);
