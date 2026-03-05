-- Add explicit lifecycle transition history for assertions.
CREATE TABLE IF NOT EXISTS assertion_lifecycle_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  assertion_id TEXT NOT NULL,
  from_state TEXT NOT NULL CHECK (from_state IN ('active', 'suspended', 'revoked', 'expired')),
  to_state TEXT NOT NULL CHECK (to_state IN ('active', 'suspended', 'revoked', 'expired')),
  reason_code TEXT NOT NULL CHECK (
    reason_code IN (
      'administrative_hold',
      'policy_violation',
      'appeal_pending',
      'appeal_resolved',
      'credential_expired',
      'issuer_requested',
      'other'
    )
  ),
  reason TEXT,
  transition_source TEXT NOT NULL CHECK (transition_source IN ('manual', 'automation')),
  actor_user_id TEXT,
  transitioned_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, assertion_id) REFERENCES assertions (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assertion_lifecycle_events_tenant_assertion_transitioned
  ON assertion_lifecycle_events (tenant_id, assertion_id, transitioned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assertion_lifecycle_events_tenant_state
  ON assertion_lifecycle_events (tenant_id, to_state);
