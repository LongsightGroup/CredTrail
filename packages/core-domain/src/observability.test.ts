import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureSentryException } from './observability';

const context = {
  service: 'unit-test-service',
  environment: 'test',
};

describe('captureSentryException', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when DSN is not configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await captureSentryException({
      context,
      dsn: undefined,
      error: new Error('boom'),
      message: 'Test error',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ignores invalid DSN values without throwing', async () => {
    await expect(
      captureSentryException({
        context,
        dsn: 'invalid-dsn',
        error: new Error('boom'),
        message: 'Test error',
      }),
    ).resolves.toBeUndefined();
  });

  it('posts events to Sentry when DSN is configured', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 200 }));

    await captureSentryException({
      context,
      dsn: 'https://public@example.ingest.sentry.io/12345',
      error: new Error('boom'),
      message: 'Test error',
      tags: {
        feature: 'observability',
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const firstCall = fetchSpy.mock.calls[0];
    expect(firstCall?.[0]).toContain('https://example.ingest.sentry.io/api/12345/store/');
  });
});
