ALTER TABLE auth.user
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS auth.two_factor (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  backup_codes TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_two_factor_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.user (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_two_factor_user
  ON auth.two_factor (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_two_factor_secret
  ON auth.two_factor (secret);
