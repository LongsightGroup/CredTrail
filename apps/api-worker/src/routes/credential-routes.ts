import { createDidWeb, type ImmutableCredentialStore, type JsonObject } from '@credtrail/core-domain';
import { listAssertionStatusListEntries, type SqlDatabase } from '@credtrail/db';
import type { Hono } from 'hono';
import { parseCredentialPathParams, parseTenantPathParams } from '@credtrail/validation';
import type { AppBindings, AppContext, AppEnv } from '../app';

interface VerificationAssertion {
  id: string;
  tenantId: string;
  issuedAt: string;
  revokedAt: string | null;
  statusListIndex: number | null;
}

interface AssertionLifecycleSummary {
  state: 'active' | 'suspended' | 'revoked' | 'expired';
  source: 'lifecycle_event' | 'assertion_revocation' | 'default_active';
  reasonCode: string | null;
  reason: string | null;
  transitionedAt: string | null;
  revokedAt: string | null;
}

interface VerificationViewModel<
  AssertionValue extends VerificationAssertion,
  CredentialValue extends JsonObject,
> {
  assertion: AssertionValue;
  credential: CredentialValue;
  recipientDisplayName: string | null;
  lifecycle: AssertionLifecycleSummary;
}

type VerificationLookupResult<
  AssertionValue extends VerificationAssertion,
  CredentialValue extends JsonObject,
> =
  | {
      status: 'invalid_id';
    }
  | {
      status: 'not_found';
    }
  | {
      status: 'ok';
      value: VerificationViewModel<AssertionValue, CredentialValue>;
    };

interface CredentialStatusListReference extends JsonObject {
  id: string;
  type: string;
  statusPurpose: 'revocation';
  statusListIndex: string;
  statusListCredential: string;
}

interface CredentialVerificationChecksSummary {
  credentialStatus: {
    status: 'valid' | 'invalid' | 'unchecked';
    revoked: boolean | null;
  };
}

interface CredentialLifecycleVerificationSummary {
  state: 'active' | 'suspended' | 'expired' | 'revoked';
  reason: string | null;
  checkedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

interface AchievementDetails {
  imageUri: string | null;
}

interface BadgePdfDocumentInput {
  badgeName: string;
  recipientName: string;
  recipientIdentifier: string;
  issuerName: string;
  issuedAt: string;
  status: 'Verified' | 'Suspended' | 'Revoked' | 'Expired';
  assertionId: string;
  credentialId: string;
  publicBadgeUrl: string;
  verificationUrl: string;
  ob3JsonUrl: string;
  badgeImageUrl: string | null;
  revokedAt?: string;
}

interface SigningEntry {
  privateJwk?:
    | {
        kty: string;
      }
    | undefined;
}

interface BuildRevocationStatusListCredentialInput {
  requestUrl: string;
  tenantId: string;
  issuerDid: string;
  statusEntries: readonly {
    statusListIndex: number;
    revoked: boolean;
  }[];
}

interface SignCredentialForDidResult {
  status: 'ok' | 'error';
  statusCode?: 400 | 404 | 422 | 500 | 502;
  error?: string;
  credential?: JsonObject;
}

interface RegisterCredentialRoutesInput<
  AssertionValue extends VerificationAssertion,
  CredentialValue extends JsonObject,
> {
  app: Hono<AppEnv>;
  resolveDatabase: (bindings: AppBindings) => SqlDatabase;
  loadVerificationViewModel: (
    db: SqlDatabase,
    store: ImmutableCredentialStore,
    credentialId: string,
  ) => Promise<VerificationLookupResult<AssertionValue, CredentialValue>>;
  credentialStatusForAssertion: (
    statusListCredential: string,
    statusListIndex: number,
  ) => CredentialStatusListReference;
  revocationStatusListUrlForTenant: (requestUrl: string, tenantId: string) => string;
  summarizeCredentialVerificationChecks: (input: {
    context: AppContext;
    credential: CredentialValue;
    checkedAt: string;
    expectedStatusList: CredentialStatusListReference | null;
  }) => Promise<CredentialVerificationChecksSummary>;
  summarizeCredentialLifecycleVerification: (
    credential: CredentialValue,
    revokedAt: string | null,
    checkedAt: string,
  ) => CredentialLifecycleVerificationSummary;
  verifyCredentialProofSummary: (context: AppContext, credential: CredentialValue) => Promise<unknown>;
  credentialDownloadFilename: (assertionId: string) => string;
  publicBadgePathForAssertion: (assertion: AssertionValue) => string;
  asString: (value: unknown) => string | null;
  achievementDetailsFromCredential: (credential: CredentialValue) => AchievementDetails;
  recipientDisplayNameFromAssertion: (assertion: AssertionValue) => string | null;
  recipientFromCredential: (credential: CredentialValue) => string;
  badgeNameFromCredential: (credential: CredentialValue) => string;
  issuerNameFromCredential: (credential: CredentialValue) => string;
  formatIsoTimestamp: (timestampIso: string) => string;
  renderBadgePdfDocument: (input: BadgePdfDocumentInput) => Promise<Uint8Array>;
  credentialPdfDownloadFilename: (assertionId: string) => string;
  resolveSigningEntryForDid: (context: AppContext, did: string) => Promise<SigningEntry | null>;
  resolveRemoteSignerRegistryEntryForDid: (
    context: AppContext,
    did: string,
  ) => object | null;
  buildRevocationStatusListCredential: (
    input: BuildRevocationStatusListCredentialInput,
  ) => Promise<{
    credential: JsonObject;
    issuedAt: string;
  }>;
  signCredentialForDid: (input: {
    context: AppContext;
    did: string;
    credential: JsonObject;
    proofType: 'Ed25519Signature2020' | 'DataIntegrityProof';
    createdAt?: string;
    missingPrivateKeyError?: string;
    ed25519KeyRequirementError?: string;
  }) => Promise<SignCredentialForDidResult>;
}

const credentialLookupErrorResponse = (
  c: AppContext,
  status: 'invalid_id' | 'not_found',
): Response => {
  const statusCode: 400 | 404 = status === 'invalid_id' ? 400 : 404;
  const errorMessage =
    status === 'invalid_id' ? 'Invalid credential identifier' : 'Credential not found';

  return c.json(
    {
      error: errorMessage,
    },
    statusCode,
  );
};

const sanitizeHeaderValue = (value: string): string => {
  return value.replaceAll(/[\r\n]+/g, ' ').trim();
};

const mergedCredentialLifecycle = (input: {
  baseLifecycle: CredentialLifecycleVerificationSummary;
  assertionLifecycle: AssertionLifecycleSummary;
}): CredentialLifecycleVerificationSummary => {
  const { baseLifecycle, assertionLifecycle } = input;

  if (assertionLifecycle.state === 'revoked') {
    return {
      state: 'revoked',
      reason:
        assertionLifecycle.reason ??
        baseLifecycle.reason ??
        'credential has been revoked by issuer',
      checkedAt: baseLifecycle.checkedAt,
      expiresAt: baseLifecycle.expiresAt,
      revokedAt: assertionLifecycle.revokedAt ?? baseLifecycle.revokedAt,
    };
  }

  if (baseLifecycle.state === 'revoked') {
    return baseLifecycle;
  }

  if (assertionLifecycle.state === 'suspended') {
    return {
      state: 'suspended',
      reason: assertionLifecycle.reason ?? 'credential has been suspended by issuer',
      checkedAt: baseLifecycle.checkedAt,
      expiresAt: baseLifecycle.expiresAt,
      revokedAt: baseLifecycle.revokedAt,
    };
  }

  if (assertionLifecycle.state === 'expired') {
    return {
      state: 'expired',
      reason:
        assertionLifecycle.reason ??
        baseLifecycle.reason ??
        'credential is expired under institutional lifecycle policy',
      checkedAt: baseLifecycle.checkedAt,
      expiresAt: baseLifecycle.expiresAt ?? assertionLifecycle.transitionedAt,
      revokedAt: baseLifecycle.revokedAt,
    };
  }

  return baseLifecycle;
};

const credentialLifecycleLabel = (
  state: CredentialLifecycleVerificationSummary['state'],
): BadgePdfDocumentInput['status'] => {
  switch (state) {
    case 'active':
      return 'Verified';
    case 'suspended':
      return 'Suspended';
    case 'revoked':
      return 'Revoked';
    case 'expired':
      return 'Expired';
  }
};

const setCredentialLifecycleHeaders = (
  c: AppContext,
  lifecycle: CredentialLifecycleVerificationSummary,
): void => {
  c.header('X-Credtrail-Credential-State', lifecycle.state);

  if (lifecycle.reason !== null) {
    c.header('X-Credtrail-Credential-Reason', sanitizeHeaderValue(lifecycle.reason));
  }
};

export const registerCredentialRoutes = <
  AssertionValue extends VerificationAssertion,
  CredentialValue extends JsonObject,
>(
  input: RegisterCredentialRoutesInput<AssertionValue, CredentialValue>,
): void => {
  const {
    app,
    resolveDatabase,
    loadVerificationViewModel,
    credentialStatusForAssertion,
    revocationStatusListUrlForTenant,
    summarizeCredentialVerificationChecks,
    summarizeCredentialLifecycleVerification,
    verifyCredentialProofSummary,
    credentialDownloadFilename,
    publicBadgePathForAssertion,
    asString,
    achievementDetailsFromCredential,
    recipientDisplayNameFromAssertion,
    recipientFromCredential,
    badgeNameFromCredential,
    issuerNameFromCredential,
    formatIsoTimestamp,
    renderBadgePdfDocument,
    credentialPdfDownloadFilename,
    resolveSigningEntryForDid,
    resolveRemoteSignerRegistryEntryForDid,
    buildRevocationStatusListCredential,
    signCredentialForDid,
  } = input;

  app.get('/credentials/v1/status-lists/:tenantId/revocation', async (c) => {
    const pathParams = parseTenantPathParams(c.req.param());
    const issuerDid = createDidWeb({
      host: c.env.PLATFORM_DOMAIN,
      pathSegments: [pathParams.tenantId],
    });
    const signingEntry = await resolveSigningEntryForDid(c, issuerDid);

    if (signingEntry === null) {
      return c.json(
        {
          error: 'No signing configuration for tenant DID',
          did: issuerDid,
        },
        404,
      );
    }

    if (signingEntry.privateJwk !== undefined && signingEntry.privateJwk.kty !== 'OKP') {
      return c.json(
        {
          error: 'Revocation status list signing requires an Ed25519 private key',
          did: issuerDid,
        },
        422,
      );
    }

    if (
      signingEntry.privateJwk === undefined &&
      resolveRemoteSignerRegistryEntryForDid(c, issuerDid) === null
    ) {
      return c.json(
        {
          error:
            'Tenant DID is missing private signing key material and no remote signer is configured',
          did: issuerDid,
        },
        500,
      );
    }

    const assertions = await listAssertionStatusListEntries(resolveDatabase(c.env), pathParams.tenantId);
    const statusEntries = assertions.map((assertion) => {
      return {
        statusListIndex: assertion.statusListIndex,
        revoked: assertion.revokedAt !== null,
      };
    });
    const statusListCredentialInput = await buildRevocationStatusListCredential({
      requestUrl: c.req.url,
      tenantId: pathParams.tenantId,
      issuerDid,
      statusEntries,
    });
    const signedStatusListCredential = await signCredentialForDid({
      context: c,
      did: issuerDid,
      credential: statusListCredentialInput.credential,
      proofType: 'Ed25519Signature2020',
      createdAt: statusListCredentialInput.issuedAt,
      missingPrivateKeyError:
        'Tenant DID is missing private signing key material and no remote signer is configured',
      ed25519KeyRequirementError: 'Revocation status list signing requires an Ed25519 private key',
    });

    if (signedStatusListCredential.status !== 'ok' || signedStatusListCredential.credential === undefined) {
      return c.json(
        {
          error: signedStatusListCredential.error ?? 'Unable to sign revocation status list credential',
          did: issuerDid,
        },
        signedStatusListCredential.statusCode ?? 500,
      );
    }

    c.header('Cache-Control', 'no-store');
    c.header('Content-Type', 'application/ld+json; charset=utf-8');
    return c.body(JSON.stringify(signedStatusListCredential.credential, null, 2));
  });

  app.get('/credentials/v1/:credentialId', async (c) => {
    const pathParams = parseCredentialPathParams(c.req.param());
    const result = await loadVerificationViewModel(
      resolveDatabase(c.env),
      c.env.BADGE_OBJECTS,
      pathParams.credentialId,
    );

    if (result.status !== 'ok') {
      return credentialLookupErrorResponse(c, result.status);
    }

    c.header('Cache-Control', 'no-store');

    const statusList: CredentialStatusListReference | null =
      result.value.assertion.statusListIndex === null
        ? null
        : credentialStatusForAssertion(
            revocationStatusListUrlForTenant(c.req.url, result.value.assertion.tenantId),
            result.value.assertion.statusListIndex,
          );
    const checkedAt = new Date().toISOString();
    const checks = await summarizeCredentialVerificationChecks({
      context: c,
      credential: result.value.credential,
      checkedAt,
      expectedStatusList: statusList,
    });
    const resolvedRevokedAt =
      checks.credentialStatus.status === 'valid'
        ? checks.credentialStatus.revoked
          ? checkedAt
          : null
        : result.value.assertion.revokedAt;
    const lifecycle = summarizeCredentialLifecycleVerification(
      result.value.credential,
      resolvedRevokedAt,
      checkedAt,
    );
    const effectiveLifecycle = mergedCredentialLifecycle({
      baseLifecycle: lifecycle,
      assertionLifecycle: result.value.lifecycle,
    });
    const proof = await verifyCredentialProofSummary(c, result.value.credential);
    setCredentialLifecycleHeaders(c, effectiveLifecycle);

    return c.json({
      assertionId: result.value.assertion.id,
      tenantId: result.value.assertion.tenantId,
      issuedAt: result.value.assertion.issuedAt,
      verification: {
        status: effectiveLifecycle.state,
        reason: effectiveLifecycle.reason,
        checkedAt: effectiveLifecycle.checkedAt,
        expiresAt: effectiveLifecycle.expiresAt,
        revokedAt: effectiveLifecycle.revokedAt,
        assertionLifecycle: {
          state: result.value.lifecycle.state,
          source: result.value.lifecycle.source,
          reasonCode: result.value.lifecycle.reasonCode,
          reason: result.value.lifecycle.reason,
          transitionedAt: result.value.lifecycle.transitionedAt,
          revokedAt: result.value.lifecycle.revokedAt,
        },
        statusList,
        checks,
        proof,
      },
      credential: result.value.credential,
    });
  });

  app.get('/credentials/v1/:credentialId/jsonld', async (c) => {
    const pathParams = parseCredentialPathParams(c.req.param());
    const result = await loadVerificationViewModel(
      resolveDatabase(c.env),
      c.env.BADGE_OBJECTS,
      pathParams.credentialId,
    );

    if (result.status !== 'ok') {
      return credentialLookupErrorResponse(c, result.status);
    }

    c.header('Cache-Control', 'no-store');
    c.header('Content-Type', 'application/ld+json; charset=utf-8');
    const jsonCheckedAt = new Date().toISOString();
    const jsonBaseLifecycle = summarizeCredentialLifecycleVerification(
      result.value.credential,
      result.value.assertion.revokedAt,
      jsonCheckedAt,
    );
    const jsonEffectiveLifecycle = mergedCredentialLifecycle({
      baseLifecycle: jsonBaseLifecycle,
      assertionLifecycle: result.value.lifecycle,
    });
    setCredentialLifecycleHeaders(c, jsonEffectiveLifecycle);

    return c.body(JSON.stringify(result.value.credential, null, 2));
  });

  app.get('/credentials/v1/:credentialId/download', async (c) => {
    const pathParams = parseCredentialPathParams(c.req.param());
    const result = await loadVerificationViewModel(
      resolveDatabase(c.env),
      c.env.BADGE_OBJECTS,
      pathParams.credentialId,
    );

    if (result.status !== 'ok') {
      return credentialLookupErrorResponse(c, result.status);
    }

    c.header('Cache-Control', 'no-store');
    c.header('Content-Type', 'application/ld+json; charset=utf-8');
    const downloadCheckedAt = new Date().toISOString();
    const downloadBaseLifecycle = summarizeCredentialLifecycleVerification(
      result.value.credential,
      result.value.assertion.revokedAt,
      downloadCheckedAt,
    );
    const downloadEffectiveLifecycle = mergedCredentialLifecycle({
      baseLifecycle: downloadBaseLifecycle,
      assertionLifecycle: result.value.lifecycle,
    });
    setCredentialLifecycleHeaders(c, downloadEffectiveLifecycle);
    c.header(
      'Content-Disposition',
      `attachment; filename="${credentialDownloadFilename(result.value.assertion.id)}"`,
    );

    return c.body(JSON.stringify(result.value.credential, null, 2));
  });

  app.get('/credentials/v1/:credentialId/download.pdf', async (c) => {
    const pathParams = parseCredentialPathParams(c.req.param());
    const result = await loadVerificationViewModel(
      resolveDatabase(c.env),
      c.env.BADGE_OBJECTS,
      pathParams.credentialId,
    );

    if (result.status !== 'ok') {
      return credentialLookupErrorResponse(c, result.status);
    }

    const publicBadgePath = publicBadgePathForAssertion(result.value.assertion);
    const verificationPath = `/credentials/v1/${encodeURIComponent(result.value.assertion.id)}`;
    const ob3JsonPath = `${verificationPath}/jsonld`;
    const pdfCheckedAt = new Date().toISOString();
    const pdfBaseLifecycle = summarizeCredentialLifecycleVerification(
      result.value.credential,
      result.value.assertion.revokedAt,
      pdfCheckedAt,
    );
    const pdfEffectiveLifecycle = mergedCredentialLifecycle({
      baseLifecycle: pdfBaseLifecycle,
      assertionLifecycle: result.value.lifecycle,
    });
    const credentialId = asString(result.value.credential.id) ?? result.value.assertion.id;
    const achievementDetails = achievementDetailsFromCredential(result.value.credential);
    const recipientName =
      result.value.recipientDisplayName ??
      recipientDisplayNameFromAssertion(result.value.assertion) ??
      'Badge recipient';
    const pdfDocument = await renderBadgePdfDocument({
      badgeName: badgeNameFromCredential(result.value.credential),
      recipientName,
      recipientIdentifier: recipientFromCredential(result.value.credential),
      issuerName: issuerNameFromCredential(result.value.credential),
      issuedAt: `${formatIsoTimestamp(result.value.assertion.issuedAt)} UTC`,
      status: credentialLifecycleLabel(pdfEffectiveLifecycle.state),
      assertionId: result.value.assertion.id,
      credentialId,
      publicBadgeUrl: new URL(publicBadgePath, c.req.url).toString(),
      verificationUrl: new URL(verificationPath, c.req.url).toString(),
      ob3JsonUrl: new URL(ob3JsonPath, c.req.url).toString(),
      badgeImageUrl: achievementDetails.imageUri,
      ...(pdfEffectiveLifecycle.revokedAt === null
        ? {}
        : {
            revokedAt: `${formatIsoTimestamp(pdfEffectiveLifecycle.revokedAt)} UTC`,
          }),
    });
    const pdfBody = Uint8Array.from(pdfDocument).buffer;

    return new Response(pdfBody, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${credentialPdfDownloadFilename(result.value.assertion.id)}"`,
        'X-Credtrail-Credential-State': pdfEffectiveLifecycle.state,
        ...(pdfEffectiveLifecycle.reason === null
          ? {}
          : {
              'X-Credtrail-Credential-Reason': sanitizeHeaderValue(pdfEffectiveLifecycle.reason),
            }),
      },
    });
  });
};
