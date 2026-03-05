-- Initial shared-tenant schema for Open Badges 3.0 foundation.
-- Scope: tenants, users, memberships, badge_templates, assertions, revocations.

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free', 'team', 'institution', 'enterprise')),
  issuer_domain TEXT NOT NULL UNIQUE,
  did_web TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memberships (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'issuer', 'viewer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships (user_id);

CREATE TABLE IF NOT EXISTS badge_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  criteria_uri TEXT,
  image_uri TEXT,
  created_by_user_id TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, slug),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_templates_tenant_id ON badge_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_badge_templates_tenant_active
  ON badge_templates (tenant_id, is_archived);

CREATE TABLE IF NOT EXISTS assertions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_template_id TEXT NOT NULL,
  recipient_identity TEXT NOT NULL,
  recipient_identity_type TEXT NOT NULL
    CHECK (recipient_identity_type IN ('email', 'email_sha256', 'did', 'url')),
  vc_r2_key TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by_user_id TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, badge_template_id)
    REFERENCES badge_templates (tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (issued_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assertions_tenant_issued_at ON assertions (tenant_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_assertions_tenant_badge_template
  ON assertions (tenant_id, badge_template_id);

CREATE TABLE IF NOT EXISTS revocations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  assertion_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  revoked_by_user_id TEXT,
  revoked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, assertion_id),
  FOREIGN KEY (tenant_id, assertion_id)
    REFERENCES assertions (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_revocations_tenant_revoked_at ON revocations (tenant_id, revoked_at);
