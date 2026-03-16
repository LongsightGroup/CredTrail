CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.user (
  id TEXT PRIMARY KEY,
  email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.session (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_session_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.user (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user
  ON auth.session (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_expires_at
  ON auth.session (expires_at);

CREATE TABLE IF NOT EXISTS auth.account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  id_token TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_account_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.user (id) ON DELETE CASCADE,
  CONSTRAINT auth_account_provider_account_unique
    UNIQUE (provider_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_account_user
  ON auth.account (user_id);

CREATE TABLE IF NOT EXISTS auth.verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_verification_identifier_value_unique
    UNIQUE (identifier, value)
);

CREATE INDEX IF NOT EXISTS idx_auth_verification_expires_at
  ON auth.verification (expires_at);

CREATE TABLE IF NOT EXISTS auth_identity_links (
  id TEXT PRIMARY KEY,
  auth_system TEXT NOT NULL,
  auth_user_id TEXT NOT NULL,
  auth_account_id TEXT,
  credtrail_user_id TEXT NOT NULL,
  email_snapshot TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (credtrail_user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE (auth_system, auth_user_id),
  UNIQUE (auth_system, credtrail_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_identity_links_auth_account
  ON auth_identity_links (auth_system, auth_account_id);
