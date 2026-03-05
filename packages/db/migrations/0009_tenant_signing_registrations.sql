-- Store tenant signing material in Postgres to support API-driven onboarding.

CREATE TABLE IF NOT EXISTS tenant_signing_registrations (
  tenant_id TEXT PRIMARY KEY,
  did TEXT NOT NULL UNIQUE,
  key_id TEXT NOT NULL,
  public_jwk_json TEXT NOT NULL,
  private_jwk_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_signing_registrations_did
  ON tenant_signing_registrations (did);
