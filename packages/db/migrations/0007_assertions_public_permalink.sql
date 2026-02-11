-- Add stable opaque public permalink identifiers for badge assertions.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE assertions ADD COLUMN IF NOT EXISTS public_id TEXT;

UPDATE assertions
SET public_id = gen_random_uuid()::text
WHERE public_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assertions_public_id
  ON assertions (public_id);
