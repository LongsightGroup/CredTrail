const copySetCookieHeaders = (source: Headers, target: Headers): void => {
  const sourceWithCookieAccessor = source as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = sourceWithCookieAccessor.getSetCookie?.();

  if (Array.isArray(setCookies) && setCookies.length > 0) {
    for (const cookie of setCookies) {
      target.append('set-cookie', cookie);
    }

    return;
  }

  const singleCookieHeader = source.get('set-cookie');

  if (singleCookieHeader !== null) {
    target.append('set-cookie', singleCookieHeader);
  }
};

export const mergeBetterAuthHeaders = (
  targetHeaders: Headers,
  sourceHeaders: Headers,
  options?: {
    preserveContentType?: boolean | undefined;
  },
): Headers => {
  for (const [key, value] of sourceHeaders.entries()) {
    const normalizedKey = key.toLowerCase();

    if (normalizedKey === 'set-cookie' || normalizedKey === 'content-length') {
      continue;
    }

    if (!options?.preserveContentType && normalizedKey === 'content-type') {
      continue;
    }

    targetHeaders.set(key, value);
  }

  copySetCookieHeaders(sourceHeaders, targetHeaders);
  return targetHeaders;
};

export const buildBetterAuthRouteResponse = (
  betterAuthResponse: Response,
  init: {
    status?: number | undefined;
    headers?: HeadersInit | undefined;
    body?: BodyInit | null | undefined;
    json?: unknown;
  },
): Response => {
  const headers = mergeBetterAuthHeaders(new Headers(init.headers), betterAuthResponse.headers);
  const status = init.status ?? betterAuthResponse.status;

  if (Object.prototype.hasOwnProperty.call(init, 'json')) {
    headers.set('content-type', 'application/json; charset=utf-8');

    return new Response(JSON.stringify(init.json), {
      status,
      headers,
    });
  }

  return new Response(init.body ?? null, {
    status,
    headers,
  });
};
