CREATE TABLE IF NOT EXISTS tenant_auth_policies (
  tenant_id TEXT PRIMARY KEY,
  login_mode TEXT NOT NULL DEFAULT 'local'
    CHECK (login_mode IN ('local', 'hybrid', 'sso_required')),
  break_glass_enabled INTEGER NOT NULL DEFAULT 0
    CHECK (break_glass_enabled IN (0, 1)),
  local_mfa_required INTEGER NOT NULL DEFAULT 0
    CHECK (local_mfa_required IN (0, 1)),
  default_provider_id TEXT,
  enforce_for_roles TEXT NOT NULL DEFAULT 'all_users'
    CHECK (enforce_for_roles IN ('all_users', 'admins_only')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_auth_policies_default_provider
  ON tenant_auth_policies (default_provider_id);
