import type { AuthenticatedPrincipal, RequestedTenantContext } from './auth-context';

export interface LtiSessionInput {
  tenantId: string;
  userId: string;
}

export interface InternalAuthProvider<ContextType> {
  createMagicLinkSession(
    context: ContextType,
    token: string,
  ): Promise<AuthenticatedPrincipal | null>;
  createLtiSession(
    context: ContextType,
    input: LtiSessionInput,
  ): Promise<AuthenticatedPrincipal>;
  resolveAuthenticatedPrincipal(context: ContextType): Promise<AuthenticatedPrincipal | null>;
  resolveRequestedTenantContext(context: ContextType): Promise<RequestedTenantContext | null>;
  revokeCurrentSession(context: ContextType): Promise<void>;
}
