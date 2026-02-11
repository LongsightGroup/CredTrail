export type QueueJobType =
  | 'issue_badge'
  | 'revoke_badge'
  | 'rebuild_verification_cache'
  | 'import_migration_batch';

export interface TenantScopedResourceId {
  tenantId: string;
  resourceId: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface Ed25519PublicJwk {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  kid?: string;
}

export interface Ed25519PrivateJwk extends Ed25519PublicJwk {
  d: string;
}

export interface TenantDidSigningMaterial {
  did: string;
  keyId: string;
  publicJwk: Ed25519PublicJwk;
  privateJwk: Ed25519PrivateJwk;
}

export interface GenerateTenantDidSigningMaterialInput {
  did: string;
  keyId?: string;
}

export interface DidVerificationMethod {
  id: string;
  type: 'JsonWebKey2020';
  controller: string;
  publicKeyJwk: Ed25519PublicJwk;
}

export interface DidDocument {
  '@context': readonly ['https://www.w3.org/ns/did/v1'];
  id: string;
  verificationMethod: readonly [DidVerificationMethod];
  assertionMethod: readonly [string];
}

export interface CreateDidWebInput {
  host: string;
  pathSegments?: readonly string[];
}

export interface CreateDidDocumentInput {
  did: string;
  keyId: string;
  publicJwk: Ed25519PublicJwk;
}

export interface Ed25519Signature2020Proof extends JsonObject {
  type: 'Ed25519Signature2020';
  created: string;
  proofPurpose: 'assertionMethod';
  verificationMethod: string;
  proofValue: string;
}

interface SigningProofOptions extends JsonObject {
  type: 'Ed25519Signature2020';
  created: string;
  proofPurpose: 'assertionMethod';
  verificationMethod: string;
}

export type SignedCredential = JsonObject & {
  proof: Ed25519Signature2020Proof;
};

export interface SignCredentialInput {
  credential: JsonObject;
  privateJwk: Ed25519PrivateJwk;
  verificationMethod: string;
  createdAt?: string;
}

export interface VerifyCredentialInput {
  credential: SignedCredential;
  publicJwk: Ed25519PublicJwk;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export const createTenantScopedId = (tenantId: string): string => {
  return `${tenantId}:${crypto.randomUUID()}`;
};

export const splitTenantScopedId = (value: string): TenantScopedResourceId => {
  const [tenantId, resourceId] = value.split(':', 2);

  if (tenantId === undefined || resourceId === undefined) {
    throw new Error('Invalid tenant-scoped resource identifier');
  }

  return {
    tenantId,
    resourceId,
  };
};

const ensureDidWeb = (did: string): void => {
  if (!did.startsWith('did:web:')) {
    throw new Error('Expected a did:web identifier');
  }
};

const toBase64Url = (bytes: Uint8Array): string => {
  let raw = '';

  for (const byte of bytes) {
    raw += String.fromCharCode(byte);
  }

  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = `${base64}${'='.repeat(padLength)}`;
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
};

const base58Encode = (bytes: Uint8Array): string => {
  if (bytes.length === 0) {
    return '';
  }

  const digits: number[] = [0];

  for (const byte of bytes) {
    let carry = byte;

    for (let index = 0; index < digits.length; index += 1) {
      const next = (digits[index] ?? 0) * 256 + carry;
      digits[index] = next % 58;
      carry = Math.floor(next / 58);
    }

    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let encoded = '';

  for (let index = 0; index < bytes.length && bytes[index] === 0; index += 1) {
    encoded += BASE58_ALPHABET[0] ?? '';
  }

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    encoded += BASE58_ALPHABET[digits[index] ?? 0] ?? '';
  }

  return encoded;
};

const base58Decode = (value: string): Uint8Array => {
  if (value.length === 0) {
    return new Uint8Array(0);
  }

  const bytes: number[] = [0];

  for (const char of value) {
    const alphabetIndex = BASE58_ALPHABET.indexOf(char);

    if (alphabetIndex < 0) {
      throw new Error('Invalid base58 character in proof value');
    }

    let carry = alphabetIndex;

    for (let index = 0; index < bytes.length; index += 1) {
      const next = (bytes[index] ?? 0) * 58 + carry;
      bytes[index] = next & 0xff;
      carry = next >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let zeroPrefix = 0;

  for (const char of value) {
    if (char === BASE58_ALPHABET[0]) {
      zeroPrefix += 1;
      continue;
    }
    break;
  }

  const decoded = new Uint8Array(zeroPrefix + bytes.length);

  for (let index = 0; index < zeroPrefix; index += 1) {
    decoded[index] = 0;
  }

  for (let index = 0; index < bytes.length; index += 1) {
    decoded[decoded.length - 1 - index] = bytes[index] ?? 0;
  }

  return decoded;
};

const canonicalizeJson = (value: JsonValue): string => {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Credential payload contains a non-finite number');
    }

    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const serializedItems = value.map((item) => canonicalizeJson(item));
    return `[${serializedItems.join(',')}]`;
  }

  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const serializedPairs = keys.map((key) => {
    const entryValue = value[key];

    if (entryValue === undefined) {
      throw new Error('Credential payload contains an undefined object field');
    }

    return `${JSON.stringify(key)}:${canonicalizeJson(entryValue)}`;
  });

  return `{${serializedPairs.join(',')}}`;
};

const importEd25519PrivateKey = async (privateJwk: Ed25519PrivateJwk): Promise<CryptoKey> => {
  return crypto.subtle.importKey('jwk', privateJwk, { name: 'Ed25519' }, false, ['sign']);
};

const importEd25519PublicKey = async (publicJwk: Ed25519PublicJwk): Promise<CryptoKey> => {
  return crypto.subtle.importKey('jwk', publicJwk, { name: 'Ed25519' }, false, ['verify']);
};

const normalizePublicJwk = (jwk: JsonWebKey, keyId: string): Ed25519PublicJwk => {
  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string' || jwk.x.length === 0) {
    throw new Error('Generated public key is not an Ed25519 JWK');
  }

  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: jwk.x,
    kid: keyId,
  };
};

const normalizePrivateJwk = (jwk: JsonWebKey, keyId: string): Ed25519PrivateJwk => {
  if (
    jwk.kty !== 'OKP' ||
    jwk.crv !== 'Ed25519' ||
    typeof jwk.x !== 'string' ||
    jwk.x.length === 0 ||
    typeof jwk.d !== 'string' ||
    jwk.d.length === 0
  ) {
    throw new Error('Generated private key is not an Ed25519 JWK');
  }

  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: jwk.x,
    d: jwk.d,
    kid: keyId,
  };
};

const unsignedCredential = (credential: JsonObject): JsonObject => {
  const nextCredential: JsonObject = {};

  for (const [key, value] of Object.entries(credential)) {
    if (key === 'proof') {
      continue;
    }

    nextCredential[key] = value;
  }

  return nextCredential;
};

const proofEnvelope = (
  created: string,
  verificationMethod: string,
): SigningProofOptions => {
  return {
    type: 'Ed25519Signature2020',
    created,
    proofPurpose: 'assertionMethod',
    verificationMethod,
  };
};

const signingPayload = (
  credential: JsonObject,
  proof: SigningProofOptions,
): Uint8Array => {
  const canonicalCredential = canonicalizeJson(unsignedCredential(credential));
  const canonicalProof = canonicalizeJson(proof);
  return new TextEncoder().encode(`${canonicalCredential}.${canonicalProof}`);
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

export const createDidWeb = (input: CreateDidWebInput): string => {
  const trimmedHost = input.host.trim().toLowerCase();

  if (trimmedHost.length === 0) {
    throw new Error('host is required to build did:web');
  }

  const encodedHost = trimmedHost.replace(/:/g, '%3A');
  const pathSegments = input.pathSegments ?? [];
  const encodedSegments = pathSegments.map((segment) => {
    const trimmedSegment = segment.trim();

    if (trimmedSegment.length === 0) {
      throw new Error('did:web path segments must not be empty');
    }

    return encodeURIComponent(trimmedSegment);
  });

  if (encodedSegments.length === 0) {
    return `did:web:${encodedHost}`;
  }

  return `did:web:${encodedHost}:${encodedSegments.join(':')}`;
};

export const didWebDocumentPath = (did: string): string => {
  ensureDidWeb(did);
  const [, , didSuffix] = did.split(':', 3);

  if (didSuffix === undefined || didSuffix.length === 0) {
    throw new Error('Invalid did:web identifier');
  }

  const didParts = did.substring('did:web:'.length).split(':');

  if (didParts.length <= 1) {
    return '/.well-known/did.json';
  }

  const pathSegments = didParts.slice(1).map((segment) => decodeURIComponent(segment));
  return `/${pathSegments.join('/')}/did.json`;
};

export const createDidDocument = (input: CreateDidDocumentInput): DidDocument => {
  ensureDidWeb(input.did);
  const verificationMethodId = `${input.did}#${input.keyId}`;

  return {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: input.did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: 'JsonWebKey2020',
        controller: input.did,
        publicKeyJwk: input.publicJwk,
      },
    ],
    assertionMethod: [verificationMethodId],
  };
};

export const generateTenantDidSigningMaterial = async (
  input: GenerateTenantDidSigningMaterialInput,
): Promise<TenantDidSigningMaterial> => {
  ensureDidWeb(input.did);
  const keyId = input.keyId ?? 'key-1';
  const generated = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const exportedPublicKey = await crypto.subtle.exportKey('jwk', generated.publicKey);
  const exportedPrivateKey = await crypto.subtle.exportKey('jwk', generated.privateKey);
  const publicJwk = normalizePublicJwk(exportedPublicKey, keyId);
  const privateJwk = normalizePrivateJwk(exportedPrivateKey, keyId);

  return {
    did: input.did,
    keyId,
    publicJwk,
    privateJwk,
  };
};

export const signCredentialWithEd25519Signature2020 = async (
  input: SignCredentialInput,
): Promise<SignedCredential> => {
  const created = input.createdAt ?? new Date().toISOString();
  const proof = proofEnvelope(created, input.verificationMethod);
  const privateKey = await importEd25519PrivateKey(input.privateJwk);
  const payload = signingPayload(input.credential, proof);
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    toArrayBuffer(payload),
  );
  const signature = new Uint8Array(signatureBuffer);

  return {
    ...unsignedCredential(input.credential),
    proof: {
      type: proof.type,
      created: proof.created,
      proofPurpose: proof.proofPurpose,
      verificationMethod: proof.verificationMethod,
      proofValue: `z${base58Encode(signature)}`,
    },
  };
};

export const verifyCredentialProofWithEd25519Signature2020 = async (
  input: VerifyCredentialInput,
): Promise<boolean> => {
  const proof = input.credential.proof;

  if (!proof.proofValue.startsWith('z')) {
    return false;
  }

  const publicKey = await importEd25519PublicKey(input.publicJwk);
  const payload = signingPayload(input.credential, {
    type: proof.type,
    created: proof.created,
    proofPurpose: proof.proofPurpose,
    verificationMethod: proof.verificationMethod,
  });
  const signature = base58Decode(proof.proofValue.slice(1));

  return crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    toArrayBuffer(signature),
    toArrayBuffer(payload),
  );
};

export const encodeJwkPublicKeyMultibase = (publicJwk: Ed25519PublicJwk): string => {
  const publicKeyBytes = fromBase64Url(publicJwk.x);
  return `z${base58Encode(publicKeyBytes)}`;
};

export const decodeJwkPublicKeyMultibase = (multibaseValue: string): string => {
  if (!multibaseValue.startsWith('z')) {
    throw new Error('Expected a base58btc multibase value');
  }

  const bytes = base58Decode(multibaseValue.slice(1));
  return toBase64Url(bytes);
};

export {
  getImmutableCredentialObject,
  immutableCredentialObjectKey,
  storeImmutableCredentialObject,
  type ImmutableCredentialObjectIds,
  type ImmutableCredentialStore,
  type StoreImmutableCredentialInput,
  type StoredImmutableCredentialObject,
} from './r2';

export {
  captureSentryException,
  logError,
  logInfo,
  logWarn,
  type CaptureSentryExceptionInput,
  type ObservabilityContext,
  type ObservabilityFields,
  type ObservabilityLevel,
} from './observability';
