import {
  captureSentryException,
  logError,
  logInfo,
  type ObservabilityContext,
} from '@credtrail/core-domain';
import type { Hono } from 'hono';
import type { AppBindings, AppEnv } from '../app';

interface RegisterCommonMiddlewareInput {
  app: Hono<AppEnv>;
  landingAssetPathPrefixes: string[];
  landingStaticPaths: Set<string>;
  observabilityContext: (bindings: AppBindings) => ObservabilityContext;
}

const JSON_PRETTY_PRINT_SPACES = 2;

const prettifyJsonResponse = async (response: Response): Promise<Response> => {
  const contentType = response.headers.get('content-type');

  if (!contentType?.toLowerCase().includes('json')) {
    return response;
  }

  const responseClone = response.clone();
  const responseBody = await responseClone.text();

  if (responseBody.length === 0) {
    return response;
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(responseBody);
  } catch {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(JSON.stringify(parsedBody, null, JSON_PRETTY_PRINT_SPACES), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const registerCommonMiddleware = (input: RegisterCommonMiddlewareInput): void => {
  const { app, landingAssetPathPrefixes, landingStaticPaths, observabilityContext } = input;

  app.use('*', async (c, next) => {
    const startedAt = Date.now();
    const requestUrl = new URL(c.req.url);
    const canonicalHost = c.env.PLATFORM_DOMAIN.toLowerCase();
    const requestHost = requestUrl.hostname.toLowerCase();

    if (requestHost === `www.${canonicalHost}` || requestHost === `badges.${canonicalHost}`) {
      requestUrl.hostname = canonicalHost;
      requestUrl.port = '';
      return c.redirect(requestUrl.toString(), 308);
    }

    if (c.req.method === 'GET' && c.env.MARKETING_SITE_ORIGIN !== undefined) {
      const isLandingRequest =
        requestUrl.pathname === '/' ||
        requestUrl.pathname === '/docs' ||
        requestUrl.pathname === '/privacy' ||
        requestUrl.pathname === '/privacy/' ||
        requestUrl.pathname.startsWith('/docs/') ||
        landingAssetPathPrefixes.some((assetPathPrefix) =>
          requestUrl.pathname.startsWith(assetPathPrefix),
        ) ||
        landingStaticPaths.has(requestUrl.pathname);

      if (isLandingRequest) {
        const marketingUrl = new URL(
          `${requestUrl.pathname}${requestUrl.search}`,
          c.env.MARKETING_SITE_ORIGIN,
        );
        return fetch(new Request(marketingUrl.toString(), c.req.raw));
      }
    }

    await next();
    c.res = await prettifyJsonResponse(c.res);
    const elapsedMs = Date.now() - startedAt;

    logInfo(observabilityContext(c.env), 'http_request', {
      method: c.req.method,
      path: requestUrl.pathname,
      status: c.res.status,
      elapsedMs,
    });
  });

  app.onError(async (error, c) => {
    const requestUrl = new URL(c.req.url);
    const details = error instanceof Error ? error.message : 'Unknown error';

    await captureSentryException({
      context: observabilityContext(c.env),
      dsn: c.env.SENTRY_DSN,
      error,
      message: 'Unhandled API worker error',
      tags: {
        path: requestUrl.pathname,
        method: c.req.method,
      },
      extra: {
        status: 500,
        environment: c.env.APP_ENV,
      },
    });

    logError(observabilityContext(c.env), 'api_error', {
      method: c.req.method,
      path: requestUrl.pathname,
      detail: details,
    });

    return c.json(
      {
        error: 'Internal server error',
      },
      500,
    );
  });

  app.get('/healthz', (c) => {
    return c.json({
      service: 'api-worker',
      status: 'ok',
      environment: c.env.APP_ENV,
    });
  });
};
