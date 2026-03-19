export type AuthMethod = "better_auth";

export interface AuthenticatedPrincipal {
  userId: string;
  authSessionId: string;
  authMethod: AuthMethod;
  expiresAt: string;
}

export interface RequestedTenantContext {
  tenantId: string;
  source: "route" | "legacy_session";
  authoritative: boolean;
}

export interface RequestAuthContext {
  principal: AuthenticatedPrincipal | null;
  requestedTenant: RequestedTenantContext | null;
}

export interface AuthContextVariables {
  authenticatedPrincipal: AuthenticatedPrincipal | null | undefined;
  requestedTenantContext: RequestedTenantContext | null | undefined;
}
