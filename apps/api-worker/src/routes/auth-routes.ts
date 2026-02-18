import {
  createAuditLog,
  createMagicLinkToken,
  createSession,
  ensureTenantMembership,
  findMagicLinkTokenByHash,
  isMagicLinkTokenValid,
  markMagicLinkTokenUsed,
  revokeSessionByHash,
  upsertUserByEmail,
  type SessionRecord,
  type SqlDatabase,
} from '@credtrail/db';
import { renderPageShell } from '@credtrail/ui-components';
import type { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { parseMagicLinkRequest, parseMagicLinkVerifyRequest } from '@credtrail/validation';
import type { AppBindings, AppContext, AppEnv } from '../app';
import type { SendMagicLinkEmailNotificationInput } from '../notifications/send-magic-link-email';
import { escapeHtml } from '../utils/display-format';

interface RegisterAuthRoutesInput {
  app: Hono<AppEnv>;
  resolveDatabase: (bindings: AppBindings) => SqlDatabase;
  resolveSessionFromCookie: (c: AppContext) => Promise<SessionRecord | null>;
  addSecondsToIso: (isoTimestamp: string, seconds: number) => string;
  generateOpaqueToken: () => string;
  sha256Hex: (value: string) => Promise<string>;
  sessionCookieSecure: (appEnv: string) => boolean;
  MAGIC_LINK_TTL_SECONDS: number;
  SESSION_TTL_SECONDS: number;
  SESSION_COOKIE_NAME: string;
  sendMagicLinkEmailNotification: (input: SendMagicLinkEmailNotificationInput) => Promise<void>;
}

export const registerAuthRoutes = (input: RegisterAuthRoutesInput): void => {
  const {
    app,
    resolveDatabase,
    resolveSessionFromCookie,
    addSecondsToIso,
    generateOpaqueToken,
    sha256Hex,
    sessionCookieSecure,
    MAGIC_LINK_TTL_SECONDS,
    SESSION_TTL_SECONDS,
    SESSION_COOKIE_NAME,
    sendMagicLinkEmailNotification,
  } = input;

  const consumeMagicLinkToken = async (
    c: AppContext,
    rawToken: string,
  ): Promise<
    | {
        sessionToken: string;
        session: SessionRecord;
      }
    | null
  > => {
    const nowIso = new Date().toISOString();
    const magicTokenHash = await sha256Hex(rawToken);
    const token = await findMagicLinkTokenByHash(resolveDatabase(c.env), magicTokenHash);

    if (token === null || !isMagicLinkTokenValid(token, nowIso)) {
      return null;
    }

    await markMagicLinkTokenUsed(resolveDatabase(c.env), token.id, nowIso);

    const sessionToken = generateOpaqueToken();
    const sessionTokenHash = await sha256Hex(sessionToken);
    const session = await createSession(resolveDatabase(c.env), {
      tenantId: token.tenantId,
      userId: token.userId,
      sessionTokenHash,
      expiresAt: addSecondsToIso(nowIso, SESSION_TTL_SECONDS),
    });

    return {
      sessionToken,
      session,
    };
  };

  app.get('/', (c) => {
    return c.html(
      renderPageShell(
        'CredTrail',
        `<h1>CredTrail</h1>
        <p>Cloudflare Worker API + server-rendered interface scaffold for ${c.env.PLATFORM_DOMAIN}.</p>
        <p><a href="/login">Sign in with magic link</a></p>`,
      ),
    );
  });

  app.get('/login', (c) => {
    const tenantId = (c.req.query('tenantId') ?? '').trim();
    const nextPath = (c.req.query('next') ?? '').trim();

    return c.html(
      renderPageShell(
        'Sign In · CredTrail',
        `<style>
          .ct-login {
            --ct-login-ink: #08243f;
            --ct-login-ink-soft: #345d84;
            --ct-login-surface: #f8fbff;
            --ct-login-border: rgba(8, 45, 86, 0.14);
            --ct-login-shadow: 0 24px 40px rgba(8, 38, 74, 0.19);
            display: grid;
            gap: 1rem;
          }
          .ct-login__card {
            display: grid;
            gap: 0;
            border: 1px solid var(--ct-login-border);
            border-radius: 1.1rem;
            overflow: hidden;
            box-shadow: var(--ct-login-shadow);
            background: #ffffff;
          }
          .ct-login__hero {
            display: grid;
            gap: 0.85rem;
            padding: 1.2rem;
            color: #f4fbff;
            background:
              radial-gradient(circle at 8% 8%, rgba(255, 203, 5, 0.25), transparent 38%),
              radial-gradient(circle at 92% 8%, rgba(64, 200, 255, 0.24), transparent 36%),
              linear-gradient(145deg, #00274c 0%, #0a4c8f 70%, #0f6fb0 100%);
          }
          .ct-login__eyebrow {
            margin: 0;
            font-size: 0.74rem;
            letter-spacing: 0.09em;
            text-transform: uppercase;
            font-weight: 700;
            opacity: 0.94;
          }
          .ct-login__title {
            margin: 0;
            font-size: clamp(1.35rem, 2.3vw, 1.9rem);
            line-height: 1.15;
          }
          .ct-login__lede {
            margin: 0;
            color: rgba(236, 248, 255, 0.96);
          }
          .ct-login__chips {
            display: flex;
            flex-wrap: wrap;
            gap: 0.42rem;
          }
          .ct-login__chip {
            display: inline-flex;
            align-items: center;
            padding: 0.18rem 0.5rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.14);
            border: 1px solid rgba(255, 255, 255, 0.18);
          }
          .ct-login__form-wrap {
            display: grid;
            gap: 0.9rem;
            padding: 1.15rem;
            background: linear-gradient(160deg, #ffffff 0%, var(--ct-login-surface) 100%);
          }
          .ct-login__form-title {
            margin: 0;
            font-size: 1.06rem;
            color: var(--ct-login-ink);
          }
          .ct-login__form-text {
            margin: 0;
            color: var(--ct-login-ink-soft);
          }
          .ct-login__form {
            display: grid;
            gap: 0.72rem;
          }
          .ct-login__field {
            display: grid;
            gap: 0.32rem;
          }
          .ct-login__field span {
            font-size: 0.86rem;
            color: var(--ct-login-ink);
            font-weight: 700;
          }
          .ct-login__field input {
            border: 1px solid rgba(10, 45, 84, 0.2);
            border-radius: 0.72rem;
            padding: 0.58rem 0.68rem;
            font-size: 0.94rem;
            color: #0f2f4f;
            background: #ffffff;
          }
          .ct-login__field input:focus {
            outline: 2px solid rgba(5, 99, 191, 0.22);
            outline-offset: 1px;
            border-color: rgba(5, 99, 191, 0.62);
          }
          .ct-login__submit {
            border: none;
            border-radius: 0.76rem;
            padding: 0.6rem 0.86rem;
            font-size: 0.94rem;
            font-weight: 700;
            color: #f7fbff;
            background: linear-gradient(120deg, #00274c 0%, #0a4c8f 72%);
            cursor: pointer;
            box-shadow: 0 10px 18px rgba(8, 45, 86, 0.25);
            transition: transform 120ms ease, box-shadow 120ms ease;
          }
          .ct-login__submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 20px rgba(8, 45, 86, 0.3);
          }
          .ct-login__status {
            margin: 0;
            border-radius: 0.72rem;
            padding: 0.58rem 0.66rem;
            font-size: 0.9rem;
            border: 1px solid rgba(8, 45, 86, 0.14);
            background: #eff6ff;
            color: #1f4970;
            min-height: 1.2rem;
          }
          .ct-login__status[data-tone="error"] {
            border-color: rgba(139, 31, 18, 0.2);
            background: #fff2f0;
            color: #8b1f12;
          }
          .ct-login__status[data-tone="success"] {
            border-color: rgba(20, 99, 62, 0.2);
            background: #edfdf3;
            color: #14633e;
          }
          .ct-login__dev {
            margin: 0;
            font-size: 0.88rem;
            color: #255077;
          }
          .ct-login__dev a {
            font-weight: 700;
          }
          @media (min-width: 900px) {
            .ct-login__card {
              grid-template-columns: 1.05fr 1fr;
            }
            .ct-login__hero {
              padding: 1.45rem;
              min-height: 100%;
              align-content: center;
            }
            .ct-login__form-wrap {
              padding: 1.45rem;
            }
          }
        </style>
        <section class="ct-login">
          <div class="ct-login__card">
            <aside class="ct-login__hero">
              <p class="ct-login__eyebrow">Institution Access</p>
              <h1 class="ct-login__title">Sign in to your CredTrail tenant</h1>
              <p class="ct-login__lede">
                We send a one-click secure magic link to your email. No password, no copy/paste token flow.
              </p>
              <div class="ct-login__chips">
                <span class="ct-login__chip">Magic Link</span>
                <span class="ct-login__chip">Tenant-Scoped</span>
                <span class="ct-login__chip">Session Secured</span>
              </div>
            </aside>
            <div class="ct-login__form-wrap">
              <h2 class="ct-login__form-title">Request sign-in link</h2>
              <p class="ct-login__form-text">Enter your tenant ID and institution email.</p>
              <form id="magic-link-login-form" class="ct-login__form">
                <label class="ct-login__field">
                  <span>Tenant ID</span>
                  <input name="tenantId" type="text" required value="${escapeHtml(tenantId)}" placeholder="sakai" />
                </label>
                <label class="ct-login__field">
                  <span>Email</span>
                  <input name="email" type="email" required placeholder="you@umich.edu" />
                </label>
                <input name="next" type="hidden" value="${escapeHtml(nextPath)}" />
                <button type="submit" class="ct-login__submit">Send magic link</button>
              </form>
              <p id="magic-link-login-status" class="ct-login__status"></p>
              <p id="magic-link-dev-link" class="ct-login__dev"></p>
            </div>
          </div>
        </section>
        <script>
          (() => {
            const form = document.getElementById('magic-link-login-form');
            const statusEl = document.getElementById('magic-link-login-status');
            const devLinkEl = document.getElementById('magic-link-dev-link');

            if (!(form instanceof HTMLFormElement) || !(statusEl instanceof HTMLElement) || !(devLinkEl instanceof HTMLElement)) {
              return;
            }

            const setStatus = (text, isError) => {
              statusEl.textContent = text;
              statusEl.dataset.tone = isError ? 'error' : 'success';
            };

            form.addEventListener('submit', async (event) => {
              event.preventDefault();
              setStatus('Sending magic link...', false);
              devLinkEl.textContent = '';
              const data = new FormData(form);
              const tenantIdRaw = data.get('tenantId');
              const emailRaw = data.get('email');
              const nextRaw = data.get('next');
              const tenantId = typeof tenantIdRaw === 'string' ? tenantIdRaw.trim() : '';
              const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
              const next = typeof nextRaw === 'string' ? nextRaw.trim() : '';

              if (tenantId.length === 0 || email.length === 0) {
                setStatus('Tenant ID and email are required.', true);
                return;
              }

              try {
                const response = await fetch('/v1/auth/magic-link/request', {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    tenantId,
                    email,
                  }),
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                  const detail = payload && typeof payload.error === 'string' ? payload.error : 'Request failed';
                  setStatus(detail, true);
                  return;
                }

                const deliveryStatus =
                  payload && typeof payload.deliveryStatus === 'string'
                    ? payload.deliveryStatus
                    : 'sent';
                setStatus(
                  deliveryStatus === 'sent'
                    ? 'Magic link sent. Check your inbox.'
                    : deliveryStatus === 'failed'
                      ? 'Magic link created, but email delivery failed. Contact support.'
                      : 'Magic link created.',
                  deliveryStatus === 'failed',
                );

                if (payload && typeof payload.magicLinkUrl === 'string' && payload.magicLinkUrl.length > 0) {
                  const url = new URL(payload.magicLinkUrl);
                  if (next.length > 0 && next.startsWith('/')) {
                    url.searchParams.set('next', next);
                  }
                  devLinkEl.innerHTML = '<a href="' + url.toString() + '">Open magic link (development helper)</a>';
                }
              } catch {
                setStatus('Unable to request magic link right now.', true);
              }
            });
          })();
        </script>`,
      ),
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
    const consumed = await consumeMagicLinkToken(c, request.token);

    if (consumed === null) {
      return c.json(
        {
          error: 'Invalid or expired magic link token',
        },
        400,
      );
    }

    setCookie(c, SESSION_COOKIE_NAME, consumed.sessionToken, {
      httpOnly: true,
      secure: sessionCookieSecure(c.env.APP_ENV),
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    return c.json({
      status: 'authenticated',
      tenantId: consumed.session.tenantId,
      userId: consumed.session.userId,
      expiresAt: consumed.session.expiresAt,
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

    const consumed = await consumeMagicLinkToken(c, tokenRaw.trim());

    if (consumed === null) {
      return c.html(
        renderPageShell(
          'Expired Magic Link',
          '<h1>Magic link expired</h1><p>The link is invalid or expired. Request a new sign-in link.</p>',
        ),
        400,
      );
    }

    setCookie(c, SESSION_COOKIE_NAME, consumed.sessionToken, {
      httpOnly: true,
      secure: sessionCookieSecure(c.env.APP_ENV),
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    const nextPathRaw = c.req.query('next');
    const fallbackPath = `/tenants/${encodeURIComponent(consumed.session.tenantId)}/admin`;
    const nextPath = nextPathRaw?.startsWith('/') === true ? nextPathRaw : fallbackPath;

    return c.redirect(nextPath, 302);
  });

  app.get('/v1/auth/session', async (c) => {
    const session = await resolveSessionFromCookie(c);

    if (session === null) {
      return c.json(
        {
          error: 'Not authenticated',
        },
        401,
      );
    }

    return c.json({
      status: 'authenticated',
      tenantId: session.tenantId,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
  });

  app.post('/v1/auth/logout', async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (sessionToken !== undefined) {
      const sessionTokenHash = await sha256Hex(sessionToken);
      await revokeSessionByHash(resolveDatabase(c.env), sessionTokenHash, new Date().toISOString());
    }

    deleteCookie(c, SESSION_COOKIE_NAME, {
      path: '/',
    });

    return c.json({
      status: 'signed_out',
    });
  });
};
