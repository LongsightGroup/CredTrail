import {
  findActiveSessionByHash,
  revokeSessionByHash,
  touchSession,
  type SessionRecord,
  type SqlDatabase,
} from '@credtrail/db';
import type { AuthenticatedPrincipal, RequestedTenantContext } from './auth-context';
import type { InternalAuthProvider } from './auth-provider';

export interface LegacyAuthAdapterContext<BindingsType> {
  env: BindingsType;
}

export interface LegacyAuthAdapterInput<
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
> {
  resolveDatabase: (bindings: BindingsType) => SqlDatabase;
  readSessionToken: (context: ContextType) => string | undefined;
  clearSessionCookie: (context: ContextType) => void;
  sha256Hex: (value: string) => Promise<string>;
  authMethod?: AuthenticatedPrincipal['authMethod'];
}

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

  if (session === null) {
    return null;
  }

  return {
    userId: session.userId,
    authSessionId: session.id,
    authMethod: input.authMethod ?? 'legacy_magic_link',
    expiresAt: session.expiresAt,
  };
};

export const resolveRequestedTenantContext = async <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): Promise<RequestedTenantContext | null> => {
  const session = await resolveLegacySessionRecord(context, input);

  if (session === null) {
    return null;
  }

  return {
    tenantId: session.tenantId,
    source: 'legacy_session',
    authoritative: false,
  };
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
};

export const createLegacyAuthProvider = <
  ContextType extends LegacyAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  input: LegacyAuthAdapterInput<ContextType, BindingsType>,
): InternalAuthProvider<ContextType> => {
  return {
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
