import { describe, expect, it } from 'vitest';
import { app } from './index';
import { pageAssetPath, type PageAssetKey } from './ui/page-assets';

const createEnv = (): {
  APP_ENV: string;
  DATABASE_URL: string;
  BADGE_OBJECTS: R2Bucket;
  PLATFORM_DOMAIN: string;
} => {
  return {
    APP_ENV: 'test',
    DATABASE_URL: 'postgres://credtrail-test.local/db',
    BADGE_OBJECTS: {} as R2Bucket,
    PLATFORM_DOMAIN: 'credtrail.test',
  };
};

describe('GET /assets/ui/:assetFilename', () => {
  it('serves registered page assets with immutable caching headers', async () => {
    const env = createEnv();
    const assetKeys: readonly PageAssetKey[] = [
      'authLoginCss',
      'authLoginJs',
      'institutionAdminCss',
      'institutionAdminJs',
      'ltiPagesCss',
    ];

    for (const assetKey of assetKeys) {
      const response = await app.request(pageAssetPath(assetKey), undefined, env);

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toContain('immutable');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');

      if (assetKey.endsWith('Css')) {
        expect(response.headers.get('content-type')).toContain('text/css');
      } else {
        expect(response.headers.get('content-type')).toContain('text/javascript');
      }
    }
  });

  it('returns 404 for unknown page assets', async () => {
    const response = await app.request('/assets/ui/does-not-exist.js', undefined, createEnv());

    expect(response.status).toBe(404);
  });
});
