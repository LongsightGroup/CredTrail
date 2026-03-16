import type { AuthenticatedPrincipal, RequestedTenantContext } from './auth-context';

export interface InternalAuthProvider<ContextType> {
  resolveAuthenticatedPrincipal(context: ContextType): Promise<AuthenticatedPrincipal | null>;
  resolveRequestedTenantContext(context: ContextType): Promise<RequestedTenantContext | null>;
  revokeCurrentSession(context: ContextType): Promise<void>;
}
