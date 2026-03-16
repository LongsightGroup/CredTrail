CREATE TABLE IF NOT EXISTS tenant_auth_providers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('oidc', 'saml')),
  label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_auth_providers_tenant
  ON tenant_auth_providers (tenant_id, created_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_auth_providers_default_per_tenant
  ON tenant_auth_providers (tenant_id)
  WHERE is_default = 1;
