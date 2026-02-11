-- Add stable learner profiles and identity aliases per tenant.

CREATE TABLE IF NOT EXISTS learner_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, subject_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learner_profiles_tenant_id
  ON learner_profiles (tenant_id);

CREATE TABLE IF NOT EXISTS learner_identities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  learner_profile_id TEXT NOT NULL,
  identity_type TEXT NOT NULL
    CHECK (identity_type IN ('email', 'email_sha256', 'did', 'url', 'saml_subject')),
  identity_value TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, identity_type, identity_value),
  FOREIGN KEY (tenant_id, learner_profile_id)
    REFERENCES learner_profiles (tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learner_identities_lookup
  ON learner_identities (tenant_id, identity_type, identity_value);

CREATE INDEX IF NOT EXISTS idx_learner_identities_profile
  ON learner_identities (tenant_id, learner_profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learner_identities_primary_per_profile
  ON learner_identities (tenant_id, learner_profile_id)
  WHERE is_primary = 1;
