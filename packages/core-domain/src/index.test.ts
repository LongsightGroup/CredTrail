import { describe, expect, it } from 'vitest';

import {
  createDidDocument,
  createDidWeb,
  didWebDocumentPath,
  generateTenantDidSigningMaterial,
  signCredentialWithEd25519Signature2020,
  verifyCredentialProofWithEd25519Signature2020,
} from './index';

describe('did:web helpers', () => {
  it('builds did:web identifiers for host and tenant path', () => {
    expect(createDidWeb({ host: 'issuers.credtrail.org' })).toBe('did:web:issuers.credtrail.org');
    expect(createDidWeb({ host: 'issuers.credtrail.org', pathSegments: ['tenant-a'] })).toBe(
      'did:web:issuers.credtrail.org:tenant-a',
    );
  });

  it('maps did:web identifiers to document path', () => {
    expect(didWebDocumentPath('did:web:issuers.credtrail.org')).toBe('/.well-known/did.json');
    expect(didWebDocumentPath('did:web:issuers.credtrail.org:tenant-a')).toBe('/tenant-a/did.json');
  });
});

describe('credential signing', () => {
  it('generates keys, signs credentials, and verifies proof', async () => {
    const did = createDidWeb({
      host: 'issuers.credtrail.org',
      pathSegments: ['tenant-a'],
    });
    const signingMaterial = await generateTenantDidSigningMaterial({
      did,
      keyId: 'key-1',
    });
    const didDocument = createDidDocument({
      did,
      keyId: signingMaterial.keyId,
      publicJwk: signingMaterial.publicJwk,
    });
    const signedCredential = await signCredentialWithEd25519Signature2020({
      credential: {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:vc-123',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: did,
        credentialSubject: {
          id: 'mailto:learner@example.edu',
          achievement: {
            id: 'urn:uuid:badge-123',
            type: ['Achievement'],
            name: 'TypeScript Fundamentals',
          },
        },
      },
      privateJwk: signingMaterial.privateJwk,
      verificationMethod: `${did}#${signingMaterial.keyId}`,
    });

    expect(didDocument.id).toBe(did);
    expect(signedCredential.proof.type).toBe('Ed25519Signature2020');
    expect(signedCredential.proof.verificationMethod).toBe(`${did}#${signingMaterial.keyId}`);

    const isValid = await verifyCredentialProofWithEd25519Signature2020({
      credential: signedCredential,
      publicJwk: signingMaterial.publicJwk,
    });

    expect(isValid).toBe(true);
  });

  it('fails verification when credential payload is modified', async () => {
    const did = createDidWeb({
      host: 'issuers.credtrail.org',
      pathSegments: ['tenant-b'],
    });
    const signingMaterial = await generateTenantDidSigningMaterial({
      did,
    });
    const signedCredential = await signCredentialWithEd25519Signature2020({
      credential: {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:vc-456',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: did,
        credentialSubject: {
          id: 'mailto:learner@example.edu',
          achievement: {
            id: 'urn:uuid:badge-456',
            type: ['Achievement'],
            name: 'Cloudflare Workers Basics',
          },
        },
      },
      privateJwk: signingMaterial.privateJwk,
      verificationMethod: `${did}#${signingMaterial.keyId}`,
    });

    const tamperedCredential = {
      ...signedCredential,
      issuer: 'did:web:tampered.credtrail.org:tenant-b',
    };

    const isValid = await verifyCredentialProofWithEd25519Signature2020({
      credential: tamperedCredential,
      publicJwk: signingMaterial.publicJwk,
    });

    expect(isValid).toBe(false);
  });
});
