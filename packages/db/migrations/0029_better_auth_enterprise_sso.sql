CREATE INDEX IF NOT EXISTS idx_auth_user_email
  ON auth.user (email);

CREATE INDEX IF NOT EXISTS idx_auth_account_provider_user
  ON auth.account (provider_id, user_id);
