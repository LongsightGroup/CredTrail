import { describe, expect, it } from 'vitest';
import type { JsonObject } from '@credtrail/core-domain';
import {
  convertOb2AssertionToImportCandidate,
  extractOpenBadgesPayloadFromPng,
  prepareOb2ImportConversion,
} from './ob2-import';

const textEncoder = new TextEncoder();

const WEB_SOURCED_OB2_ASSERTION_FIXTURE: JsonObject = {
  // Generalized from IMS Global Open Badges 2.0 assertion example:
  // https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Assertion
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Assertion',
  id: 'https://issuer.test/assertions/12345',
  recipient: {
    type: 'email',
    identity: 'sha256$8f9c6dcf5092f0a516f5d4b6ed5d8f65ff6d9e1f4472cb9c98adf0a4d30ad2d3',
    hashed: true,
    salt: 'import-salt-1',
  },
  badge: 'https://issuer.test/badges/24',
  verify: {
    type: 'hosted',
  },
  issuedOn: '2016-12-31T23:59:59Z',
  evidence: 'https://issuer.test/evidence/100',
};

const WEB_SOURCED_OB2_BADGE_CLASS_FIXTURE: JsonObject = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'BadgeClass',
  id: 'https://issuer.test/badges/24',
  name: '3-D Printmaster',
  description: 'For demonstrating 3D printer operation and slicer setup proficiency.',
  image: 'https://issuer.test/badges/24/image',
  criteria: 'https://issuer.test/badges/24/criteria',
  issuer: 'https://issuer.test/issuers/565049',
};

const WEB_SOURCED_OB2_ISSUER_FIXTURE: JsonObject = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Issuer',
  id: 'https://issuer.test/issuers/565049',
  name: 'Issuer Test Institution',
  url: 'https://issuer.test',
};

const uint32BigEndian = (value: number): Uint8Array => {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
};

const concatBytes = (...chunks: Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((sum, chunk) => {
    return sum + chunk.length;
  }, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
};

const pngChunk = (chunkType: string, chunkData: Uint8Array): Uint8Array => {
  return concatBytes(
    uint32BigEndian(chunkData.length),
    textEncoder.encode(chunkType),
    chunkData,
    // CRC is intentionally zeroed in tests because the parser does not validate CRC.
    new Uint8Array([0, 0, 0, 0]),
  );
};

const createBakedPngBase64 = (openBadgePayload: string): string => {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = new Uint8Array([
    0, 0, 0, 1, // width
    0, 0, 0, 1, // height
    8, // bit depth
    2, // color type (RGB)
    0, // compression
    0, // filter
    0, // interlace
  ]);
  const openBadgesTextChunk = pngChunk(
    'tEXt',
    textEncoder.encode(`openbadges\u0000${openBadgePayload}`),
  );

  const imageBytes = concatBytes(
    signature,
    pngChunk('IHDR', ihdrData),
    openBadgesTextChunk,
    pngChunk('IEND', new Uint8Array()),
  );

  let binary = '';

  for (const byte of imageBytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

describe('convertOb2AssertionToImportCandidate', () => {
  it('converts a generalized IMS OB2 assertion fixture into OB3 import candidates', () => {
    const result = convertOb2AssertionToImportCandidate({
      ob2Assertion: WEB_SOURCED_OB2_ASSERTION_FIXTURE,
      ob2BadgeClass: WEB_SOURCED_OB2_BADGE_CLASS_FIXTURE,
      ob2Issuer: WEB_SOURCED_OB2_ISSUER_FIXTURE,
    });

    expect(result.createBadgeTemplateRequest).toMatchObject({
      slug: '3-d-printmaster',
      title: '3-D Printmaster',
      criteriaUri: 'https://issuer.test/badges/24/criteria',
      imageUri: 'https://issuer.test/badges/24/image',
    });
    expect(result.manualIssueRequest).toMatchObject({
      recipientIdentity:
        '8f9c6dcf5092f0a516f5d4b6ed5d8f65ff6d9e1f4472cb9c98adf0a4d30ad2d3',
      recipientIdentityType: 'email_sha256',
    });
    expect(result.issueOptions).toMatchObject({
      issuerName: 'Issuer Test Institution',
      issuerUrl: 'https://issuer.test',
    });
    expect(result.sourceMetadata).toMatchObject({
      assertionId: 'https://issuer.test/assertions/12345',
      badgeClassId: 'https://issuer.test/badges/24',
      issuerId: 'https://issuer.test/issuers/565049',
      recipientHashed: true,
      recipientSalt: 'import-salt-1',
      issuedOn: '2016-12-31T23:59:59.000Z',
      evidenceUrls: ['https://issuer.test/evidence/100'],
    });
  });
});

describe('extractOpenBadgesPayloadFromPng', () => {
  it('extracts JSON payload from baked PNG openbadges tEXt chunk', async () => {
    const payloadText = JSON.stringify({
      ...WEB_SOURCED_OB2_ASSERTION_FIXTURE,
      badge: {
        ...WEB_SOURCED_OB2_BADGE_CLASS_FIXTURE,
        issuer: WEB_SOURCED_OB2_ISSUER_FIXTURE,
      },
    });
    const pngBase64 = createBakedPngBase64(payloadText);

    const prepared = await prepareOb2ImportConversion({
      bakedBadgeImage: pngBase64,
    });

    expect(prepared.extractedFromBakedBadge?.payloadType).toBe('json');
    expect(prepared.conversion?.createBadgeTemplateRequest.title).toBe('3-D Printmaster');
    expect(prepared.conversion?.manualIssueRequest.recipientIdentityType).toBe('email_sha256');
  });

  it('returns URL-only extraction when baked payload is an assertion URL', async () => {
    const assertionUrl = 'https://issuer.test/assertions/hosted/abc';
    const pngBase64 = createBakedPngBase64(assertionUrl);
    const extracted = await extractOpenBadgesPayloadFromPng(
      Uint8Array.from(atob(pngBase64), (character) => {
        return character.charCodeAt(0);
      }),
    );

    expect(extracted.payloadType).toBe('url');
    expect(extracted.assertionUrl).toBe(assertionUrl);

    const prepared = await prepareOb2ImportConversion({
      bakedBadgeImage: pngBase64,
    });

    expect(prepared.conversion).toBeNull();
    expect(prepared.warnings[0]).toContain('assertion URL');
  });
});
