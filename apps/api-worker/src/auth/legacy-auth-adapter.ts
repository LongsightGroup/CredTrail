import {
  createSession,
  findActiveSessionByHash,
  findMagicLinkTokenByHash,
  isMagicLinkTokenValid,
  markMagicLinkTokenUsed,
  revokeSessionByHash,
  touchSession,
  type SessionRecord,
  type SqlDatabase,
} from '@credtrail/db';
import type { AuthenticatedPrincipal, RequestedTenantContext } from './auth-context';
import type { InternalAuthProvider, LtiSessionInput } from './auth-provider';

export interface LegacyAuthAdapterContext<BindingsType> {
  env: BindingsType;
}

export interface LegacyAuthAdapterInput<
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
> {
  resolveDatabase: (bindings: BindingsType) => SqlDatabase;
  readSessionToken: (context: ContextType) => string | undefined;
  setSessionCookie?: (context: ContextType, sessionToken: string) => void;
  clearSessionCookie: (context: ContextType) => void;
  sha256Hex: (value: string) => Promise<string>;
  generateOpaqueToken?: () => string;
  addSecondsToIso?: (isoTimestamp: string, seconds: number) => string;
  sessionTtlSeconds?: number;
  cacheAuthenticatedPrincipal?: (
    context: ContextType,
    principal: AuthenticatedPrincipal | null,
  ) => void;
  cacheRequestedTenantContext?: (
    context: ContextType,
    requestedTenant: RequestedTenantContext | null,
  ) => void;
  authMethod?: AuthenticatedPrincipal['authMethod'];
}

const principalFromSession = (
  session: SessionRecord,
  authMethod: AuthenticatedPrincipal['authMethod'],
): AuthenticatedPrincipal => {
  return {
    userId: session.userId,
    authSessionId: session.id,
    authMethod,
    expiresAt: session.expiresAt,
  };
};

const requestedTenantFromSession = (session: SessionRecord): RequestedTenantContext => {
  return {
    tenantId: session.tenantId,
    source: 'legacy_session',
    authoritative: false,
  };
};

const cacheResolvedAuth = <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
  session: SessionRecord | null,
  authMethod: AuthenticatedPrincipal['authMethod'],
): void => {
  input.cacheAuthenticatedPrincipal?.(
    context,
    session === null ? null : principalFromSession(session, authMethod),
  );
  input.cacheRequestedTenantContext?.(
    context,
    session === null ? null : requestedTenantFromSession(session),
  );
};

const sessionCreationInput = <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): {
  setSessionCookie: (context: ContextType, sessionToken: string) => void;
  generateOpaqueToken: () => string;
  addSecondsToIso: (isoTimestamp: string, seconds: number) => string;
  sessionTtlSeconds: number;
} => {
  if (
    input.setSessionCookie === undefined ||
    input.generateOpaqueToken === undefined ||
    input.addSecondsToIso === undefined ||
    input.sessionTtlSeconds === undefined
  ) {
    throw new Error('Legacy auth session creation is not fully configured');
  }

  return {
    setSessionCookie: input.setSessionCookie,
    generateOpaqueToken: input.generateOpaqueToken,
    addSecondsToIso: input.addSecondsToIso,
    sessionTtlSeconds: input.sessionTtlSeconds,
  };
};

export const resolveLegacySessionRecord = async <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): Promise<SessionRecord | null> => {
  const sessionToken = input.readSessionToken(context)?.trim();

  if (sessionToken === undefined || sessionToken.length === 0) {
    return null;
  }

  const sessionTokenHash = await input.sha256Hex(sessionToken);
  const nowIso = new Date().toISOString();
  const session = await findActiveSessionByHash(
    input.resolveDatabase(context.env),
    sessionTokenHash,
    nowIso,
  );

  if (session === null) {
    input.clearSessionCookie(context);
    return null;
  }

  await touchSession(input.resolveDatabase(context.env), session.id, nowIso);
  return session;
};

export const resolveAuthenticatedPrincipal = async <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): Promise<AuthenticatedPrincipal | null> => {
  const session = await resolveLegacySessionRecord(context, input);
  const authMethod = input.authMethod ?? 'legacy_magic_link';

  cacheResolvedAuth(context, input, session, authMethod);

  if (session === null) {
    return null;
  }

  return principalFromSession(session, authMethod);
};

export const resolveRequestedTenantContext = async <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): Promise<RequestedTenantContext | null> => {
  const session = await resolveLegacySessionRecord(context, input);
  const authMethod = input.authMethod ?? 'legacy_magic_link';

  cacheResolvedAuth(context, input, session, authMethod);

  if (session === null) {
    return null;
  }

  return requestedTenantFromSession(session);
};

export const createMagicLinkSession = async <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  rawToken: string,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): Promise<AuthenticatedPrincipal | null> => {
  const { addSecondsToIso, generateOpaqueToken, sessionTtlSeconds, setSessionCookie } =
    sessionCreationInput(input);
  const nowIso = new Date().toISOString();
  const db = input.resolveDatabase(context.env);
  const magicTokenHash = await input.sha256Hex(rawToken);
  const token = await findMagicLinkTokenByHash(db, magicTokenHash);

  if (token === null || !isMagicLinkTokenValid(token, nowIso)) {
    return null;
  }

  await markMagicLinkTokenUsed(db, token.id, nowIso);

  const sessionToken = generateOpaqueToken();
  const sessionTokenHash = await input.sha256Hex(sessionToken);
  const session = await createSession(db, {
    tenantId: token.tenantId,
    userId: token.userId,
    sessionTokenHash,
    expiresAt: addSecondsToIso(nowIso, sessionTtlSeconds),
  });

  setSessionCookie(context, sessionToken);
  cacheResolvedAuth(context, input, session, 'legacy_magic_link');
  return principalFromSession(session, 'legacy_magic_link');
};

export const createLtiSession = async <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  sessionInput: LtiSessionInput,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): Promise<AuthenticatedPrincipal> => {
  const { addSecondsToIso, generateOpaqueToken, sessionTtlSeconds, setSessionCookie } =
    sessionCreationInput(input);
  const nowIso = new Date().toISOString();
  const sessionToken = generateOpaqueToken();
  const sessionTokenHash = await input.sha256Hex(sessionToken);
  const session = await createSession(input.resolveDatabase(context.env), {
    tenantId: sessionInput.tenantId,
    userId: sessionInput.userId,
    sessionTokenHash,
    expiresAt: addSecondsToIso(nowIso, sessionTtlSeconds),
  });

  setSessionCookie(context, sessionToken);
  cacheResolvedAuth(context, input, session, 'legacy_lti');
  return principalFromSession(session, 'legacy_lti');
};

export const revokeCurrentSession = async <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): Promise<void> => {
  const sessionToken = input.readSessionToken(context)?.trim();

  if (sessionToken !== undefined && sessionToken.length > 0) {
    const sessionTokenHash = await input.sha256Hex(sessionToken);
    await revokeSessionByHash(
      input.resolveDatabase(context.env),
      sessionTokenHash,
      new Date().toISOString(),
    );
  }

  input.clearSessionCookie(context);
  cacheResolvedAuth(context, input, null, input.authMethod ?? 'legacy_magic_link');
};

export const createLegacyAuthProvider = <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): InternalAuthProvider<ContextType> => {
  return {
    createMagicLinkSession: (context, token) => {
      return createMagicLinkSession(context, token, input);
    },
    createLtiSession: (context, sessionInput) => {
      return createLtiSession(context, sessionInput, input);
    },
    resolveAuthenticatedPrincipal: (context) => {
      return resolveAuthenticatedPrincipal(context, input);
    },
    resolveRequestedTenantContext: (context) => {
      return resolveRequestedTenantContext(context, input);
    },
    revokeCurrentSession: (context) => {
      return revokeCurrentSession(context, input);
    },
  };
};
