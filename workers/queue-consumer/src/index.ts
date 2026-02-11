import {
  captureSentryException,
  createDidWeb,
  logError,
  logInfo,
  signCredentialWithEd25519Signature2020,
  storeImmutableCredentialObject,
  type Ed25519PrivateJwk,
  type ObservabilityContext,
} from '@credtrail/core-domain';
import {
  parseQueueJob,
  parseTenantSigningRegistry,
  type IssueBadgeQueueJob,
  type QueueJob,
  type RevokeBadgeQueueJob,
  type TenantSigningRegistry,
} from '@credtrail/validation';

interface Env {
  APP_ENV: string;
  PLATFORM_DOMAIN: string;
  BADGE_OBJECTS: R2Bucket;
  SENTRY_DSN?: string;
  TENANT_SIGNING_REGISTRY_JSON?: string;
}

const QUEUE_SERVICE_NAME = 'queue-consumer';

const observabilityContext = (env: Env): ObservabilityContext => {
  return {
    service: QUEUE_SERVICE_NAME,
    environment: env.APP_ENV,
  };
};

const parseSigningRegistryFromEnv = (rawRegistry: string | undefined): TenantSigningRegistry => {
  if (rawRegistry === undefined || rawRegistry.trim().length === 0) {
    return {};
  }

  let parsedRegistry: unknown;

  try {
    parsedRegistry = JSON.parse(rawRegistry) as unknown;
  } catch {
    throw new Error('TENANT_SIGNING_REGISTRY_JSON is not valid JSON');
  }

  return parseTenantSigningRegistry(parsedRegistry);
};

const toEd25519PrivateJwk = (jwk: {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  d: string;
  kid?: string | undefined;
}): Ed25519PrivateJwk => {
  if (jwk.kid === undefined) {
    return {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      d: jwk.d,
    };
  }

  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    d: jwk.d,
    kid: jwk.kid,
  };
};

const credentialSubjectId = (job: IssueBadgeQueueJob): string => {
  switch (job.payload.recipientIdentityType) {
    case 'email':
      return `mailto:${job.payload.recipientIdentity.toLowerCase()}`;
    case 'email_sha256':
      return `urn:sha256:${job.payload.recipientIdentity}`;
    case 'did':
    case 'url':
      return job.payload.recipientIdentity;
  }
};

const processIssueBadgeJob = async (job: IssueBadgeQueueJob, env: Env): Promise<void> => {
  const registry = parseSigningRegistryFromEnv(env.TENANT_SIGNING_REGISTRY_JSON);
  const issuerDid = createDidWeb({
    host: env.PLATFORM_DOMAIN,
    pathSegments: [job.tenantId],
  });
  const signingEntry = registry[issuerDid];

  if (signingEntry === undefined) {
    throw new Error(`No tenant signing entry configured for DID "${issuerDid}"`);
  }

  if (signingEntry.privateJwk === undefined) {
    throw new Error(`No private JWK configured for DID "${issuerDid}"`);
  }

  const signedCredential = await signCredentialWithEd25519Signature2020({
    credential: {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      id: `urn:credtrail:assertion:${encodeURIComponent(job.payload.assertionId)}`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: issuerDid,
      validFrom: job.payload.requestedAt,
      credentialSubject: {
        id: credentialSubjectId(job),
        achievement: {
          id: `urn:credtrail:badge-template:${encodeURIComponent(job.payload.badgeTemplateId)}`,
          type: ['Achievement'],
          name: `Badge ${job.payload.badgeTemplateId}`,
        },
      },
    },
    privateJwk: toEd25519PrivateJwk(signingEntry.privateJwk),
    verificationMethod: `${issuerDid}#${signingEntry.keyId}`,
  });

  const stored = await storeImmutableCredentialObject(env.BADGE_OBJECTS, {
    tenantId: job.tenantId,
    assertionId: job.payload.assertionId,
    credential: signedCredential,
  });

  logInfo(observabilityContext(env), 'stored_immutable_credential', {
    jobType: job.jobType,
    tenantId: job.tenantId,
    assertionId: job.payload.assertionId,
    r2Key: stored.key,
    r2Version: stored.version,
    idempotencyKey: job.idempotencyKey,
    platformDomain: env.PLATFORM_DOMAIN,
  });
};

const processRevokeBadgeJob = (job: RevokeBadgeQueueJob, env: Env): void => {
  logInfo(observabilityContext(env), 'processing_revoke_badge', {
    jobType: job.jobType,
    tenantId: job.tenantId,
    assertionId: job.payload.assertionId,
    revocationId: job.payload.revocationId,
    reason: job.payload.reason,
    idempotencyKey: job.idempotencyKey,
    platformDomain: env.PLATFORM_DOMAIN,
  });
};

const handleQueueJob = async (job: QueueJob, env: Env): Promise<void> => {
  switch (job.jobType) {
    case 'issue_badge':
      await processIssueBadgeJob(job, env);
      return;
    case 'revoke_badge':
      processRevokeBadgeJob(job, env);
      return;
    case 'rebuild_verification_cache':
    case 'import_migration_batch':
      logInfo(observabilityContext(env), 'queue_job_received', {
        jobType: job.jobType,
        tenantId: job.tenantId,
        idempotencyKey: job.idempotencyKey,
        platformDomain: env.PLATFORM_DOMAIN,
      });
      return;
  }
};

const worker: ExportedHandler<Env> = {
  async queue(batch, env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const job = parseQueueJob(message.body);
        await handleQueueJob(job, env);
        message.ack();
      } catch (error: unknown) {
        await captureSentryException({
          context: observabilityContext(env),
          dsn: env.SENTRY_DSN,
          error,
          message: 'Queue job failed validation or processing',
          extra: {
            platformDomain: env.PLATFORM_DOMAIN,
          },
        });

        const detail = error instanceof Error ? error.message : 'Unknown error';

        logError(observabilityContext(env), 'queue_job_failed', {
          detail,
          platformDomain: env.PLATFORM_DOMAIN,
        });
        message.retry();
      }
    }
  },
};

export default worker;
