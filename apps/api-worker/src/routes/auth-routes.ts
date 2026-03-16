import {
  createAuditLog,
  createMagicLinkToken,
  ensureTenantMembership,
  upsertUserByEmail,
  type SqlDatabase,
} from '@credtrail/db';
import type { Hono } from 'hono';
import { parseMagicLinkRequest, parseMagicLinkVerifyRequest } from '@credtrail/validation';
import type { AppBindings, AppContext, AppEnv } from '../app';
import type { AuthenticatedPrincipal, RequestedTenantContext } from '../auth/auth-context';
import { magicLinkLoginPage } from '../auth/pages';
import type { SendMagicLinkEmailNotificationInput } from '../notifications/send-magic-link-email';

interface RegisterAuthRoutesInput {
  app: Hono<AppEnv>;
  resolveDatabase: (bindings: AppBindings) => SqlDatabase;
  createMagicLinkSession: (
    c: AppContext,
    token: string,
  ) => Promise<AuthenticatedPrincipal | null>;
  resolveAuthenticatedPrincipal: (
    c: AppContext,
  ) => Promise<AuthenticatedPrincipal | null>;
  resolveRequestedTenantContext: (
    c: AppContext,
  ) => Promise<RequestedTenantContext | null>;
  revokeCurrentSession: (c: AppContext) => Promise<void>;
  addSecondsToIso: (isoTimestamp: string, seconds: number) => string;
  generateOpaqueToken: () => string;
  sha256Hex: (value: string) => Promise<string>;
  MAGIC_LINK_TTL_SECONDS: number;
  sendMagicLinkEmailNotification: (input: SendMagicLinkEmailNotificationInput) => Promise<void>;
}

export const registerAuthRoutes = (input: RegisterAuthRoutesInput): void => {
  const {
    app,
    resolveDatabase,
    createMagicLinkSession,
    resolveAuthenticatedPrincipal,
    resolveRequestedTenantContext,
    revokeCurrentSession,
    addSecondsToIso,
    generateOpaqueToken,
    sha256Hex,
    MAGIC_LINK_TTL_SECONDS,
    sendMagicLinkEmailNotification,
  } = input;

  app.get('/', (c) => {
    return c.redirect('/login', 302);
  });

  app.get('/login', (c) => {
    const tenantId = (c.req.query('tenantId') ?? '').trim();
    const nextPath = (c.req.query('next') ?? '').trim();
    const reason = (c.req.query('reason') ?? '').trim();

    return c.html(
      magicLinkLoginPage({
        tenantId,
        nextPath,
        ...(reason.length === 0 ? {} : { reason }),
      }),
    );
  });

  app.post('/v1/auth/magic-link/request', async (c) => {
    const payload = await c.req.json<unknown>();
    const request = parseMagicLinkRequest(payload);
    const nowIso = new Date().toISOString();
    const expiresAt = addSecondsToIso(nowIso, MAGIC_LINK_TTL_SECONDS);
    const user = await upsertUserByEmail(resolveDatabase(c.env), request.email);
    const membershipResult = await ensureTenantMembership(
      resolveDatabase(c.env),
      request.tenantId,
      user.id,
    );

    if (membershipResult.created) {
      await createAuditLog(resolveDatabase(c.env), {
        tenantId: request.tenantId,
        actorUserId: user.id,
        action: 'membership.role_assigned',
        targetType: 'membership',
        targetId: `${request.tenantId}:${user.id}`,
        metadata: {
          userId: user.id,
          role: membershipResult.membership.role,
        },
      });
    }

    const magicLinkToken = generateOpaqueToken();
    const magicTokenHash = await sha256Hex(magicLinkToken);

    await createMagicLinkToken(resolveDatabase(c.env), {
      tenantId: request.tenantId,
      userId: user.id,
      magicTokenHash,
      expiresAt,
    });
    const tenantAdminPath = `/tenants/${encodeURIComponent(request.tenantId)}/admin`;
    const verifyUrl = new URL('/auth/magic-link/verify', c.req.url);
    verifyUrl.searchParams.set('token', magicLinkToken);
    verifyUrl.searchParams.set('next', tenantAdminPath);
    let deliveryStatus: 'sent' | 'skipped' | 'failed' = 'skipped';

    try {
      await sendMagicLinkEmailNotification({
        mailtrapApiToken: c.env.MAILTRAP_API_TOKEN,
        mailtrapInboxId: c.env.MAILTRAP_INBOX_ID,
        mailtrapApiBaseUrl: c.env.MAILTRAP_API_BASE_URL,
        mailtrapFromEmail: c.env.MAILTRAP_FROM_EMAIL,
        mailtrapFromName: c.env.MAILTRAP_FROM_NAME,
        recipientEmail: request.email,
        tenantId: request.tenantId,
        magicLinkUrl: verifyUrl.toString(),
        expiresAtIso: expiresAt,
      });
      deliveryStatus = 'sent';
    } catch {
      deliveryStatus = 'failed';
    }

    if (c.env.APP_ENV === 'development') {
      return c.json(
        {
          status: 'sent',
          deliveryStatus,
          tenantId: request.tenantId,
          email: request.email,
          expiresAt,
          magicLinkToken,
          magicLinkUrl: verifyUrl.toString(),
        },
        202,
      );
    }

    return c.json(
      {
        status: 'sent',
        deliveryStatus,
        tenantId: request.tenantId,
        email: request.email,
        expiresAt,
      },
      202,
    );
  });

  app.post('/v1/auth/magic-link/verify', async (c) => {
    const payload = await c.req.json<unknown>();
    const request = parseMagicLinkVerifyRequest(payload);
    const principal = await createMagicLinkSession(c, request.token);

    if (principal === null) {
      return c.json(
        {
          error: 'Invalid or expired magic link token',
        },
        400,
      );
    }

    const requestedTenant = await resolveRequestedTenantContext(c);

    if (requestedTenant === null) {
      return c.json(
        {
          error: 'Unable to resolve tenant context for authenticated session',
        },
        500,
      );
    }

    return c.json({
      status: 'authenticated',
      tenantId: requestedTenant.tenantId,
      userId: principal.userId,
      expiresAt: principal.expiresAt,
    });
  });

  app.get('/auth/magic-link/verify', async (c) => {
    const tokenRaw = c.req.query('token');

    if (tokenRaw === undefined || tokenRaw.trim().length === 0) {
      return c.html(
        renderPageShell(
          'Invalid Magic Link',
          '<h1>Invalid magic link</h1><p>Missing token. Request a new sign-in link.</p>',
        ),
        400,
      );
    }

    const principal = await createMagicLinkSession(c, tokenRaw.trim());

    if (principal === null) {
      return c.html(
        renderPageShell(
          'Expired Magic Link',
          '<h1>Magic link expired</h1><p>The link is invalid or expired. Request a new sign-in link.</p>',
        ),
        400,
      );
    }

    const requestedTenant = await resolveRequestedTenantContext(c);

    if (requestedTenant === null) {
      return c.html(
        renderPageShell(
          'Sign-in Error',
          '<h1>Unable to complete sign-in</h1><p>Please request a new sign-in link.</p>',
        ),
        500,
      );
    }

    const nextPathRaw = c.req.query('next');
    const fallbackPath = `/tenants/${encodeURIComponent(requestedTenant.tenantId)}/admin`;
    const nextPath = nextPathRaw?.startsWith('/') === true ? nextPathRaw : fallbackPath;

    return c.redirect(nextPath, 302);
  });

  app.get('/v1/auth/session', async (c) => {
    const principal = await resolveAuthenticatedPrincipal(c);

    if (principal === null) {
      return c.json(
        {
          error: 'Not authenticated',
        },
        401,
      );
    }

    const requestedTenant = await resolveRequestedTenantContext(c);

    if (requestedTenant === null) {
      return c.json(
        {
          error: 'Not authenticated',
        },
        401,
      );
    }

    return c.json({
      status: 'authenticated',
      tenantId: requestedTenant.tenantId,
      userId: principal.userId,
      expiresAt: principal.expiresAt,
    });
  });

  app.post('/v1/auth/logout', async (c) => {
    await revokeCurrentSession(c);

    return c.json({
      status: 'signed_out',
    });
  });
};
