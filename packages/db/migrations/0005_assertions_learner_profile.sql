-- Link issued assertions to stable tenant learner profiles.

ALTER TABLE assertions ADD COLUMN learner_profile_id TEXT;

CREATE INDEX IF NOT EXISTS idx_assertions_tenant_learner_profile
  ON assertions (tenant_id, learner_profile_id);
