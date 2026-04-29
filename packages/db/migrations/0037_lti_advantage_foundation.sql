-- Add production LTI 1.3 Advantage storage for signed launches, tool keys,
-- replay prevention, short-lived LTI sessions, and resource-link placements.

ALTER TABLE lti_issuer_registrations
  ADD COLUMN platform_jwks_endpoint TEXT;

CREATE TABLE IF NOT EXISTS lti_deployments (
  id TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issuer) REFERENCES lti_issuer_registrations (issuer) ON DELETE CASCADE,
  UNIQUE (issuer, client_id, deployment_id)
);

CREATE INDEX IF NOT EXISTS idx_lti_deployments_issuer
  ON lti_deployments (issuer);

CREATE TABLE IF NOT EXISTS lti_tool_keys (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL UNIQUE,
  public_jwk_json TEXT NOT NULL,
  private_jwk_json TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lti_tool_keys_active
  ON lti_tool_keys (is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS lti_launch_nonces (
  nonce TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lti_launch_nonces_expires
  ON lti_launch_nonces (expires_at);

CREATE TABLE IF NOT EXISTS lti_launch_sessions (
  id TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  user_id TEXT,
  tenant_id TEXT,
  data_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lti_launch_sessions_expires
  ON lti_launch_sessions (expires_at);

CREATE TABLE IF NOT EXISTS lti_dynamic_registration_sessions (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lti_dynamic_registration_sessions_expires
  ON lti_dynamic_registration_sessions (expires_at);

CREATE TABLE IF NOT EXISTS lti_resource_link_placements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  context_id TEXT,
  resource_link_id TEXT NOT NULL,
  badge_template_id TEXT NOT NULL,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (badge_template_id) REFERENCES badge_templates (id) ON DELETE CASCADE,
  UNIQUE (issuer, client_id, deployment_id, resource_link_id)
);

CREATE INDEX IF NOT EXISTS idx_lti_resource_link_placements_tenant
  ON lti_resource_link_placements (tenant_id);

CREATE INDEX IF NOT EXISTS idx_lti_resource_link_placements_lookup
  ON lti_resource_link_placements (issuer, client_id, deployment_id, resource_link_id);
