CREATE TABLE IF NOT EXISTS learner_record_import_context (
  entry_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_unit_id TEXT,
  badge_template_id TEXT,
  pathway_label TEXT,
  inferred_from_json TEXT NOT NULL DEFAULT '["none"]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id)
    REFERENCES learner_record_entries (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learner_record_import_context_tenant_org_unit
  ON learner_record_import_context (tenant_id, org_unit_id);

CREATE INDEX IF NOT EXISTS idx_learner_record_import_context_tenant_badge_template
  ON learner_record_import_context (tenant_id, badge_template_id);
