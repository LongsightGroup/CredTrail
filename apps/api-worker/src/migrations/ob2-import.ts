import type { JsonObject } from '@credtrail/core-domain';
import type { RecipientIdentityType } from '@credtrail/validation';
import { asJsonObject, asNonEmptyString } from '../utils/value-parsers';

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const OPEN_BADGE_KEYWORDS = new Set(['openbadges', 'openbadge']);

type PngTextChunkType = 'tEXt' | 'zTXt' | 'iTXt';

type ExtractedPayloadType = 'json' | 'url' | 'text';

interface ParsedTextChunk {
  chunkType: PngTextChunkType;
  keyword: string;
  text: string;
}

export interface ExtractedOpenBadgesPayload {
  chunkType: PngTextChunkType;
  keyword: string;
  payloadType: ExtractedPayloadType;
  payloadText: string;
  payloadJson?: JsonObject;
  assertionUrl?: string;
}

export interface Ob2ImportConversionResult {
  createBadgeTemplateRequest: {
    slug: string;
    title: string;
    description?: string;
    criteriaUri?: string;
    imageUri?: string;
  };
  manualIssueRequest: {
    recipientIdentity: string;
    recipientIdentityType: RecipientIdentityType;
  };
  issueOptions: {
    recipientDisplayName?: string;
    issuerName?: string;
    issuerUrl?: string;
  };
  sourceMetadata: {
    assertionId?: string;
    badgeClassId?: string;
    issuerId?: string;
    issuedOn: string;
    evidenceUrls: string[];
    narrative?: string;
    recipientType?: string;
    recipientHashed: boolean;
    recipientSalt?: string;
  };
  warnings: string[];
}

export interface PrepareOb2ImportConversionInput {
  ob2Assertion?: JsonObject | undefined;
  ob2BadgeClass?: JsonObject | undefined;
  ob2Issuer?: JsonObject | undefined;
  bakedBadgeImage?: string | undefined;
}

export interface PrepareOb2ImportConversionResult {
  extractedFromBakedBadge?: ExtractedOpenBadgesPayload;
  conversion: Ob2ImportConversionResult | null;
  warnings: string[];
}

export class Ob2ImportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'Ob2ImportError';
  }
}

const textDecoder = new TextDecoder();

const indexOfNullByte = (bytes: Uint8Array, startIndex: number): number => {
  for (let index = startIndex; index < bytes.length; index += 1) {
    if (bytes[index] === 0) {
      return index;
    }
  }

  return -1;
};

const readUint32BigEndian = (bytes: Uint8Array, offset: number): number => {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  );
};

const decodeAscii = (bytes: Uint8Array): string => {
  let output = '';

  for (const byte of bytes) {
    output += String.fromCharCode(byte);
  }

  return output;
};

const decodeUtf8 = (bytes: Uint8Array): string => {
  return textDecoder.decode(bytes);
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const parseJsonObjectText = (value: string): JsonObject | null => {
  try {
    return asJsonObject(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
};

const decodeBase64ToBytes = (value: string): Uint8Array => {
  let normalized = value.trim();

  if (normalized.startsWith('data:')) {
    const commaIndex = normalized.indexOf(',');

    if (commaIndex < 0) {
      throw new Ob2ImportError('Invalid bakedBadgeImage data URI: missing comma separator');
    }

    const metadata = normalized.slice(0, commaIndex).toLowerCase();

    if (!metadata.includes(';base64')) {
      throw new Ob2ImportError('Invalid bakedBadgeImage data URI: expected base64 encoding');
    }

    normalized = normalized.slice(commaIndex + 1);
  }

  if (normalized.length === 0) {
    throw new Ob2ImportError('Invalid bakedBadgeImage: empty base64 content');
  }

  let decoded: string;

  try {
    decoded = atob(normalized);
  } catch {
    throw new Ob2ImportError('Invalid bakedBadgeImage: unable to decode base64 content');
  }

  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
};

const inflateZlibBytes = async (input: Uint8Array): Promise<Uint8Array> => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Ob2ImportError('zTXt/iTXt decompression is unavailable in this runtime');
  }

  const stream = new DecompressionStream('deflate');
  const writer = stream.writable.getWriter();
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  await writer.write(copy);
  await writer.close();
  const decompressed = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(decompressed);
};

const parseTextChunk = (data: Uint8Array): ParsedTextChunk | null => {
  const keywordEnd = indexOfNullByte(data, 0);

  if (keywordEnd <= 0) {
    return null;
  }

  const keywordRaw = decodeUtf8(data.subarray(0, keywordEnd)).trim();

  if (keywordRaw.length === 0) {
    return null;
  }

  return {
    chunkType: 'tEXt',
    keyword: keywordRaw,
    text: decodeUtf8(data.subarray(keywordEnd + 1)),
  };
};

const parseZtxtChunk = async (data: Uint8Array): Promise<ParsedTextChunk | null> => {
  const keywordEnd = indexOfNullByte(data, 0);

  if (keywordEnd <= 0 || keywordEnd + 2 > data.length) {
    return null;
  }

  const keywordRaw = decodeUtf8(data.subarray(0, keywordEnd)).trim();

  if (keywordRaw.length === 0) {
    return null;
  }

  const compressionMethod = data[keywordEnd + 1];

  if (compressionMethod !== 0) {
    throw new Ob2ImportError(`Unsupported zTXt compression method: ${String(compressionMethod)}`);
  }

  const compressedText = data.subarray(keywordEnd + 2);
  const inflated = await inflateZlibBytes(compressedText);

  return {
    chunkType: 'zTXt',
    keyword: keywordRaw,
    text: decodeUtf8(inflated),
  };
};

const parseItxtChunk = async (data: Uint8Array): Promise<ParsedTextChunk | null> => {
  const keywordEnd = indexOfNullByte(data, 0);

  if (keywordEnd <= 0 || keywordEnd + 3 > data.length) {
    return null;
  }

  const keywordRaw = decodeUtf8(data.subarray(0, keywordEnd)).trim();

  if (keywordRaw.length === 0) {
    return null;
  }

  const compressionFlag = data[keywordEnd + 1];
  const compressionMethod = data[keywordEnd + 2];

  let cursor = keywordEnd + 3;
  const languageEnd = indexOfNullByte(data, cursor);

  if (languageEnd < 0) {
    return null;
  }

  cursor = languageEnd + 1;
  const translatedKeywordEnd = indexOfNullByte(data, cursor);

  if (translatedKeywordEnd < 0) {
    return null;
  }

  cursor = translatedKeywordEnd + 1;
  const textBytes = data.subarray(cursor);

  if (compressionFlag === 1) {
    if (compressionMethod !== 0) {
      throw new Ob2ImportError(
        `Unsupported iTXt compression method: ${String(compressionMethod)}`,
      );
    }

    const inflated = await inflateZlibBytes(textBytes);
    return {
      chunkType: 'iTXt',
      keyword: keywordRaw,
      text: decodeUtf8(inflated),
    };
  }

  return {
    chunkType: 'iTXt',
    keyword: keywordRaw,
    text: decodeUtf8(textBytes),
  };
};

const parsePngTextChunk = async (
  chunkType: string,
  chunkData: Uint8Array,
): Promise<ParsedTextChunk | null> => {
  if (chunkType === 'tEXt') {
    return parseTextChunk(chunkData);
  }

  if (chunkType === 'zTXt') {
    return parseZtxtChunk(chunkData);
  }

  if (chunkType === 'iTXt') {
    return parseItxtChunk(chunkData);
  }

  return null;
};

const extractOb2EntitiesFromExtractedJson = (payloadJson: JsonObject): {
  ob2Assertion?: JsonObject | undefined;
  ob2BadgeClass?: JsonObject | undefined;
  ob2Issuer?: JsonObject | undefined;
} => {
  const assertionFromRootType =
    asNonEmptyString(payloadJson.type)?.toLowerCase() === 'assertion' ? payloadJson : undefined;
  const assertionFromWrapper = asJsonObject(payloadJson.assertion) ?? undefined;
  const badgeClassFromWrapper =
    asJsonObject(payloadJson.badgeClass) ?? asJsonObject(payloadJson.badge) ?? undefined;
  const issuerFromWrapper = asJsonObject(payloadJson.issuer) ?? undefined;
  const result: {
    ob2Assertion?: JsonObject | undefined;
    ob2BadgeClass?: JsonObject | undefined;
    ob2Issuer?: JsonObject | undefined;
  } = {};
  const assertion = assertionFromRootType ?? assertionFromWrapper;

  if (assertion !== undefined) {
    result.ob2Assertion = assertion;
  }

  if (badgeClassFromWrapper !== undefined) {
    result.ob2BadgeClass = badgeClassFromWrapper;
  }

  if (issuerFromWrapper !== undefined) {
    result.ob2Issuer = issuerFromWrapper;
  }

  return result;
};

const resourceUriFromUnknown = (value: unknown): string | undefined => {
  const direct = asNonEmptyString(value);

  if (direct !== null) {
    return direct;
  }

  const objectValue = asJsonObject(value);

  if (objectValue === null) {
    return undefined;
  }

  return asNonEmptyString(objectValue.id) ?? undefined;
};

const normalizeIssuedOn = (value: unknown, warnings: string[]): string => {
  const issuedOn = asNonEmptyString(value);

  if (issuedOn === null) {
    warnings.push('OB2 assertion is missing issuedOn; using current timestamp');
    return new Date().toISOString();
  }

  const timestamp = Date.parse(issuedOn);

  if (!Number.isFinite(timestamp)) {
    warnings.push(`OB2 assertion issuedOn is invalid ("${issuedOn}"); using current timestamp`);
    return new Date().toISOString();
  }

  return new Date(timestamp).toISOString();
};

const extractEvidenceUrls = (evidence: unknown): string[] => {
  const urls = new Set<string>();

  const appendEvidence = (value: unknown): void => {
    const direct = asNonEmptyString(value);

    if (direct !== null && isHttpUrl(direct)) {
      urls.add(direct);
      return;
    }

    const objectValue = asJsonObject(value);

    if (objectValue === null) {
      return;
    }

    const objectId = asNonEmptyString(objectValue.id);

    if (objectId !== null && isHttpUrl(objectId)) {
      urls.add(objectId);
    }
  };

  if (Array.isArray(evidence)) {
    for (const entry of evidence) {
      appendEvidence(entry);
    }
  } else {
    appendEvidence(evidence);
  }

  return [...urls];
};

const slugify = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);

  if (normalized.length >= 2) {
    return normalized;
  }

  return 'imported-badge';
};

const normalizedRecipientIdentity = (
  identityRaw: string,
  recipientType: string | undefined,
  hashed: boolean,
  warnings: string[],
): string => {
  let identity = identityRaw.trim();

  if (recipientType === 'email' && identity.toLowerCase().startsWith('mailto:')) {
    identity = identity.slice('mailto:'.length);
  }

  if (hashed) {
    const separatorIndex = identity.indexOf('$');

    if (separatorIndex > 0) {
      const algorithm = identity.slice(0, separatorIndex).toLowerCase();
      const hashValue = identity.slice(separatorIndex + 1);

      if (algorithm === 'sha256' && hashValue.length > 0) {
        identity = hashValue;
      } else {
        warnings.push(
          `Recipient hash algorithm "${algorithm}" is not explicitly supported; keeping raw identity`,
        );
      }
    }
  }

  return identity;
};

const recipientIdentityTypeForRecipient = (
  recipientType: string | undefined,
  identity: string,
  hashed: boolean,
  warnings: string[],
): RecipientIdentityType => {
  if (hashed) {
    if (recipientType !== undefined && recipientType.toLowerCase() !== 'email') {
      warnings.push('Hashed OB2 recipient type is non-email; mapping to email_sha256 for import');
    }

    return 'email_sha256';
  }

  const normalizedType = recipientType?.toLowerCase();

  if (normalizedType === 'email') {
    return 'email';
  }

  if (normalizedType === 'url') {
    return identity.startsWith('did:') ? 'did' : 'url';
  }

  if (identity.startsWith('did:')) {
    return 'did';
  }

  if (identity.includes('@')) {
    warnings.push('Recipient type missing/unknown; inferred email identity type from address format');
    return 'email';
  }

  warnings.push('Recipient type missing/unknown; defaulting to url identity type');
  return 'url';
};

const resolveBadgeClassObject = (
  ob2Assertion: JsonObject,
  ob2BadgeClass: JsonObject | undefined,
): JsonObject => {
  const assertionBadge = ob2Assertion.badge;
  const badgeObject = asJsonObject(assertionBadge);

  if (badgeObject !== null) {
    return badgeObject;
  }

  const badgeReference = asNonEmptyString(assertionBadge);

  if (badgeReference === null) {
    throw new Ob2ImportError('OB2 assertion is missing badge reference');
  }

  if (ob2BadgeClass === undefined) {
    throw new Ob2ImportError(
      'OB2 assertion badge is a reference URL; include ob2BadgeClass JSON to resolve it',
    );
  }

  const providedBadgeClassId = asNonEmptyString(ob2BadgeClass.id);

  if (providedBadgeClassId !== null && providedBadgeClassId !== badgeReference) {
    throw new Ob2ImportError(
      `Provided ob2BadgeClass.id does not match assertion badge reference (${badgeReference})`,
    );
  }

  return ob2BadgeClass;
};

const resolveIssuerObject = (
  badgeClass: JsonObject,
  ob2Issuer: JsonObject | undefined,
  warnings: string[],
): JsonObject | undefined => {
  const badgeIssuer = badgeClass.issuer;
  const inlineIssuer = asJsonObject(badgeIssuer);

  if (inlineIssuer !== null) {
    return inlineIssuer;
  }

  const issuerReference = asNonEmptyString(badgeIssuer);

  if (issuerReference === null) {
    if (ob2Issuer !== undefined) {
      return ob2Issuer;
    }

    warnings.push('OB2 badgeClass is missing issuer metadata');
    return undefined;
  }

  if (ob2Issuer === undefined) {
    warnings.push(`OB2 issuer reference (${issuerReference}) was not resolved with ob2Issuer payload`);
    return undefined;
  }

  const providedIssuerId = asNonEmptyString(ob2Issuer.id);

  if (providedIssuerId !== null && providedIssuerId !== issuerReference) {
    warnings.push(
      `Provided ob2Issuer.id (${providedIssuerId}) does not match issuer reference (${issuerReference})`,
    );
  }

  return ob2Issuer;
};

export const convertOb2AssertionToImportCandidate = (input: {
  ob2Assertion: JsonObject;
  ob2BadgeClass?: JsonObject;
  ob2Issuer?: JsonObject;
}): Ob2ImportConversionResult => {
  const warnings: string[] = [];
  const recipientObject = asJsonObject(input.ob2Assertion.recipient);

  if (recipientObject === null) {
    throw new Ob2ImportError('OB2 assertion recipient is missing or invalid');
  }

  const recipientIdentityRaw = asNonEmptyString(recipientObject.identity);

  if (recipientIdentityRaw === null) {
    throw new Ob2ImportError('OB2 assertion recipient.identity is required');
  }

  const recipientType = asNonEmptyString(recipientObject.type) ?? undefined;
  const recipientHashed = recipientObject.hashed === true;
  const recipientSalt = asNonEmptyString(recipientObject.salt) ?? undefined;
  const recipientIdentity = normalizedRecipientIdentity(
    recipientIdentityRaw,
    recipientType,
    recipientHashed,
    warnings,
  );
  const recipientIdentityType = recipientIdentityTypeForRecipient(
    recipientType,
    recipientIdentity,
    recipientHashed,
    warnings,
  );

  const badgeClass = resolveBadgeClassObject(input.ob2Assertion, input.ob2BadgeClass);
  const badgeTitle = asNonEmptyString(badgeClass.name);

  if (badgeTitle === null) {
    throw new Ob2ImportError('OB2 badgeClass.name is required to build an OB3 badge template');
  }

  const assertionId = asNonEmptyString(input.ob2Assertion.id) ?? undefined;
  const badgeClassId = asNonEmptyString(badgeClass.id) ?? undefined;
  const badgeDescription = asNonEmptyString(badgeClass.description) ?? undefined;
  const criteriaUriCandidate = resourceUriFromUnknown(badgeClass.criteria);
  const imageUriCandidate = resourceUriFromUnknown(badgeClass.image);
  const issuerObject = resolveIssuerObject(badgeClass, input.ob2Issuer, warnings);
  const issuerId = issuerObject === undefined ? undefined : asNonEmptyString(issuerObject.id) ?? undefined;
  const issuerName = issuerObject === undefined ? undefined : asNonEmptyString(issuerObject.name) ?? undefined;
  const issuerUrlCandidate =
    issuerObject === undefined
      ? undefined
      : asNonEmptyString(issuerObject.url) ?? asNonEmptyString(issuerObject.id) ?? undefined;
  const issuerUrl =
    issuerUrlCandidate === undefined
      ? undefined
      : isHttpUrl(issuerUrlCandidate)
        ? issuerUrlCandidate
        : undefined;

  if (issuerUrlCandidate !== undefined && issuerUrl === undefined) {
    warnings.push('OB2 issuer URL is not an HTTP/HTTPS URL and was omitted from issue options');
  }

  if (criteriaUriCandidate !== undefined && !isHttpUrl(criteriaUriCandidate)) {
    warnings.push('OB2 badge criteria URI is not an HTTP/HTTPS URL and was omitted');
  }

  if (imageUriCandidate !== undefined && !isHttpUrl(imageUriCandidate)) {
    warnings.push('OB2 badge image URI is not an HTTP/HTTPS URL and was omitted');
  }

  const issuedOn = normalizeIssuedOn(input.ob2Assertion.issuedOn, warnings);
  const evidenceUrls = extractEvidenceUrls(input.ob2Assertion.evidence);
  const narrative = asNonEmptyString(input.ob2Assertion.narrative) ?? undefined;
  const recipientDisplayName = asNonEmptyString(recipientObject.name) ?? undefined;

  return {
    createBadgeTemplateRequest: {
      slug: slugify(badgeTitle),
      title: badgeTitle,
      ...(badgeDescription === undefined ? {} : { description: badgeDescription }),
      ...(criteriaUriCandidate === undefined || !isHttpUrl(criteriaUriCandidate)
        ? {}
        : { criteriaUri: criteriaUriCandidate }),
      ...(imageUriCandidate === undefined || !isHttpUrl(imageUriCandidate)
        ? {}
        : { imageUri: imageUriCandidate }),
    },
    manualIssueRequest: {
      recipientIdentity,
      recipientIdentityType,
    },
    issueOptions: {
      ...(recipientDisplayName === undefined ? {} : { recipientDisplayName }),
      ...(issuerName === undefined ? {} : { issuerName }),
      ...(issuerUrl === undefined ? {} : { issuerUrl }),
    },
    sourceMetadata: {
      ...(assertionId === undefined ? {} : { assertionId }),
      ...(badgeClassId === undefined ? {} : { badgeClassId }),
      ...(issuerId === undefined ? {} : { issuerId }),
      issuedOn,
      evidenceUrls,
      ...(narrative === undefined ? {} : { narrative }),
      ...(recipientType === undefined ? {} : { recipientType }),
      recipientHashed,
      ...(recipientSalt === undefined ? {} : { recipientSalt }),
    },
    warnings,
  };
};

export const extractOpenBadgesPayloadFromPng = async (
  pngBytes: Uint8Array,
): Promise<ExtractedOpenBadgesPayload> => {
  if (pngBytes.length < PNG_SIGNATURE.length) {
    throw new Ob2ImportError('Invalid PNG: file is too short');
  }

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (pngBytes[index] !== PNG_SIGNATURE[index]) {
      throw new Ob2ImportError('Invalid PNG signature for baked badge input');
    }
  }

  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= pngBytes.length) {
    const chunkLength = readUint32BigEndian(pngBytes, offset);
    const chunkType = decodeAscii(pngBytes.subarray(offset + 4, offset + 8));
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkLength;
    const chunkCrcEnd = chunkDataEnd + 4;

    if (chunkDataEnd > pngBytes.length || chunkCrcEnd > pngBytes.length) {
      throw new Ob2ImportError('Invalid PNG: chunk length exceeds image data size');
    }

    if (chunkType === 'tEXt' || chunkType === 'zTXt' || chunkType === 'iTXt') {
      const parsedTextChunk = await parsePngTextChunk(
        chunkType,
        pngBytes.subarray(chunkDataStart, chunkDataEnd),
      );

      if (parsedTextChunk !== null && OPEN_BADGE_KEYWORDS.has(parsedTextChunk.keyword.toLowerCase())) {
        const payloadText = parsedTextChunk.text.trim();

        if (payloadText.length === 0) {
          throw new Ob2ImportError('Baked badge Open Badges payload is empty');
        }

        const payloadJson = parseJsonObjectText(payloadText);

        if (payloadJson !== null) {
          return {
            chunkType: parsedTextChunk.chunkType,
            keyword: parsedTextChunk.keyword,
            payloadType: 'json',
            payloadText,
            payloadJson,
          };
        }

        if (isHttpUrl(payloadText)) {
          return {
            chunkType: parsedTextChunk.chunkType,
            keyword: parsedTextChunk.keyword,
            payloadType: 'url',
            payloadText,
            assertionUrl: payloadText,
          };
        }

        return {
          chunkType: parsedTextChunk.chunkType,
          keyword: parsedTextChunk.keyword,
          payloadType: 'text',
          payloadText,
        };
      }
    }

    offset = chunkCrcEnd;

    if (chunkType === 'IEND') {
      break;
    }
  }

  throw new Ob2ImportError('No Open Badges payload found in baked PNG image');
};

export const prepareOb2ImportConversion = async (
  input: PrepareOb2ImportConversionInput,
): Promise<PrepareOb2ImportConversionResult> => {
  const warnings: string[] = [];

  let ob2Assertion = input.ob2Assertion;
  let ob2BadgeClass = input.ob2BadgeClass;
  let ob2Issuer = input.ob2Issuer;
  let extractedFromBakedBadge: ExtractedOpenBadgesPayload | undefined;

  if (input.bakedBadgeImage !== undefined) {
    const pngBytes = decodeBase64ToBytes(input.bakedBadgeImage);
    extractedFromBakedBadge = await extractOpenBadgesPayloadFromPng(pngBytes);

    if (extractedFromBakedBadge.payloadType === 'json' && extractedFromBakedBadge.payloadJson !== undefined) {
      const extractedEntities = extractOb2EntitiesFromExtractedJson(extractedFromBakedBadge.payloadJson);

      ob2Assertion = ob2Assertion ?? extractedEntities.ob2Assertion;
      ob2BadgeClass = ob2BadgeClass ?? extractedEntities.ob2BadgeClass;
      ob2Issuer = ob2Issuer ?? extractedEntities.ob2Issuer;
    }
  }

  if (ob2Assertion === undefined) {
    if (extractedFromBakedBadge?.payloadType === 'url') {
      warnings.push(
        'Baked badge payload resolved to an assertion URL; include ob2Assertion JSON for conversion',
      );

      return {
        extractedFromBakedBadge,
        conversion: null,
        warnings,
      };
    }

    throw new Ob2ImportError('OB2 assertion JSON is required for conversion');
  }

  const conversion = convertOb2AssertionToImportCandidate({
    ob2Assertion,
    ...(ob2BadgeClass === undefined ? {} : { ob2BadgeClass }),
    ...(ob2Issuer === undefined ? {} : { ob2Issuer }),
  });

  return {
    ...(extractedFromBakedBadge === undefined ? {} : { extractedFromBakedBadge }),
    conversion,
    warnings: [...warnings, ...conversion.warnings],
  };
};
