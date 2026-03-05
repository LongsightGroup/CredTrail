-- Add configurable multi-step approval workflows and immutable history for badge rule versions.

CREATE TABLE IF NOT EXISTS badge_issuance_rule_approval_steps (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  step_number INTEGER NOT NULL CHECK (step_number > 0),
  required_role TEXT NOT NULL CHECK (required_role IN ('owner', 'admin', 'issuer', 'viewer')),
  label TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'pending', 'approved', 'rejected')),
  decided_by_user_id TEXT,
  decided_at TEXT,
  decision_comment TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (version_id, step_number),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES badge_issuance_rule_versions (id) ON DELETE CASCADE,
  FOREIGN KEY (decided_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_rule_approval_steps_version
  ON badge_issuance_rule_approval_steps (version_id, step_number ASC);

CREATE TABLE IF NOT EXISTS badge_issuance_rule_approval_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  step_number INTEGER,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected')),
  actor_user_id TEXT,
  actor_role TEXT CHECK (actor_role IN ('owner', 'admin', 'issuer', 'viewer')),
  comment TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES badge_issuance_rule_versions (id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_rule_approval_events_version
  ON badge_issuance_rule_approval_events (version_id, occurred_at ASC, created_at ASC);
