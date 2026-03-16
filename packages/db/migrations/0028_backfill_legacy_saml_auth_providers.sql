INSERT INTO tenant_auth_providers (
  id,
  tenant_id,
  protocol,
  label,
  enabled,
  is_default,
  config_json,
  created_at,
  updated_at
)
SELECT
  tenant_id || ':provider:saml-default',
  tenant_id,
  'saml',
  'Legacy SAML',
  1,
  1,
  '{"legacySource":"tenant_sso_saml_configurations"}',
  created_at,
  updated_at
FROM tenant_sso_saml_configurations
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_auth_policies (
  tenant_id,
  login_mode,
  break_glass_enabled,
  local_mfa_required,
  default_provider_id,
  enforce_for_roles,
  created_at,
  updated_at
)
SELECT
  tenant_id,
  CASE
    WHEN enforced = 1 THEN 'sso_required'
    ELSE 'hybrid'
  END,
  0,
  0,
  tenant_id || ':provider:saml-default',
  'all_users',
  created_at,
  updated_at
FROM tenant_sso_saml_configurations
ON CONFLICT (tenant_id) DO NOTHING;
