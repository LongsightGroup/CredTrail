CREATE TABLE IF NOT EXISTS tenant_break_glass_accounts (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_by_user_id TEXT,
  last_used_at TEXT,
  last_enrollment_email_sent_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_break_glass_accounts_tenant_active
  ON tenant_break_glass_accounts (tenant_id, revoked_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_break_glass_accounts_user
  ON tenant_break_glass_accounts (user_id, revoked_at);
