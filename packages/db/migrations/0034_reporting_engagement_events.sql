CREATE TABLE IF NOT EXISTS assertion_engagement_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  assertion_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'public_badge_view',
      'verification_view',
      'share_click',
      'learner_claim',
      'wallet_accept'
    )),
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('anonymous', 'learner', 'wallet', 'system')),
  channel TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (assertion_id) REFERENCES assertions (id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, assertion_id) REFERENCES assertions (tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assertion_engagement_events_tenant_occurred_at
  ON assertion_engagement_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_assertion_engagement_events_assertion_type
  ON assertion_engagement_events (tenant_id, assertion_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_assertion_engagement_events_type_occurred_at
  ON assertion_engagement_events (tenant_id, event_type, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assertion_engagement_events_one_shot
  ON assertion_engagement_events (tenant_id, assertion_id, event_type)
  WHERE event_type IN ('learner_claim', 'wallet_accept');
