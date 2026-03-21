CREATE TABLE IF NOT EXISTS assertion_reporting_attributions (
  assertion_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_template_id TEXT NOT NULL,
  org_unit_id TEXT NOT NULL,
  attribution_source TEXT NOT NULL
    CHECK (attribution_source IN ('issuance_snapshot', 'historical_backfill', 'current_owner_fallback')),
  attributed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, assertion_id),
  FOREIGN KEY (assertion_id) REFERENCES assertions (id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, badge_template_id) REFERENCES badge_templates (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, org_unit_id) REFERENCES tenant_org_units (tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_assertion_reporting_attributions_tenant_org
  ON assertion_reporting_attributions (tenant_id, org_unit_id, attributed_at DESC);

CREATE INDEX IF NOT EXISTS idx_assertion_reporting_attributions_tenant_template
  ON assertion_reporting_attributions (tenant_id, badge_template_id, attributed_at DESC);
