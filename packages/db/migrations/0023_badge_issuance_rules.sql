-- Rules engine persistence for automated badge issuance workflows.

CREATE TABLE IF NOT EXISTS badge_issuance_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  badge_template_id TEXT NOT NULL,
  lms_provider_kind TEXT NOT NULL,
  active_version_id TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, badge_template_id) REFERENCES badge_templates (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_issuance_rules_tenant
  ON badge_issuance_rules (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS badge_issuance_rule_versions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'rejected', 'deprecated')),
  rule_json TEXT NOT NULL,
  change_summary TEXT,
  created_by_user_id TEXT,
  approved_by_user_id TEXT,
  approved_at TEXT,
  activated_by_user_id TEXT,
  activated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (rule_id, version_number),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES badge_issuance_rules (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (activated_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_issuance_rule_versions_rule
  ON badge_issuance_rule_versions (rule_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_badge_issuance_rule_versions_status
  ON badge_issuance_rule_versions (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS badge_issuance_rule_evaluations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  recipient_identity TEXT NOT NULL,
  recipient_identity_type TEXT NOT NULL CHECK (recipient_identity_type IN ('email', 'email_sha256', 'did', 'url')),
  matched INTEGER NOT NULL CHECK (matched IN (0, 1)),
  issuance_status TEXT,
  assertion_id TEXT,
  evaluation_json TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES badge_issuance_rules (id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES badge_issuance_rule_versions (id) ON DELETE CASCADE,
  FOREIGN KEY (assertion_id) REFERENCES assertions (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_issuance_rule_evaluations_rule
  ON badge_issuance_rule_evaluations (tenant_id, rule_id, learner_id, evaluated_at DESC);
