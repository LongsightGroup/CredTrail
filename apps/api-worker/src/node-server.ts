import { serve } from '@hono/node-server';
import { app, type AppBindings } from './app';

const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    return undefined;
  }

  return value;
};

const parsePort = (): number => {
  const rawPort = optionalEnv('PORT') ?? '8787';
  const parsedPort = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535 (received "${rawPort}")`);
  }

  return parsedPort;
};

const withOptionalBinding = <K extends keyof AppBindings>(
  key: K,
  value: AppBindings[K] | undefined,
): Partial<AppBindings> => {
  if (value === undefined) {
    return {};
  }

  return {
    [key]: value,
  } as Pick<AppBindings, K>;
};

const r2Unavailable = (): never => {
  throw new Error('BADGE_OBJECTS binding is unavailable in Node server mode');
};

const badgeObjectsBinding = {
  head: r2Unavailable,
  get: r2Unavailable,
  put: r2Unavailable,
  delete: r2Unavailable,
  list: r2Unavailable,
  createMultipartUpload: r2Unavailable,
  resumeMultipartUpload: r2Unavailable,
} as unknown as R2Bucket;

const databaseUrl = optionalEnv('DATABASE_URL');
const marketingSiteOrigin = optionalEnv('MARKETING_SITE_ORIGIN');
const sentryDsn = optionalEnv('SENTRY_DSN');
const tenantSigningRegistryJson = optionalEnv('TENANT_SIGNING_REGISTRY_JSON');
const tenantSigningKeyHistoryJson = optionalEnv('TENANT_SIGNING_KEY_HISTORY_JSON');
const tenantRemoteSignerRegistryJson = optionalEnv('TENANT_REMOTE_SIGNER_REGISTRY_JSON');
const mailtrapApiToken = optionalEnv('MAILTRAP_API_TOKEN');
const mailtrapInboxId = optionalEnv('MAILTRAP_INBOX_ID');
const mailtrapApiBaseUrl = optionalEnv('MAILTRAP_API_BASE_URL');
const mailtrapFromEmail = optionalEnv('MAILTRAP_FROM_EMAIL');
const mailtrapFromName = optionalEnv('MAILTRAP_FROM_NAME');
const githubToken = optionalEnv('GITHUB_TOKEN');
const jobProcessorToken = optionalEnv('JOB_PROCESSOR_TOKEN');
const bootstrapAdminToken = optionalEnv('BOOTSTRAP_ADMIN_TOKEN');
const ltiIssuerRegistryJson = optionalEnv('LTI_ISSUER_REGISTRY_JSON');
const ltiStateSigningSecret = optionalEnv('LTI_STATE_SIGNING_SECRET');
const ob3DiscoveryTitle = optionalEnv('OB3_DISCOVERY_TITLE');
const ob3TermsOfServiceUrl = optionalEnv('OB3_TERMS_OF_SERVICE_URL');
const ob3PrivacyPolicyUrl = optionalEnv('OB3_PRIVACY_POLICY_URL');
const ob3ImageUrl = optionalEnv('OB3_IMAGE_URL');
const ob3OAuthRegistrationUrl = optionalEnv('OB3_OAUTH_REGISTRATION_URL');
const ob3OAuthAuthorizationUrl = optionalEnv('OB3_OAUTH_AUTHORIZATION_URL');
const ob3OAuthTokenUrl = optionalEnv('OB3_OAUTH_TOKEN_URL');
const ob3OAuthRefreshUrl = optionalEnv('OB3_OAUTH_REFRESH_URL');

const workerBindings: AppBindings = {
  APP_ENV: optionalEnv('APP_ENV') ?? 'development',
  BADGE_OBJECTS: badgeObjectsBinding,
  PLATFORM_DOMAIN: optionalEnv('PLATFORM_DOMAIN') ?? 'localhost',
  ...withOptionalBinding('DATABASE_URL', databaseUrl),
  ...withOptionalBinding('MARKETING_SITE_ORIGIN', marketingSiteOrigin),
  ...withOptionalBinding('SENTRY_DSN', sentryDsn),
  ...withOptionalBinding('TENANT_SIGNING_REGISTRY_JSON', tenantSigningRegistryJson),
  ...withOptionalBinding('TENANT_SIGNING_KEY_HISTORY_JSON', tenantSigningKeyHistoryJson),
  ...withOptionalBinding('TENANT_REMOTE_SIGNER_REGISTRY_JSON', tenantRemoteSignerRegistryJson),
  ...withOptionalBinding('MAILTRAP_API_TOKEN', mailtrapApiToken),
  ...withOptionalBinding('MAILTRAP_INBOX_ID', mailtrapInboxId),
  ...withOptionalBinding('MAILTRAP_API_BASE_URL', mailtrapApiBaseUrl),
  ...withOptionalBinding('MAILTRAP_FROM_EMAIL', mailtrapFromEmail),
  ...withOptionalBinding('MAILTRAP_FROM_NAME', mailtrapFromName),
  ...withOptionalBinding('GITHUB_TOKEN', githubToken),
  ...withOptionalBinding('JOB_PROCESSOR_TOKEN', jobProcessorToken),
  ...withOptionalBinding('BOOTSTRAP_ADMIN_TOKEN', bootstrapAdminToken),
  ...withOptionalBinding('LTI_ISSUER_REGISTRY_JSON', ltiIssuerRegistryJson),
  ...withOptionalBinding('LTI_STATE_SIGNING_SECRET', ltiStateSigningSecret),
  ...withOptionalBinding('OB3_DISCOVERY_TITLE', ob3DiscoveryTitle),
  ...withOptionalBinding('OB3_TERMS_OF_SERVICE_URL', ob3TermsOfServiceUrl),
  ...withOptionalBinding('OB3_PRIVACY_POLICY_URL', ob3PrivacyPolicyUrl),
  ...withOptionalBinding('OB3_IMAGE_URL', ob3ImageUrl),
  ...withOptionalBinding('OB3_OAUTH_REGISTRATION_URL', ob3OAuthRegistrationUrl),
  ...withOptionalBinding('OB3_OAUTH_AUTHORIZATION_URL', ob3OAuthAuthorizationUrl),
  ...withOptionalBinding('OB3_OAUTH_TOKEN_URL', ob3OAuthTokenUrl),
  ...withOptionalBinding('OB3_OAUTH_REFRESH_URL', ob3OAuthRefreshUrl),
};

const executionContext: ExecutionContext = {
  waitUntil: (_promise: Promise<unknown>) => undefined,
  passThroughOnException: () => undefined,
  props: undefined,
};

const port = parsePort();

serve(
  {
    port,
    hostname: '0.0.0.0',
    fetch: (request) => {
      return app.fetch(request, workerBindings, executionContext);
    },
  },
  (info) => {
    console.info(
      JSON.stringify({
        message: 'node_server_started',
        host: info.address,
        port: info.port,
      }),
    );
  },
);
