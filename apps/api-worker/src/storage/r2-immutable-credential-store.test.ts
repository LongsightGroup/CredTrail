import { beforeEach, describe, expect, it } from 'vitest';
import { runImmutableCredentialStoreContract } from './immutable-credential-store-contract';
import { createR2ImmutableCredentialStore } from './r2-immutable-credential-store';

interface StoredR2Object {
  key: string;
  body: string;
  etag: string;
  version: string;
  size: number;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

const normalizeHttpMetadata = (
  input: Headers | R2HTTPMetadata | undefined,
): R2HTTPMetadata | undefined => {
  if (input === undefined) {
    return undefined;
  }

  if (input instanceof Headers) {
    const contentType = input.get('content-type');
    const cacheControl = input.get('cache-control');
    const contentDisposition = input.get('content-disposition');
    const contentEncoding = input.get('content-encoding');
    const contentLanguage = input.get('content-language');
    const normalized: R2HTTPMetadata = {
      ...(contentType === null ? {} : { contentType }),
      ...(cacheControl === null ? {} : { cacheControl }),
      ...(contentDisposition === null ? {} : { contentDisposition }),
      ...(contentEncoding === null ? {} : { contentEncoding }),
      ...(contentLanguage === null ? {} : { contentLanguage }),
    };

    if (Object.keys(normalized).length === 0) {
      return undefined;
    }

    return normalized;
  }

  return input;
};

const createInMemoryR2Bucket = (): R2Bucket & {
  objects: Map<string, StoredR2Object>;
} => {
  const objects = new Map<string, StoredR2Object>();
  let sequence = 0;

  return {
    objects,
    head: (key: string): Promise<R2Object | null> => {
      const found = objects.get(key);

      if (found === undefined) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        key: found.key,
        etag: found.etag,
        version: found.version,
        size: found.size,
        uploaded: found.uploaded,
        storageClass: 'Standard',
        checksums: {},
        httpEtag: found.etag,
        customMetadata: found.customMetadata,
        httpMetadata: found.httpMetadata,
        range: undefined,
        writeHttpMetadata: () => undefined,
      } as unknown as R2Object);
    },
    get: (key: string): Promise<R2ObjectBody | null> => {
      const found = objects.get(key);

      if (found === undefined) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        key: found.key,
        etag: found.etag,
        version: found.version,
        size: found.size,
        uploaded: found.uploaded,
        storageClass: 'Standard',
        checksums: {},
        httpEtag: found.etag,
        customMetadata: found.customMetadata,
        httpMetadata: found.httpMetadata,
        range: undefined,
        body: new ReadableStream<Uint8Array>(),
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode(found.body).buffer),
        bytes: () => Promise.resolve(new TextEncoder().encode(found.body)),
        text: () => Promise.resolve(found.body),
        json: () => Promise.resolve(JSON.parse(found.body) as unknown),
        blob: () => Promise.resolve(new Blob([found.body])),
        writeHttpMetadata: () => undefined,
      } as unknown as R2ObjectBody);
    },
    put: (
      key: string,
      value: string | ReadableStream | ArrayBuffer | ArrayBufferView | Blob | null,
      options?: R2PutOptions,
    ): Promise<R2Object | null> => {
      if (value === null || typeof value !== 'string') {
        throw new Error('In-memory R2 test bucket expects string puts');
      }

      if (options?.onlyIf !== undefined && objects.has(key)) {
        return Promise.resolve(null);
      }

      sequence += 1;
      const nextSequence = String(sequence);
      const normalizedHttpMetadata = normalizeHttpMetadata(options?.httpMetadata);
      const stored: StoredR2Object = {
        key,
        body: value,
        etag: `etag-${nextSequence}`,
        version: `version-${nextSequence}`,
        size: value.length,
        uploaded: new Date('2026-02-16T00:00:00.000Z'),
        ...(normalizedHttpMetadata === undefined
          ? {}
          : {
              httpMetadata: normalizedHttpMetadata,
            }),
        ...(options?.customMetadata === undefined
          ? {}
          : {
              customMetadata: options.customMetadata,
            }),
      };
      objects.set(key, stored);

      return Promise.resolve({
        key: stored.key,
        etag: stored.etag,
        version: stored.version,
        size: stored.size,
        uploaded: stored.uploaded,
        storageClass: 'Standard',
        checksums: {},
        httpEtag: stored.etag,
        customMetadata: stored.customMetadata,
        httpMetadata: stored.httpMetadata,
        range: undefined,
        writeHttpMetadata: () => undefined,
      } as unknown as R2Object);
    },
    delete: (_keys: string | string[]): Promise<void> => Promise.resolve(),
    list: (_options?: R2ListOptions): Promise<R2Objects> =>
      Promise.resolve({
        objects: [],
        truncated: false,
        delimitedPrefixes: [],
      } as R2Objects),
    createMultipartUpload: (
      _key: string,
      _options?: R2MultipartOptions,
    ): Promise<R2MultipartUpload> => {
      throw new Error('createMultipartUpload is not implemented in test bucket');
    },
    resumeMultipartUpload: (_key: string, _uploadId: string): R2MultipartUpload => {
      throw new Error('resumeMultipartUpload is not implemented in test bucket');
    },
  } as R2Bucket & {
    objects: Map<string, StoredR2Object>;
  };
};

describe('createR2ImmutableCredentialStore', () => {
  let bucket: R2Bucket & {
    objects: Map<string, StoredR2Object>;
  };

  beforeEach(() => {
    bucket = createInMemoryR2Bucket();
  });

  describe('contract', () => {
    runImmutableCredentialStoreContract({
      createStore: () => createR2ImmutableCredentialStore(bucket),
    });
  });

  it('forwards metadata fields during put', async () => {
    const store = createR2ImmutableCredentialStore(bucket);
    await store.put('tenants/a/assertions/1.jsonld', '{"hello":"world"}', {
      httpMetadata: {
        contentType: 'application/ld+json',
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        tenantId: 'tenant-a',
      },
    });

    expect(bucket.objects.get('tenants/a/assertions/1.jsonld')).toMatchObject({
      httpMetadata: {
        contentType: 'application/ld+json',
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        tenantId: 'tenant-a',
      },
    });
  });
});
