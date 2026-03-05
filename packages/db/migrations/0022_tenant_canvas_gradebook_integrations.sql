-- Store tenant-specific Canvas OAuth configuration and token material used for gradebook sync.

CREATE TABLE IF NOT EXISTS tenant_canvas_gradebook_integrations (
  tenant_id TEXT PRIMARY KEY,
  api_base_url TEXT NOT NULL,
  authorization_endpoint TEXT NOT NULL,
  token_endpoint TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  scope TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TEXT,
  refresh_token_expires_at TEXT,
  connected_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_canvas_gradebook_connected_at
  ON tenant_canvas_gradebook_integrations (connected_at DESC);
