import {
  createAuthIdentityLink,
  findAuthIdentityLinkByAuthUserId,
  findAuthIdentityLinkByCredtrailUserId,
  findUserByEmail,
  type SqlDatabase,
} from '@credtrail/db';
import type { AuthenticatedPrincipal, RequestedTenantContext } from './auth-context';
import type {
  InternalAuthProvider,
  RequestMagicLinkInput,
  RequestMagicLinkResult,
} from './auth-provider';

export interface BetterAuthResolvedUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
}

export interface BetterAuthResolvedSession {
  sessionId: string;
  accountId: string | null;
  expiresAt: string;
  user: BetterAuthResolvedUser | null;
}

export interface BetterAuthAdapterContext<BindingsType> {
  env: BindingsType;
}

export interface BetterAuthAdapterInput<
  ContextType extends BetterAuthAdapterContext<BindingsType>,
  BindingsType,
> {
  resolveDatabase: (bindings: BindingsType) => SqlDatabase;
  requestMagicLink: (
    context: ContextType,
    input: RequestMagicLinkInput,
  ) => Promise<RequestMagicLinkResult>;
  createMagicLinkSession?: (
    context: ContextType,
    token: string,
  ) => Promise<BetterAuthResolvedSession | null>;
  resolveSession: (context: ContextType) => Promise<BetterAuthResolvedSession | null>;
  revokeSession: (context: ContextType) => Promise<void>;
  resolveRequestedTenantContext?: (
    context: ContextType,
  ) => Promise<RequestedTenantContext | null>;
  cacheAuthenticatedPrincipal?: (
    context: ContextType,
    principal: AuthenticatedPrincipal | null,
  ) => void;
  cacheRequestedTenantContext?: (
    context: ContextType,
    requestedTenant: RequestedTenantContext | null,
  ) => void;
  authSystem?: string | undefined;
}

const normalizeVerifiedEmail = (
  session: BetterAuthResolvedSession | null,
): string | null => {
  const email = session?.user?.email?.trim();

  if (session?.user?.emailVerified !== true || email === undefined || email.length === 0) {
    return null;
  }

  return email;
};

const resolveCredtrailUserId = async (
  db: SqlDatabase,
  session: BetterAuthResolvedSession,
  authSystem: string,
): Promise<string | null> => {
  const authUserId = session.user?.id?.trim();

  if (authUserId === undefined || authUserId.length === 0) {
    return null;
  }

  const existingLink = await findAuthIdentityLinkByAuthUserId(db, authSystem, authUserId);

  if (existingLink !== null) {
    return existingLink.credtrailUserId;
  }

  const verifiedEmail = normalizeVerifiedEmail(session);

  if (verifiedEmail === null) {
    return null;
  }

  const user = await findUserByEmail(db, verifiedEmail);

  if (user === null) {
    return null;
  }

  const conflictingLink = await findAuthIdentityLinkByCredtrailUserId(db, authSystem, user.id);

  if (conflictingLink !== null && conflictingLink.authUserId !== authUserId) {
    return null;
  }

  await createAuthIdentityLink(db, {
    authSystem,
    authUserId,
    authAccountId: session.accountId,
    credtrailUserId: user.id,
    emailSnapshot: verifiedEmail,
  });

  return user.id;
};

export const resolveAuthenticatedPrincipal = async <
  ContextType extends BetterAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: BetterAuthAdapterInput<ContextType, BindingsType>,
): Promise<AuthenticatedPrincipal | null> => {
  const session = await input.resolveSession(context);

  if (session === null) {
    input.cacheAuthenticatedPrincipal?.(context, null);
    return null;
  }

  const authSessionId = session.sessionId.trim();

  if (authSessionId.length === 0) {
    input.cacheAuthenticatedPrincipal?.(context, null);
    return null;
  }

  const userId = await resolveCredtrailUserId(
    input.resolveDatabase(context.env),
    session,
    input.authSystem ?? 'better_auth',
  );

  if (userId === null) {
    input.cacheAuthenticatedPrincipal?.(context, null);
    return null;
  }

  const principal: AuthenticatedPrincipal = {
    userId,
    authSessionId,
    authMethod: 'better_auth',
    expiresAt: session.expiresAt,
  };

  input.cacheAuthenticatedPrincipal?.(context, principal);
  return principal;
};

export const resolveRequestedTenantContext = async <
  ContextType extends BetterAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: BetterAuthAdapterInput<ContextType, BindingsType>,
): Promise<RequestedTenantContext | null> => {
  const requestedTenant = (await input.resolveRequestedTenantContext?.(context)) ?? null;
  input.cacheRequestedTenantContext?.(context, requestedTenant);
  return requestedTenant;
};

export const revokeCurrentSession = async <
  ContextType extends BetterAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  input: BetterAuthAdapterInput<ContextType, BindingsType>,
): Promise<void> => {
  await input.revokeSession(context);
  input.cacheAuthenticatedPrincipal?.(context, null);
  input.cacheRequestedTenantContext?.(context, null);
};

export const createMagicLinkSession = async <
  ContextType extends BetterAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  context: ContextType,
  token: string,
  input: BetterAuthAdapterInput<ContextType, BindingsType>,
): Promise<AuthenticatedPrincipal | null> => {
  if (input.createMagicLinkSession === undefined) {
    throw new Error('Better Auth magic-link verification is not wired yet');
  }

  const session = await input.createMagicLinkSession(context, token);

  if (session === null) {
    input.cacheAuthenticatedPrincipal?.(context, null);
    return null;
  }

  const authSessionId = session.sessionId.trim();

  if (authSessionId.length === 0) {
    input.cacheAuthenticatedPrincipal?.(context, null);
    return null;
  }

  const userId = await resolveCredtrailUserId(
    input.resolveDatabase(context.env),
    session,
    input.authSystem ?? 'better_auth',
  );

  if (userId === null) {
    input.cacheAuthenticatedPrincipal?.(context, null);
    return null;
  }

  const principal: AuthenticatedPrincipal = {
    userId,
    authSessionId,
    authMethod: 'better_auth',
    expiresAt: session.expiresAt,
  };

  input.cacheAuthenticatedPrincipal?.(context, principal);
  return principal;
};

export const createBetterAuthProvider = <
  ContextType extends BetterAuthAdapterContext<BindingsType>,
  BindingsType,
>(
  input: BetterAuthAdapterInput<ContextType, BindingsType>,
): InternalAuthProvider<ContextType> => {
  return {
    requestMagicLink: (context, request) => {
      return input.requestMagicLink(context, request);
    },
    createMagicLinkSession: (context, token) => {
      return createMagicLinkSession(context, token, input);
    },
    createLtiSession: async () => {
      throw new Error('Better Auth provider does not create LTI sessions');
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

export const createCompositeAuthProvider = <ContextType>(input: {
  primary: InternalAuthProvider<ContextType>;
  fallback: InternalAuthProvider<ContextType>;
  requestMagicLinkProvider?: 'primary' | 'fallback' | undefined;
  createMagicLinkSessionProvider?: 'primary' | 'fallback' | undefined;
  createLtiSessionProvider?: 'primary' | 'fallback' | undefined;
}): InternalAuthProvider<ContextType> => {
  const selectProvider = (preference?: 'primary' | 'fallback'): InternalAuthProvider<ContextType> => {
    return preference === 'fallback' ? input.fallback : input.primary;
  };

  return {
    requestMagicLink: (context, request) => {
      return selectProvider(input.requestMagicLinkProvider).requestMagicLink(context, request);
    },
    createMagicLinkSession: (context, token) => {
      return selectProvider(input.createMagicLinkSessionProvider ?? 'fallback').createMagicLinkSession(
        context,
        token,
      );
    },
    createLtiSession: (context, sessionInput) => {
      return selectProvider(input.createLtiSessionProvider ?? 'fallback').createLtiSession(
        context,
        sessionInput,
      );
    },
    resolveAuthenticatedPrincipal: async (context) => {
      const primaryPrincipal = await input.primary.resolveAuthenticatedPrincipal(context);

      if (primaryPrincipal !== null) {
        return primaryPrincipal;
      }

      return input.fallback.resolveAuthenticatedPrincipal(context);
    },
    resolveRequestedTenantContext: async (context) => {
      const primaryPrincipal = await input.primary.resolveAuthenticatedPrincipal(context);

      if (primaryPrincipal !== null) {
        return input.primary.resolveRequestedTenantContext(context);
      }

      return input.fallback.resolveRequestedTenantContext(context);
    },
    revokeCurrentSession: async (context) => {
      const primaryPrincipal = await input.primary.resolveAuthenticatedPrincipal(context);

      if (primaryPrincipal !== null) {
        await input.primary.revokeCurrentSession(context);
        return;
      }

      await input.fallback.revokeCurrentSession(context);
    },
  };
};
