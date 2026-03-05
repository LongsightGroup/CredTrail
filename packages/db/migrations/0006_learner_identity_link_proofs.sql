-- Proof tokens for learner email alias linking and recovery.

CREATE TABLE IF NOT EXISTS learner_identity_link_proofs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  learner_profile_id TEXT NOT NULL,
  requested_by_user_id TEXT NOT NULL,
  identity_type TEXT NOT NULL CHECK (identity_type IN ('email')),
  identity_value TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, learner_profile_id)
    REFERENCES learner_profiles (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learner_identity_link_proofs_tenant_profile
  ON learner_identity_link_proofs (tenant_id, learner_profile_id);

CREATE INDEX IF NOT EXISTS idx_learner_identity_link_proofs_expires_at
  ON learner_identity_link_proofs (expires_at);
