import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const QUALITY_COMMANDS = [
  {
    label: 'lint',
    command: 'pnpm',
    args: ['lint'],
  },
  {
    label: 'typecheck',
    command: 'pnpm',
    args: ['typecheck'],
  },
  {
    label: 'OB3 certification test pack',
    command: 'pnpm',
    args: [
      'test',
      '--',
      'apps/api-worker/src/http-smoke.test.ts',
      'apps/api-worker/src/ob3-oauth.test.ts',
      'apps/api-worker/src/credential-verification.test.ts',
      'apps/api-worker/src/public-badge-page.test.ts',
    ],
  },
];

const SUPPORTED_PROOF_FORMATS = new Set(['Ed25519Signature2020', 'DataIntegrityProof']);
const SUPPORTED_DATA_INTEGRITY_CRYPTOSUITES = new Set(['eddsa-rdfc-2022', 'ecdsa-sd-2023']);

const runCommand = ({ label, command, args }) => {
  process.stdout.write(`\n[ob3-cert] Running ${label}: ${command} ${args.join(' ')}\n`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${String(result.status)}`);
  }
};

const sleep = (milliseconds) => {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
};

const jsonBodyFromResponse = async (response) => {
  const responseText = await response.text();

  if (responseText.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      _raw: responseText,
    };
  }
};

const asObject = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value;
};

const asString = (value) => {
  return typeof value === 'string' ? value : null;
};

const requireNonEmptyString = (value, label) => {
  const candidate = asString(value);

  if (candidate === null || candidate.trim().length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }

  return candidate.trim();
};

const requestJson = async ({ baseUrl, path, method, headers, body }) => {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const responseBody = await jsonBodyFromResponse(response);

  if (!response.ok) {
    throw new Error(
      `Request failed: ${method} ${path} -> ${String(response.status)} ${JSON.stringify(responseBody)}`,
    );
  }

  return responseBody;
};

const ensureDiscoveryDocument = async (baseUrl) => {
  const response = await fetch(new URL('/ims/ob/v3p0/discovery', baseUrl));

  if (!response.ok) {
    const body = await jsonBodyFromResponse(response);
    throw new Error(
      `Discovery endpoint failed: ${String(response.status)} ${JSON.stringify(body)}`,
    );
  }

  const responseBody = await jsonBodyFromResponse(response);
  const documentObject = asObject(responseBody);

  if (documentObject === null) {
    throw new Error('Discovery endpoint did not return a JSON object');
  }

  const openapiVersion = requireNonEmptyString(documentObject.openapi, 'discovery.openapi');

  if (!openapiVersion.startsWith('3.0')) {
    throw new Error(`Expected OpenAPI 3.0.x, got ${JSON.stringify(openapiVersion)}`);
  }

  const infoObject = asObject(documentObject.info);
  const pathsObject = asObject(documentObject.paths);
  const componentsObject = asObject(documentObject.components);
  const securitySchemesObject = asObject(componentsObject?.securitySchemes);
  const oauthScheme = asObject(securitySchemesObject?.OAuth2ACG);
  const oauthFlowsObject = asObject(oauthScheme?.flows);
  const authorizationCodeFlow = asObject(oauthFlowsObject?.authorizationCode);

  if (
    infoObject === null ||
    pathsObject === null ||
    oauthScheme === null ||
    oauthScheme.type !== 'oauth2' ||
    authorizationCodeFlow === null
  ) {
    throw new Error('Discovery document is missing required OB3 OAuth metadata');
  }

  if (asObject(pathsObject['/credentials']) === null || asObject(pathsObject['/profile']) === null) {
    throw new Error("Discovery document must include '/credentials' and '/profile' paths");
  }

  return {
    openapi: openapiVersion,
    title: requireNonEmptyString(infoObject.title, 'discovery.info.title'),
    registrationUrl: requireNonEmptyString(
      oauthScheme['x-imssf-registrationUrl'],
      'discovery.components.securitySchemes.OAuth2ACG.x-imssf-registrationUrl',
    ),
    authorizationUrl: requireNonEmptyString(
      authorizationCodeFlow.authorizationUrl,
      'discovery OAuth authorizationUrl',
    ),
    tokenUrl: requireNonEmptyString(authorizationCodeFlow.tokenUrl, 'discovery OAuth tokenUrl'),
    refreshUrl: requireNonEmptyString(
      authorizationCodeFlow.refreshUrl,
      'discovery OAuth refreshUrl',
    ),
  };
};

const ensureBadgePageSignals = async (baseUrl, badgePagePath) => {
  const response = await fetch(new URL(badgePagePath, baseUrl));

  if (!response.ok) {
    throw new Error(`Badge page retrieval failed: ${String(response.status)} ${badgePagePath}`);
  }

  const html = await response.text();
  const requiredSignals = ['Open Badges 3.0 JSON', 'Validate with IMS tools', 'OpenID4VCI Offer'];
  const missingSignals = requiredSignals.filter((signal) => !html.includes(signal));

  if (missingSignals.length > 0) {
    throw new Error(
      `Badge page is missing expected verification/import UI signals: ${missingSignals.join(', ')}`,
    );
  }

  return {
    requiredSignals,
  };
};

const assertVerificationStatus = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`Expected ${label} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const assertOneOf = (actual, allowed, label) => {
  if (typeof actual !== 'string' || !allowed.has(actual)) {
    throw new Error(
      `Expected ${label} to be one of ${JSON.stringify(Array.from(allowed))}, got ${JSON.stringify(actual)}`,
    );
  }
};

const renderManualChecklist = (input) => {
  const evidence = input.liveEvidence;
  const missing = '(run live preflight to populate)';

  const badgePageUrl = evidence?.badgePageUrl ?? missing;
  const verificationUrl = evidence?.verificationUrl ?? missing;
  const credentialJsonLdUrl = evidence?.credentialJsonLdUrl ?? missing;
  const credentialDownloadUrl = evidence?.credentialDownloadUrl ?? missing;
  const discoveryUrl = evidence?.discoveryUrl ?? missing;
  const proofFormat = evidence?.verificationSummary?.proofFormat ?? missing;
  const proofCryptosuite = evidence?.verificationSummary?.proofCryptosuite ?? missing;

  return [
    '# OB3 Certification Submission Checklist',
    '',
    `Generated: ${input.generatedAt}`,
    `Preflight JSON: ${input.preflightJsonFileName}`,
    '',
    '## Issued credential links',
    '',
    `- Badge page: ${badgePageUrl}`,
    `- Verification API: ${verificationUrl}`,
    `- Credential JSON-LD: ${credentialJsonLdUrl}`,
    `- Credential download: ${credentialDownloadUrl}`,
    `- Discovery document: ${discoveryUrl}`,
    '',
    '## Proof evidence snapshot',
    '',
    `- Proof format: ${proofFormat}`,
    `- Proof cryptosuite: ${proofCryptosuite}`,
    '',
    '## Manual completion steps',
    '',
    '- [ ] Submit credential evidence to 1EdTech conformance tooling.',
    '- [ ] Complete required issuer conformance suite runs.',
    '- [ ] Record recipient retrieval video (email -> badge page -> JSON-LD -> verify endpoint).',
    '- [ ] Save conformance export artifacts in artifacts/ob3-certification/.',
    '- [ ] Save approval confirmation and logo/license artifacts.',
    '',
    '## Submission metadata',
    '',
    '- Conformance submission ID:',
    '- Conformance run URL:',
    '- Reviewer:',
    '- Approval date:',
    '- Notes:',
    '',
  ].join('\n');
};

const runLiveCertificationSmokeTest = async () => {
  const baseUrlValue = process.env.CERT_BASE_URL;

  if (baseUrlValue === undefined || baseUrlValue.trim().length === 0) {
    process.stdout.write('\n[ob3-cert] CERT_BASE_URL is not set; skipping live issuance smoke test.\n');
    return null;
  }

  const bootstrapToken = process.env.CERT_BOOTSTRAP_ADMIN_TOKEN;

  if (bootstrapToken === undefined || bootstrapToken.trim().length === 0) {
    throw new Error('CERT_BOOTSTRAP_ADMIN_TOKEN is required when CERT_BASE_URL is set');
  }

  const baseUrl = new URL(baseUrlValue.trim());
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const tenantId = process.env.CERT_TENANT_ID?.trim() || 'ob3cert';
  const badgeTemplateId = process.env.CERT_BADGE_TEMPLATE_ID?.trim() || 'badge_template_ob3_cert';
  const keyId = process.env.CERT_KEY_ID?.trim() || `ob3-cert-key-${timestamp}`;
  const issuerDid =
    process.env.CERT_ISSUER_DID?.trim() || `did:web:${baseUrl.hostname}:${encodeURIComponent(tenantId)}`;
  const recipientEmail = process.env.CERT_RECIPIENT_EMAIL?.trim() || 'conformance@imsglobal.org';
  const idempotencyKey = process.env.CERT_IDEMPOTENCY_KEY?.trim() || `ob3-cert-${timestamp}`;
  const expectedProofType = process.env.CERT_EXPECTED_PROOF_TYPE?.trim();
  const expectedCryptosuite = process.env.CERT_EXPECTED_CRYPTOSUITE?.trim();
  const adminHeaders = {
    authorization: `Bearer ${bootstrapToken.trim()}`,
    'content-type': 'application/json',
  };

  if (expectedProofType !== undefined && expectedProofType.length > 0) {
    assertOneOf(expectedProofType, SUPPORTED_PROOF_FORMATS, 'CERT_EXPECTED_PROOF_TYPE');
  }

  if (expectedCryptosuite !== undefined && expectedCryptosuite.length > 0) {
    assertOneOf(
      expectedCryptosuite,
      SUPPORTED_DATA_INTEGRITY_CRYPTOSUITES,
      'CERT_EXPECTED_CRYPTOSUITE',
    );
  }

  process.stdout.write('\n[ob3-cert] Running live issuance smoke test against configured deployment.\n');

  const discoverySummary = await ensureDiscoveryDocument(baseUrl);

  const generatedKeyResponse = await requestJson({
    baseUrl,
    path: '/v1/signing/keys/generate',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: {
      did: issuerDid,
      keyId,
    },
  });
  const generatedKeyObject = asObject(generatedKeyResponse);
  const keyMaterial = asObject(generatedKeyObject?.keyMaterial);
  const publicJwk = asObject(keyMaterial?.publicJwk);
  const privateJwk = asObject(keyMaterial?.privateJwk);
  const resolvedKeyId = asString(keyMaterial?.keyId);

  if (publicJwk === null || privateJwk === null || resolvedKeyId === null) {
    throw new Error('Signing key generation response did not include expected key material');
  }

  await requestJson({
    baseUrl,
    path: `/v1/admin/tenants/${encodeURIComponent(tenantId)}`,
    method: 'PUT',
    headers: adminHeaders,
    body: {
      slug: tenantId,
      displayName: 'OB3 Certification Tenant',
      planTier: 'team',
      issuerDomain: `${tenantId}.${baseUrl.hostname}`,
      isActive: true,
    },
  });

  await requestJson({
    baseUrl,
    path: `/v1/admin/tenants/${encodeURIComponent(tenantId)}/signing-registration`,
    method: 'PUT',
    headers: adminHeaders,
    body: {
      keyId: resolvedKeyId,
      publicJwk,
      privateJwk,
    },
  });

  await requestJson({
    baseUrl,
    path: `/v1/admin/tenants/${encodeURIComponent(tenantId)}/badge-templates/${encodeURIComponent(badgeTemplateId)}`,
    method: 'PUT',
    headers: adminHeaders,
    body: {
      slug: 'ob3-certification-badge',
      title: 'OB3 Certification Test Badge',
      description: 'Issued for Open Badges 3.0 issuer conformance validation.',
      criteriaUri: 'https://example.org/ob3/certification/criteria',
      imageUri: 'https://example.org/ob3/certification/image.png',
    },
  });

  const issueResponse = await requestJson({
    baseUrl,
    path: '/v1/issue',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: {
      tenantId,
      badgeTemplateId,
      recipientIdentity: recipientEmail,
      recipientIdentityType: 'email',
      idempotencyKey,
    },
  });
  const issueObject = asObject(issueResponse);
  const assertionId = asString(issueObject?.assertionId);

  if (assertionId === null) {
    throw new Error('Issue endpoint did not return assertionId');
  }

  const jobProcessorToken = process.env.CERT_JOB_PROCESSOR_TOKEN?.trim();
  const processorHeaders = {
    'content-type': 'application/json',
    ...(jobProcessorToken === undefined || jobProcessorToken.length === 0
      ? {}
      : { authorization: `Bearer ${jobProcessorToken}` }),
  };

  await requestJson({
    baseUrl,
    path: '/v1/jobs/process',
    method: 'POST',
    headers: processorHeaders,
    body: {
      limit: 20,
      leaseSeconds: 60,
      retryDelaySeconds: 5,
    },
  });

  const encodedAssertionId = encodeURIComponent(assertionId);
  let verificationBody = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const verificationResponse = await fetch(new URL(`/credentials/v1/${encodedAssertionId}`, baseUrl));

    if (verificationResponse.status === 404) {
      await sleep(1000);
      continue;
    }

    if (!verificationResponse.ok) {
      const failedVerificationBody = await jsonBodyFromResponse(verificationResponse);
      throw new Error(
        `Verification endpoint failed: ${String(verificationResponse.status)} ${JSON.stringify(failedVerificationBody)}`,
      );
    }

    verificationBody = await jsonBodyFromResponse(verificationResponse);
    break;
  }

  const verificationObject = asObject(verificationBody);
  const verification = asObject(verificationObject?.verification);
  const verificationStatus = asString(verification?.status);
  const checks = asObject(verification?.checks);
  const credentialSubjectCheck = asObject(checks?.credentialSubject);
  const credentialSubjectStatus = asString(credentialSubjectCheck?.status);
  const jsonLdCheck = asObject(checks?.jsonLdSafeMode);
  const jsonLdStatus = asString(jsonLdCheck?.status);
  const credentialSchemaCheck = asObject(checks?.credentialSchema);
  const credentialSchemaStatus = asString(credentialSchemaCheck?.status);
  const datesCheck = asObject(checks?.dates);
  const datesStatus = asString(datesCheck?.status);
  const credentialStatusCheck = asObject(checks?.credentialStatus);
  const credentialStatus = asString(credentialStatusCheck?.status);
  const proof = asObject(verification?.proof);
  const proofStatus = asString(proof?.status);
  const proofFormat = asString(proof?.format);
  const proofCryptosuite = asString(proof?.cryptosuite);

  assertVerificationStatus(verificationStatus, 'active', 'verification.status');
  assertVerificationStatus(credentialSubjectStatus, 'valid', 'verification.checks.credentialSubject.status');
  assertVerificationStatus(jsonLdStatus, 'valid', 'verification.checks.jsonLdSafeMode.status');
  assertVerificationStatus(datesStatus, 'valid', 'verification.checks.dates.status');
  assertVerificationStatus(credentialStatus, 'valid', 'verification.checks.credentialStatus.status');
  assertVerificationStatus(proofStatus, 'valid', 'verification.proof.status');

  if (credentialSchemaStatus === 'invalid') {
    throw new Error('verification.checks.credentialSchema.status is invalid');
  }

  assertOneOf(proofFormat, SUPPORTED_PROOF_FORMATS, 'verification.proof.format');

  if (proofFormat === 'DataIntegrityProof') {
    assertOneOf(
      proofCryptosuite,
      SUPPORTED_DATA_INTEGRITY_CRYPTOSUITES,
      'verification.proof.cryptosuite',
    );
  }

  if (expectedProofType !== undefined && expectedProofType.length > 0) {
    assertVerificationStatus(proofFormat, expectedProofType, 'verification.proof.format');
  }

  if (expectedCryptosuite !== undefined && expectedCryptosuite.length > 0) {
    if (proofFormat !== 'DataIntegrityProof') {
      throw new Error('CERT_EXPECTED_CRYPTOSUITE requires verification.proof.format=DataIntegrityProof');
    }

    assertVerificationStatus(
      proofCryptosuite,
      expectedCryptosuite,
      'verification.proof.cryptosuite',
    );
  }

  const jsonldResponse = await fetch(new URL(`/credentials/v1/${encodedAssertionId}/jsonld`, baseUrl));

  if (!jsonldResponse.ok) {
    const jsonldBody = await jsonBodyFromResponse(jsonldResponse);
    throw new Error(`JSON-LD retrieval failed: ${String(jsonldResponse.status)} ${JSON.stringify(jsonldBody)}`);
  }

  const badgePagePath = `/badges/${encodedAssertionId}`;
  const verificationPath = `/credentials/v1/${encodedAssertionId}`;
  const downloadPath = `/credentials/v1/${encodedAssertionId}/download`;
  const jsonldPath = `/credentials/v1/${encodedAssertionId}/jsonld`;
  const discoveryPath = '/ims/ob/v3p0/discovery';
  const badgePageSignals = await ensureBadgePageSignals(baseUrl, badgePagePath);

  return {
    baseUrl: baseUrl.toString(),
    tenantId,
    badgeTemplateId,
    issuerDid,
    keyId: resolvedKeyId,
    recipientEmail,
    assertionId,
    badgePageUrl: new URL(badgePagePath, baseUrl).toString(),
    verificationUrl: new URL(verificationPath, baseUrl).toString(),
    credentialDownloadUrl: new URL(downloadPath, baseUrl).toString(),
    credentialJsonLdUrl: new URL(jsonldPath, baseUrl).toString(),
    discoveryUrl: new URL(discoveryPath, baseUrl).toString(),
    discoverySummary,
    verificationSummary: {
      status: verificationStatus,
      jsonLdStatus,
      credentialSchemaStatus,
      credentialSubjectStatus,
      datesStatus,
      credentialStatus,
      proofStatus,
      proofFormat,
      proofCryptosuite,
      checkedAt: asString(verification?.checkedAt),
    },
    badgePageSignals,
  };
};

const main = async () => {
  const skipLocalChecks = process.argv.includes('--skip-local');
  const runLiveOnly = process.argv.includes('--live-only');

  if (!runLiveOnly) {
    if (skipLocalChecks) {
      process.stdout.write('[ob3-cert] Local quality checks skipped by flag.\n');
    } else {
      for (const command of QUALITY_COMMANDS) {
        runCommand(command);
      }
    }
  }

  const liveEvidence = await runLiveCertificationSmokeTest();
  const outputDirectory = resolve('artifacts', 'ob3-certification');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFileStem = `preflight-${timestamp}`;
  const outputPath = resolve(outputDirectory, `${outputFileStem}.json`);
  const checklistPath = resolve(outputDirectory, `${outputFileStem}.md`);

  mkdirSync(outputDirectory, {
    recursive: true,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    localChecksExecuted: runLiveOnly ? false : !skipLocalChecks,
    liveCheckExecuted: liveEvidence !== null,
    liveEvidence,
  };

  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(
    checklistPath,
    `${renderManualChecklist({
      generatedAt: report.generatedAt,
      preflightJsonFileName: `${outputFileStem}.json`,
      liveEvidence,
    })}\n`,
    'utf8',
  );
  process.stdout.write(`\n[ob3-cert] Wrote preflight report: ${outputPath}\n`);
  process.stdout.write(`[ob3-cert] Wrote submission checklist: ${checklistPath}\n`);
};

main().catch((error) => {
  process.stderr.write(`\n[ob3-cert] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
