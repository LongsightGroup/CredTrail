import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockCommand {
  input: Record<string, unknown>;
}
type SendHandler = (command: MockCommand) => Promise<unknown>;

const s3MockState = vi.hoisted(() => {
  return {
    sendHandler: (() => Promise.resolve({})) as SendHandler,
    sentCommands: [] as MockCommand[],
  };
});

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    public send(command: MockCommand): Promise<unknown> {
      s3MockState.sentCommands.push(command);
      return s3MockState.sendHandler(command);
    }
  }

  class HeadObjectCommand {
    public readonly input: Record<string, unknown>;

    public constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class GetObjectCommand {
    public readonly input: Record<string, unknown>;

    public constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class PutObjectCommand {
    public readonly input: Record<string, unknown>;

    public constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    S3Client,
    HeadObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
  };
});

import { createS3ImmutableCredentialStore } from './s3-immutable-credential-store';

describe('createS3ImmutableCredentialStore', () => {
  beforeEach(() => {
    s3MockState.sendHandler = () => Promise.resolve({});
    s3MockState.sentCommands.length = 0;
  });

  const createStore = (): ReturnType<typeof createS3ImmutableCredentialStore> => {
    return createS3ImmutableCredentialStore({
      bucket: 'credtrail-objects',
      region: 'us-east-1',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      endpoint: 'http://minio:9000',
      forcePathStyle: true,
    });
  };

  it('returns null when head receives a not-found error', async () => {
    s3MockState.sendHandler = () => {
      const error = new Error('Not found') as Error & {
        name: string;
        $metadata: { httpStatusCode: number };
      };
      error.name = 'NotFound';
      error.$metadata = { httpStatusCode: 404 };
      return Promise.reject(error);
    };

    const store = createStore();
    const result = await store.head('tenants/a/assertions/1.jsonld');

    expect(result).toBeNull();
  });

  it('reads object bodies from transformToString', async () => {
    s3MockState.sendHandler = () => {
      return Promise.resolve({
        Body: {
          transformToString: () => Promise.resolve('{"hello":"world"}'),
        },
      });
    };

    const store = createStore();
    const object = await store.get('tenants/a/assertions/1.jsonld');

    expect(object).not.toBeNull();
    await expect(object?.text()).resolves.toBe('{"hello":"world"}');
  });

  it('returns null when put sees a precondition failure', async () => {
    s3MockState.sendHandler = () => {
      const error = new Error('Precondition failed') as Error & {
        name: string;
        $metadata: { httpStatusCode: number };
      };
      error.name = 'PreconditionFailed';
      error.$metadata = { httpStatusCode: 412 };
      return Promise.reject(error);
    };

    const store = createStore();
    const result = await store.put('tenants/a/assertions/1.jsonld', '{"v":1}');

    expect(result).toBeNull();
  });

  it('sets immutable-write and metadata fields on put', async () => {
    s3MockState.sendHandler = () => {
      return Promise.resolve({
        ETag: '"etag-1"',
        VersionId: 'version-1',
      });
    };

    const store = createStore();
    const stored = await store.put('tenants/a/assertions/1.jsonld', '{"v":1}', {
      httpMetadata: {
        contentType: 'application/ld+json',
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        tenantId: 'a',
      },
    });

    expect(stored).not.toBeNull();
    expect(s3MockState.sentCommands).toHaveLength(1);
    expect(s3MockState.sentCommands[0]?.input).toMatchObject({
      Bucket: 'credtrail-objects',
      Key: 'tenants/a/assertions/1.jsonld',
      IfNoneMatch: '*',
      ContentType: 'application/ld+json',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        tenantId: 'a',
      },
    });
  });
});
