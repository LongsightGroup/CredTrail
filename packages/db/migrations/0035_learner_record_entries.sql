CREATE TABLE IF NOT EXISTS learner_record_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  learner_profile_id TEXT NOT NULL,
  trust_level TEXT NOT NULL CHECK (trust_level IN ('issuer_verified', 'learner_supplemental')),
  record_type TEXT NOT NULL CHECK (
    record_type IN (
      'course',
      'certificate',
      'license',
      'competency',
      'work_based_learning',
      'experience',
      'membership',
      'supplemental_artifact',
      'custom'
    )
  ),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  title TEXT NOT NULL,
  description TEXT,
  issuer_name TEXT NOT NULL,
  issuer_user_id TEXT,
  source_system TEXT NOT NULL CHECK (
    source_system IN (
      'credtrail_admin',
      'csv_import',
      'api',
      'migration',
      'badge_assertion',
      'learner_self_reported'
    )
  ),
  source_record_id TEXT,
  issued_at TEXT NOT NULL,
  revised_at TEXT,
  revoked_at TEXT,
  evidence_links_json TEXT NOT NULL DEFAULT '[]',
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, learner_profile_id)
    REFERENCES learner_profiles (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (issuer_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_learner_record_entries_tenant_profile_issued
  ON learner_record_entries (tenant_id, learner_profile_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_record_entries_tenant_trust_status
  ON learner_record_entries (tenant_id, trust_level, status);
