DROP INDEX IF EXISTS idx_magic_link_tokens_tenant_user;
DROP INDEX IF EXISTS idx_magic_link_tokens_expires_at;
DROP INDEX IF EXISTS idx_sessions_tenant_user;
DROP INDEX IF EXISTS idx_sessions_expires_at;

DROP TABLE IF EXISTS magic_link_tokens;
DROP TABLE IF EXISTS sessions;
