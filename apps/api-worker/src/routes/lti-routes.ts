import { captureSentryException } from '@credtrail/core-domain';
import {
  addLearnerIdentityAlias,
  ensureTenantMembership,
  findLearnerProfileByIdentity,
  listBadgeTemplates,
  resolveLearnerProfileForIdentity,
  upsertUserByEmail,
  type SqlDatabase,
  type TenantMembershipRole,
} from '@credtrail/db';
import {
  LTI_CLAIM_VERSION,
  LTI_CLAIM_DEEP_LINKING_CONTENT_ITEMS,
  LTI_CLAIM_DEEP_LINKING_DATA,
  LTI_CLAIM_DEEP_LINKING_SETTINGS,
  LTI_CLAIM_DEPLOYMENT_ID,
  LTI_CLAIM_MESSAGE_TYPE,
  LTI_CLAIM_RESOURCE_LINK,
  LTI_CLAIM_TARGET_LINK_URI,
  LTI_MESSAGE_TYPE_DEEP_LINKING_REQUEST,
  LTI_MESSAGE_TYPE_RESOURCE_LINK_REQUEST,
  LTI_VERSION_1P3P0,
  parseLtiLaunchClaims,
  parseLtiOidcLoginInitiationRequest,
  resolveLtiRoleKind,
  type LtiLaunchClaims,
} from '@credtrail/lti';
import type { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { AppBindings, AppContext, AppEnv } from '../app';
import {
  LTI_LAUNCH_PATH,
  LTI_OIDC_LOGIN_PATH,
  LTI_OIDC_PROMPT,
  LTI_OIDC_RESPONSE_MODE,
  LTI_OIDC_RESPONSE_TYPE,
  LTI_OIDC_SCOPE,
  LTI_STATE_TTL_SECONDS,
} from '../lti/constants';
import {
  ltiAudienceIncludesClientId,
  ltiDisplayNameFromClaims,
  ltiEmailFromClaims,
  ltiFederatedSubjectIdentity,
  ltiLaunchFormInputFromRequest,
  ltiLearnerDashboardPath,
  ltiLoginInputFromRequest,
  ltiMembershipRoleFromRoleKind,
  ltiSourcedIdFromClaims,
  ltiStateSigningSecret,
  ltiSyntheticEmail,
  normalizeAbsoluteUrlForComparison,
  normalizeLtiIssuer,
  type LtiIssuerRegistry,
  type LtiStatePayload,
  type LtiStateValidationResult,
} from '../lti/lti-helpers';
import { ltiDeepLinkSelectionPage, ltiLaunchResultPage } from '../lti/pages';
import { parseCompactJwsHeaderObject, parseCompactJwsPayloadObject } from '../ob3/oauth-utils';
import { asJsonObject, asNonEmptyString } from '../utils/value-parsers';

interface RegisterLtiRoutesInput {
  app: Hono<AppEnv>;
  resolveLtiIssuerRegistry: (context: AppContext) => Promise<LtiIssuerRegistry>;
  observabilityContext: (bindings: AppBindings) => { service: string; environment: string };
  generateOpaqueToken: () => string;
  signLtiStatePayload: (payload: LtiStatePayload, secret: string) => Promise<string>;
  addSecondsToIso: (isoTimestamp: string, seconds: number) => string;
  validateLtiStateToken: (
    stateToken: string,
    secret: string,
    nowIso: string,
  ) => Promise<LtiStateValidationResult>;
  resolveDatabase: (bindings: AppBindings) => SqlDatabase;
  upsertTenantMembershipRole: (
    db: SqlDatabase,
    input: {
      tenantId: string;
      userId: string;
      role: TenantMembershipRole;
    },
  ) => Promise<{
    membership: {
      role: TenantMembershipRole;
    };
  }>;
  sha256Hex: (value: string) => Promise<string>;
  createSession: (
    db: SqlDatabase,
    input: {
      tenantId: string;
      userId: string;
      sessionTokenHash: string;
      expiresAt: string;
    },
  ) => Promise<{
    tenantId: string;
    userId: string;
  }>;
  sessionCookieSecure: (environment: string) => boolean;
  SESSION_TTL_SECONDS: number;
  SESSION_COOKIE_NAME: string;
}

interface LtiDeepLinkingSettings {
  deepLinkReturnUrl: string;
  data?: string;
  acceptTypes?: string[];
}

const base64UrlEncodeBytes = (bytes: Uint8Array): string => {
  let raw = '';

  for (const byte of bytes) {
    raw += String.fromCharCode(byte);
  }

  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlEncodeJson = (value: Record<string, unknown>): string => {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
};

const unsignedCompactJwt = (payload: Record<string, unknown>): string => {
  const header = base64UrlEncodeJson({
    alg: 'none',
    typ: 'JWT',
  });
  const encodedPayload = base64UrlEncodeJson(payload);

  return `${header}.${encodedPayload}.`;
};

const parseDeepLinkingSettings = (claimValue: unknown): LtiDeepLinkingSettings | null => {
  const settings = asJsonObject(claimValue);

  if (settings === null) {
    return null;
  }

  const deepLinkReturnUrl = asNonEmptyString(settings.deep_link_return_url);

  if (deepLinkReturnUrl === null) {
    return null;
  }

  let parsedDeepLinkReturnUrl: URL;

  try {
    parsedDeepLinkReturnUrl = new URL(deepLinkReturnUrl);
  } catch {
    return null;
  }

  if (
    parsedDeepLinkReturnUrl.protocol !== 'https:' &&
    parsedDeepLinkReturnUrl.protocol !== 'http:'
  ) {
    return null;
  }

  let data: string | undefined;

  if (settings.data !== undefined) {
    const parsedData = asNonEmptyString(settings.data);

    if (parsedData === null) {
      return null;
    }

    data = parsedData;
  }

  let acceptTypes: string[] | undefined;

  if (settings.accept_types !== undefined) {
    if (!Array.isArray(settings.accept_types)) {
      return null;
    }

    const normalizedAcceptTypes = settings.accept_types
      .map((entry) => asNonEmptyString(entry))
      .filter((entry): entry is string => entry !== null);

    if (normalizedAcceptTypes.length !== settings.accept_types.length) {
      return null;
    }

    acceptTypes = normalizedAcceptTypes;
  }

  return {
    deepLinkReturnUrl: parsedDeepLinkReturnUrl.toString(),
    ...(data === undefined ? {} : { data }),
    ...(acceptTypes === undefined ? {} : { acceptTypes }),
  };
};

export const registerLtiRoutes = (input: RegisterLtiRoutesInput): void => {
  const {
    app,
    resolveLtiIssuerRegistry,
    observabilityContext,
    generateOpaqueToken,
    signLtiStatePayload,
    addSecondsToIso,
    validateLtiStateToken,
    resolveDatabase,
    upsertTenantMembershipRole: upsertTenantMembershipRoleWithInput,
    sha256Hex,
    createSession: createSessionWithInput,
    sessionCookieSecure,
    SESSION_TTL_SECONDS,
    SESSION_COOKIE_NAME,
  } = input;

  const ltiOidcLoginHandler = async (c: AppContext): Promise<Response> => {
    let registry: LtiIssuerRegistry;

    try {
      registry = await resolveLtiIssuerRegistry(c);
    } catch (error) {
      await captureSentryException({
        context: observabilityContext(c.env),
        dsn: c.env.SENTRY_DSN,
        error,
        message: 'LTI issuer registry configuration is invalid',
        tags: {
          path: LTI_OIDC_LOGIN_PATH,
          method: c.req.method,
        },
      });
      return c.json(
        {
          error: 'LTI issuer registry configuration is invalid',
        },
        500,
      );
    }

    let loginRequest;

    try {
      loginRequest = parseLtiOidcLoginInitiationRequest(await ltiLoginInputFromRequest(c));
    } catch {
      return c.json(
        {
          error: 'Invalid LTI OIDC login initiation request',
        },
        400,
      );
    }

    const issuerEntry = registry[normalizeLtiIssuer(loginRequest.iss)];

    if (issuerEntry === undefined) {
      return c.json(
        {
          error: 'Unknown LTI issuer',
        },
        400,
      );
    }

    const clientId = loginRequest.client_id ?? issuerEntry.clientId;

    if (loginRequest.client_id !== undefined && loginRequest.client_id !== issuerEntry.clientId) {
      return c.json(
        {
          error: 'client_id does not match configured issuer registration',
        },
        400,
      );
    }

    const nowIso = new Date().toISOString();
    const nonce = generateOpaqueToken();
    const statePayload = {
      iss: normalizeLtiIssuer(loginRequest.iss),
      clientId,
      nonce,
      loginHint: loginRequest.login_hint,
      targetLinkUri: loginRequest.target_link_uri,
      ...(loginRequest.lti_message_hint === undefined
        ? {}
        : {
            ltiMessageHint: loginRequest.lti_message_hint,
          }),
      ...(loginRequest.lti_deployment_id === undefined
        ? {}
        : {
            ltiDeploymentId: loginRequest.lti_deployment_id,
          }),
      issuedAt: nowIso,
      expiresAt: addSecondsToIso(nowIso, LTI_STATE_TTL_SECONDS),
    };
    const stateToken = await signLtiStatePayload(statePayload, ltiStateSigningSecret(c.env));
    const authorizationRequestUrl = new URL(issuerEntry.authorizationEndpoint);
    authorizationRequestUrl.searchParams.set('scope', LTI_OIDC_SCOPE);
    authorizationRequestUrl.searchParams.set('response_type', LTI_OIDC_RESPONSE_TYPE);
    authorizationRequestUrl.searchParams.set('response_mode', LTI_OIDC_RESPONSE_MODE);
    authorizationRequestUrl.searchParams.set('prompt', LTI_OIDC_PROMPT);
    authorizationRequestUrl.searchParams.set('client_id', clientId);
    authorizationRequestUrl.searchParams.set(
      'redirect_uri',
      new URL(LTI_LAUNCH_PATH, c.req.url).toString(),
    );
    authorizationRequestUrl.searchParams.set('login_hint', loginRequest.login_hint);
    authorizationRequestUrl.searchParams.set('state', stateToken);
    authorizationRequestUrl.searchParams.set('nonce', nonce);

    if (loginRequest.lti_message_hint !== undefined) {
      authorizationRequestUrl.searchParams.set('lti_message_hint', loginRequest.lti_message_hint);
    }

    if (loginRequest.lti_deployment_id !== undefined) {
      authorizationRequestUrl.searchParams.set('lti_deployment_id', loginRequest.lti_deployment_id);
    }

    return c.redirect(authorizationRequestUrl.toString(), 302);
  };

  app.get(LTI_OIDC_LOGIN_PATH, ltiOidcLoginHandler);
  app.post(LTI_OIDC_LOGIN_PATH, ltiOidcLoginHandler);

  app.post(LTI_LAUNCH_PATH, async (c): Promise<Response> => {
    const formInput = await ltiLaunchFormInputFromRequest(c);

    if (formInput.idToken === null || formInput.idToken.trim().length === 0) {
      return c.json(
        {
          error: 'id_token is required',
        },
        400,
      );
    }

    if (formInput.state === null || formInput.state.trim().length === 0) {
      return c.json(
        {
          error: 'state is required',
        },
        400,
      );
    }

    let registry: LtiIssuerRegistry;

    try {
      registry = await resolveLtiIssuerRegistry(c);
    } catch (error) {
      await captureSentryException({
        context: observabilityContext(c.env),
        dsn: c.env.SENTRY_DSN,
        error,
        message: 'LTI issuer registry configuration is invalid',
        tags: {
          path: LTI_LAUNCH_PATH,
          method: c.req.method,
        },
      });
      return c.json(
        {
          error: 'LTI issuer registry configuration is invalid',
        },
        500,
      );
    }

    const nowIso = new Date().toISOString();
    const validatedState = await validateLtiStateToken(
      formInput.state,
      ltiStateSigningSecret(c.env),
      nowIso,
    );

    if (validatedState.status !== 'ok') {
      return c.json(
        {
          error: `Invalid launch state: ${validatedState.reason}`,
        },
        400,
      );
    }

    const issuerEntry = registry[normalizeLtiIssuer(validatedState.payload.iss)];

    if (issuerEntry === undefined) {
      return c.json(
        {
          error: 'No issuer registration configured for state.iss',
        },
        400,
      );
    }

    const idTokenHeader = parseCompactJwsHeaderObject(formInput.idToken);
    const idTokenPayload = parseCompactJwsPayloadObject(formInput.idToken);

    if (idTokenHeader === null || idTokenPayload === null) {
      return c.json(
        {
          error: 'id_token must be a compact JWT with valid JSON header and payload',
        },
        400,
      );
    }

    const algorithm = asNonEmptyString(idTokenHeader.alg);

    if (algorithm === null || algorithm.toLowerCase() === 'none') {
      return c.json(
        {
          error: 'id_token must specify a JOSE alg and must not use "none"',
        },
        400,
      );
    }

    if (!issuerEntry.allowUnsignedIdToken) {
      return c.json(
        {
          error:
            'LTI issuer requires signature verification configuration; set allowUnsignedIdToken only for test launches',
        },
        501,
      );
    }

    let launchClaims: LtiLaunchClaims;

    try {
      launchClaims = parseLtiLaunchClaims(idTokenPayload);
    } catch {
      return c.json(
        {
          error: 'id_token launch claims are invalid for LTI 1.3',
        },
        400,
      );
    }

    if (normalizeLtiIssuer(launchClaims.iss) !== normalizeLtiIssuer(validatedState.payload.iss)) {
      return c.json(
        {
          error: 'id_token issuer does not match state issuer',
        },
        400,
      );
    }

    if (!ltiAudienceIncludesClientId(launchClaims.aud, validatedState.payload.clientId)) {
      return c.json(
        {
          error: 'id_token aud does not include configured client_id',
        },
        400,
      );
    }

    if (launchClaims.nonce !== validatedState.payload.nonce) {
      return c.json(
        {
          error: 'id_token nonce does not match launch state nonce',
        },
        400,
      );
    }

    const nowEpochSeconds = Math.floor(Date.parse(nowIso) / 1000);

    if (launchClaims.exp <= nowEpochSeconds) {
      return c.json(
        {
          error: 'id_token is expired',
        },
        400,
      );
    }

    if (launchClaims.iat > nowEpochSeconds + 60) {
      return c.json(
        {
          error: 'id_token iat is in the future',
        },
        400,
      );
    }

    if (
      validatedState.payload.ltiDeploymentId !== undefined &&
      launchClaims[LTI_CLAIM_DEPLOYMENT_ID] !== validatedState.payload.ltiDeploymentId
    ) {
      return c.json(
        {
          error: 'id_token deployment_id does not match launch initiation',
        },
        400,
      );
    }

    const messageType = launchClaims[LTI_CLAIM_MESSAGE_TYPE];
    const targetLinkUriClaim = launchClaims[LTI_CLAIM_TARGET_LINK_URI];
    const normalizedStateTargetLinkUri = normalizeAbsoluteUrlForComparison(
      validatedState.payload.targetLinkUri,
    );
    const normalizedClaimTargetLinkUri =
      targetLinkUriClaim === undefined ? null : normalizeAbsoluteUrlForComparison(targetLinkUriClaim);

    if (
      targetLinkUriClaim !== undefined &&
      normalizedStateTargetLinkUri !== null &&
      normalizedClaimTargetLinkUri !== normalizedStateTargetLinkUri
    ) {
      return c.json(
        {
          error: 'id_token target_link_uri does not match launch initiation',
        },
        400,
      );
    }

    const resolvedTargetLinkUri = targetLinkUriClaim ?? validatedState.payload.targetLinkUri;
    const roleKind = resolveLtiRoleKind(launchClaims);
    let deepLinkingSettings: LtiDeepLinkingSettings | null = null;

    if (messageType === LTI_MESSAGE_TYPE_RESOURCE_LINK_REQUEST) {
      const resourceLinkClaim = launchClaims[LTI_CLAIM_RESOURCE_LINK];

      if (resourceLinkClaim === undefined || asNonEmptyString(resourceLinkClaim.id) === null) {
        return c.json(
          {
            error: 'id_token for LtiResourceLinkRequest must include resource_link.id',
          },
          400,
        );
      }
    } else if (messageType === LTI_MESSAGE_TYPE_DEEP_LINKING_REQUEST) {
      if (roleKind !== 'instructor') {
        return c.json(
          {
            error: 'LtiDeepLinkingRequest requires instructor role',
          },
          403,
        );
      }

      deepLinkingSettings = parseDeepLinkingSettings(launchClaims[LTI_CLAIM_DEEP_LINKING_SETTINGS]);

      if (deepLinkingSettings === null) {
        return c.json(
          {
            error: 'id_token for LtiDeepLinkingRequest must include deep_linking_settings.deep_link_return_url',
          },
          400,
        );
      }

      if (
        deepLinkingSettings.acceptTypes !== undefined &&
        !deepLinkingSettings.acceptTypes.includes('ltiResourceLink')
      ) {
        return c.json(
          {
            error: 'deep_linking_settings.accept_types must include ltiResourceLink',
          },
          400,
        );
      }
    } else {
      return c.json(
        {
          error: `Unsupported LTI message_type: ${messageType}`,
        },
        400,
      );
    }
    const db = resolveDatabase(c.env);
    const tenantId = issuerEntry.tenantId;
    const federatedSubject = ltiFederatedSubjectIdentity(launchClaims.iss, launchClaims.sub);
    const displayName = ltiDisplayNameFromClaims(launchClaims);

    let linkedLearnerProfileId: string;
    let linkedUserId: string;
    let linkedMembershipRole: TenantMembershipRole;

    try {
      const learnerProfile = await resolveLearnerProfileForIdentity(db, {
        tenantId,
        identityType: 'saml_subject',
        identityValue: federatedSubject,
        ...(displayName === undefined ? {} : { displayName }),
      });
      linkedLearnerProfileId = learnerProfile.id;

      const claimedEmail = ltiEmailFromClaims(launchClaims);

      if (claimedEmail !== null) {
        const existingEmailProfile = await findLearnerProfileByIdentity(db, {
          tenantId,
          identityType: 'email',
          identityValue: claimedEmail,
        });

        if (existingEmailProfile !== null && existingEmailProfile.id !== learnerProfile.id) {
          throw new Error('LTI email claim is already linked to a different learner profile');
        }

        if (existingEmailProfile === null) {
          await addLearnerIdentityAlias(db, {
            tenantId,
            learnerProfileId: learnerProfile.id,
            identityType: 'email',
            identityValue: claimedEmail,
            isPrimary: false,
            isVerified: true,
          });
        }
      }

      const sourcedId = ltiSourcedIdFromClaims(launchClaims);

      if (sourcedId !== null) {
        const existingSourcedIdProfile = await findLearnerProfileByIdentity(db, {
          tenantId,
          identityType: 'sourced_id',
          identityValue: sourcedId,
        });

        if (existingSourcedIdProfile !== null && existingSourcedIdProfile.id !== learnerProfile.id) {
          throw new Error('LTI sourcedId claim is already linked to a different learner profile');
        }

        if (existingSourcedIdProfile === null) {
          await addLearnerIdentityAlias(db, {
            tenantId,
            learnerProfileId: learnerProfile.id,
            identityType: 'sourced_id',
            identityValue: sourcedId,
            isPrimary: false,
            isVerified: true,
          });
        }
      }

      const user = await upsertUserByEmail(
        db,
        claimedEmail ?? (await ltiSyntheticEmail(tenantId, federatedSubject, sha256Hex)),
      );
      linkedUserId = user.id;

      const membershipResult = await ensureTenantMembership(db, tenantId, user.id);
      linkedMembershipRole = membershipResult.membership.role;

      const desiredRole = ltiMembershipRoleFromRoleKind(roleKind);

      if (desiredRole === 'issuer' && linkedMembershipRole === 'viewer') {
        const promotedMembership = await upsertTenantMembershipRoleWithInput(db, {
          tenantId,
          userId: user.id,
          role: desiredRole,
        });
        linkedMembershipRole = promotedMembership.membership.role;
      }
    } catch (error) {
      await captureSentryException({
        context: observabilityContext(c.env),
        dsn: c.env.SENTRY_DSN,
        error,
        message: 'LTI launch could not be linked to a local user/session',
        tags: {
          path: LTI_LAUNCH_PATH,
          method: c.req.method,
        },
        extra: {
          issuer: launchClaims.iss,
          deploymentId: launchClaims[LTI_CLAIM_DEPLOYMENT_ID],
          subjectId: launchClaims.sub,
        },
      });
      return c.json(
        {
          error: 'Unable to link LTI launch to local account',
        },
        500,
      );
    }

    const sessionToken = generateOpaqueToken();
    const sessionTokenHash = await sha256Hex(sessionToken);
    const session = await createSessionWithInput(db, {
      tenantId,
      userId: linkedUserId,
      sessionTokenHash,
      expiresAt: addSecondsToIso(nowIso, SESSION_TTL_SECONDS),
    });

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: sessionCookieSecure(c.env.APP_ENV),
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    const dashboardPath = ltiLearnerDashboardPath(session.tenantId);
    c.header('Cache-Control', 'no-store');

    if (messageType === LTI_MESSAGE_TYPE_DEEP_LINKING_REQUEST && deepLinkingSettings !== null) {
      const badgeTemplates = await listBadgeTemplates(db, {
        tenantId,
        includeArchived: false,
      });
      const responseTokenIssuedAtEpoch = Math.floor(Date.parse(nowIso) / 1000);
      const deepLinkOptions = badgeTemplates.map((badgeTemplate) => {
        const launchUrl = new URL(resolvedTargetLinkUri);
        launchUrl.searchParams.set('badgeTemplateId', badgeTemplate.id);
        const responsePayload: Record<string, unknown> = {
          iss: new URL(c.req.url).origin,
          aud: validatedState.payload.clientId,
          iat: responseTokenIssuedAtEpoch,
          exp: responseTokenIssuedAtEpoch + 300,
          nonce: validatedState.payload.nonce,
          [LTI_CLAIM_DEPLOYMENT_ID]: launchClaims[LTI_CLAIM_DEPLOYMENT_ID],
          [LTI_CLAIM_MESSAGE_TYPE]: 'LtiDeepLinkingResponse',
          [LTI_CLAIM_VERSION]: LTI_VERSION_1P3P0,
          [LTI_CLAIM_DEEP_LINKING_CONTENT_ITEMS]: [
            {
              type: 'ltiResourceLink',
              title: badgeTemplate.title,
              text:
                badgeTemplate.description ??
                `CredTrail badge template ${badgeTemplate.title} (${badgeTemplate.id})`,
              url: launchUrl.toString(),
              custom: {
                badgeTemplateId: badgeTemplate.id,
              },
            },
          ],
          ...(deepLinkingSettings.data === undefined
            ? {}
            : {
                [LTI_CLAIM_DEEP_LINKING_DATA]: deepLinkingSettings.data,
              }),
        };

        return {
          badgeTemplateId: badgeTemplate.id,
          title: badgeTemplate.title,
          description: badgeTemplate.description,
          launchUrl: launchUrl.toString(),
          deepLinkResponseJwt: unsignedCompactJwt(responsePayload),
        };
      });

      return c.html(
        ltiDeepLinkSelectionPage({
          tenantId: session.tenantId,
          userId: session.userId,
          membershipRole: linkedMembershipRole,
          issuer: launchClaims.iss,
          deploymentId: launchClaims[LTI_CLAIM_DEPLOYMENT_ID],
          deepLinkReturnUrl: deepLinkingSettings.deepLinkReturnUrl,
          targetLinkUri: resolvedTargetLinkUri,
          isUnsignedResponseJwt: true,
          options: deepLinkOptions,
        }),
      );
    }

    return c.html(
      ltiLaunchResultPage({
        roleKind,
        tenantId: session.tenantId,
        userId: session.userId,
        membershipRole: linkedMembershipRole,
        learnerProfileId: linkedLearnerProfileId,
        issuer: launchClaims.iss,
        deploymentId: launchClaims[LTI_CLAIM_DEPLOYMENT_ID],
        subjectId: launchClaims.sub,
        targetLinkUri: resolvedTargetLinkUri,
        messageType,
        dashboardPath,
      }),
    );
  });
};
