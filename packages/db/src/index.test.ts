import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  addLearnerIdentityAlias,
  createTenantAuthProvider,
  createAuthIdentityLink,
  createLearnerProfile,
  findActiveTenantBreakGlassAccountByEmail,
  findTenantAuthPolicy,
  listAccessibleTenantContextsForUser,
  listTenantAuthProviders,
  findLearnerProfileByIdentity,
  findTenantAuthProviderById,
  findAuthIdentityLinkByAuthUserId,
  findAuthIdentityLinkByCredtrailUserId,
  findUserByEmail,
  listTenantBreakGlassAccounts,
  listLearnerIdentitiesByProfile,
  markTenantBreakGlassAccountUsed,
  markTenantBreakGlassEnrollmentEmailSent,
  normalizeLearnerIdentityValue,
  revokeTenantBreakGlassAccount,
  resolveTenantAuthPolicy,
  resolveLearnerProfileForIdentity,
  resolveLearnerProfileFromSaml,
  updateTenantAuthProvider,
  upsertTenantBreakGlassAccount,
  upsertTenantAuthPolicy,
  upsertUserByEmail,
  type LearnerIdentityType,
  type SqlDatabase,
  type SqlExecutionMeta,
  type SqlQueryResult,
  type SqlRunResult,
} from './index';

interface FakeLearnerProfileRow {
  id: string;
  tenant_id: string;
  subject_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface FakeLearnerIdentityRow {
  id: string;
  tenant_id: string;
  learner_profile_id: string;
  identity_type: LearnerIdentityType;
  identity_value: string;
  is_primary: number;
  is_verified: number;
  created_at: string;
  updated_at: string;
}

interface FakeUserRow {
  id: string;
  email: string;
}

interface FakeAuthIdentityLinkRow {
  id: string;
  auth_system: string;
  auth_user_id: string;
  auth_account_id: string | null;
  credtrail_user_id: string;
  email_snapshot: string | null;
  created_at: string;
  updated_at: string;
}

interface FakeTenantAuthPolicyRow {
  tenant_id: string;
  login_mode: 'local' | 'hybrid' | 'sso_required';
  break_glass_enabled: number;
  local_mfa_required: number;
  default_provider_id: string | null;
  enforce_for_roles: 'all_users' | 'admins_only';
  created_at: string;
  updated_at: string;
}

interface FakeTenantAuthProviderRow {
  id: string;
  tenant_id: string;
  protocol: 'oidc' | 'saml';
  label: string;
  enabled: number;
  is_default: number;
  config_json: string;
  created_at: string;
  updated_at: string;
}

interface FakeLegacySamlConfigurationRow {
  tenant_id: string;
  idp_entity_id: string;
  sso_login_url: string;
  idp_certificate_pem: string;
  idp_metadata_url: string | null;
  sp_entity_id: string;
  assertion_consumer_service_url: string;
  name_id_format: string | null;
  enforced: number;
  created_at: string;
  updated_at: string;
}

interface FakeTenantBreakGlassAccountRow {
  tenant_id: string;
  user_id: string;
  created_by_user_id: string | null;
  last_used_at: string | null;
  last_enrollment_email_sent_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FakeTenantRow {
  id: string;
  slug: string;
  display_name: string;
  plan_tier: 'free' | 'team' | 'institution' | 'enterprise';
  is_active: number;
}

interface FakeMembershipRow {
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'issuer' | 'viewer';
}

class FakeStatement {
  private readonly sql: string;
  private readonly db: FakeSqlDatabase;
  private boundParams: unknown[] = [];

  constructor(db: FakeSqlDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...params: unknown[]): this {
    this.boundParams = params;
    return this;
  }

  run(): Promise<SqlRunResult> {
    const normalizedSql = this.normalizedSql();

    if (normalizedSql.includes('INSERT INTO learner_profiles')) {
      this.insertLearnerProfile();
      return Promise.resolve(this.successResult());
    }

    if (normalizedSql.includes('UPDATE learner_identities SET is_primary = 0')) {
      this.clearPrimaryIdentity();
      return Promise.resolve(this.successResult());
    }

    if (normalizedSql.includes('INSERT INTO learner_identities')) {
      this.insertLearnerIdentity();
      return Promise.resolve(this.successResult());
    }

    throw new Error(`Unsupported run SQL in fake DB: ${normalizedSql}`);
  }

  first<T>(): Promise<T | null> {
    const normalizedSql = this.normalizedSql();

    if (normalizedSql.includes('FROM learner_profiles WHERE tenant_id = ? AND id = ?')) {
      return Promise.resolve(this.selectLearnerProfileById() as T | null);
    }

    if (normalizedSql.includes('FROM learner_identities WHERE tenant_id = ? AND id = ?')) {
      return Promise.resolve(this.selectLearnerIdentityById() as T | null);
    }

    if (
      normalizedSql.includes('FROM learner_profiles INNER JOIN learner_identities') &&
      normalizedSql.includes('learner_identities.identity_type = ?') &&
      normalizedSql.includes('learner_identities.is_verified = 1')
    ) {
      return Promise.resolve(this.selectLearnerProfileByVerifiedIdentity() as T | null);
    }

    if (
      normalizedSql.includes('FROM learner_profiles INNER JOIN learner_identities') &&
      normalizedSql.includes('learner_identities.identity_type = ?')
    ) {
      return Promise.resolve(this.selectLearnerProfileByIdentity() as T | null);
    }

    throw new Error(`Unsupported first SQL in fake DB: ${normalizedSql}`);
  }

  all<T>(): Promise<SqlQueryResult<T>> {
    const normalizedSql = this.normalizedSql();

    if (
      normalizedSql.includes('FROM learner_identities') &&
      normalizedSql.includes('learner_profile_id = ?')
    ) {
      const rows = this.selectLearnerIdentitiesByProfile();
      return Promise.resolve({
        ...this.successResult(),
        results: rows as T[],
      });
    }

    throw new Error(`Unsupported all SQL in fake DB: ${normalizedSql}`);
  }

  private normalizedSql(): string {
    return this.sql.replace(/\s+/g, ' ').trim();
  }

  private insertLearnerProfile(): void {
    const [id, tenantId, subjectId, displayName, createdAt, updatedAt] = this.boundParams;

    if (
      typeof id !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof subjectId !== 'string' ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string' ||
      (displayName !== null && typeof displayName !== 'string')
    ) {
      throw new Error('Invalid bound parameters for learner profile insert');
    }

    const duplicateSubject = this.db.learnerProfiles.find((row) => {
      return row.tenant_id === tenantId && row.subject_id === subjectId;
    });

    if (duplicateSubject !== undefined) {
      throw new Error('UNIQUE constraint failed: learner_profiles.tenant_id, learner_profiles.subject_id');
    }

    this.db.learnerProfiles.push({
      id,
      tenant_id: tenantId,
      subject_id: subjectId,
      display_name: displayName,
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }

  private clearPrimaryIdentity(): void {
    const [updatedAt, tenantId, learnerProfileId] = this.boundParams;

    if (
      typeof updatedAt !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof learnerProfileId !== 'string'
    ) {
      throw new Error('Invalid bound parameters for clearing primary identities');
    }

    for (const row of this.db.learnerIdentities) {
      if (row.tenant_id === tenantId && row.learner_profile_id === learnerProfileId && row.is_primary === 1) {
        row.is_primary = 0;
        row.updated_at = updatedAt;
      }
    }
  }

  private insertLearnerIdentity(): void {
    const [
      id,
      tenantId,
      learnerProfileId,
      identityType,
      identityValue,
      isPrimary,
      isVerified,
      createdAt,
      updatedAt,
    ] = this.boundParams;

    if (
      typeof id !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof learnerProfileId !== 'string' ||
      !this.isLearnerIdentityType(identityType) ||
      typeof identityValue !== 'string' ||
      typeof isPrimary !== 'number' ||
      typeof isVerified !== 'number' ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new Error('Invalid bound parameters for learner identity insert');
    }

    const profileExists = this.db.learnerProfiles.some((row) => {
      return row.tenant_id === tenantId && row.id === learnerProfileId;
    });

    if (!profileExists) {
      throw new Error('FOREIGN KEY constraint failed');
    }

    const duplicateIdentity = this.db.learnerIdentities.find((row) => {
      return (
        row.tenant_id === tenantId &&
        row.identity_type === identityType &&
        row.identity_value === identityValue
      );
    });

    if (duplicateIdentity !== undefined) {
      throw new Error(
        'UNIQUE constraint failed: learner_identities.tenant_id, learner_identities.identity_type, learner_identities.identity_value',
      );
    }

    const duplicatePrimary = this.db.learnerIdentities.find((row) => {
      return row.tenant_id === tenantId && row.learner_profile_id === learnerProfileId && row.is_primary === 1;
    });

    if (isPrimary === 1 && duplicatePrimary !== undefined) {
      throw new Error('UNIQUE constraint failed: idx_learner_identities_primary_per_profile');
    }

    this.db.learnerIdentities.push({
      id,
      tenant_id: tenantId,
      learner_profile_id: learnerProfileId,
      identity_type: identityType,
      identity_value: identityValue,
      is_primary: isPrimary,
      is_verified: isVerified,
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }

  private selectLearnerProfileById(): Record<string, unknown> | null {
    const [tenantId, learnerProfileId] = this.boundParams;

    if (typeof tenantId !== 'string' || typeof learnerProfileId !== 'string') {
      throw new Error('Invalid bound parameters for learner profile select by id');
    }

    const row = this.db.learnerProfiles.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.id === learnerProfileId;
    });

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      subjectId: row.subject_id,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private selectLearnerIdentityById(): Record<string, unknown> | null {
    const [tenantId, identityId] = this.boundParams;

    if (typeof tenantId !== 'string' || typeof identityId !== 'string') {
      throw new Error('Invalid bound parameters for learner identity select by id');
    }

    const row = this.db.learnerIdentities.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.id === identityId;
    });

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      learnerProfileId: row.learner_profile_id,
      identityType: row.identity_type,
      identityValue: row.identity_value,
      isPrimary: row.is_primary,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private selectLearnerProfileByIdentity(): Record<string, unknown> | null {
    const [tenantId, identityType, identityValue] = this.boundParams;

    if (
      typeof tenantId !== 'string' ||
      !this.isLearnerIdentityType(identityType) ||
      typeof identityValue !== 'string'
    ) {
      throw new Error('Invalid bound parameters for learner profile select by identity');
    }

    const identity = this.db.learnerIdentities.find((candidate) => {
      return (
        candidate.tenant_id === tenantId &&
        candidate.identity_type === identityType &&
        candidate.identity_value === identityValue
      );
    });

    if (identity === undefined) {
      return null;
    }

    const profile = this.db.learnerProfiles.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.id === identity.learner_profile_id;
    });

    if (profile === undefined) {
      return null;
    }

    return {
      id: profile.id,
      tenantId: profile.tenant_id,
      subjectId: profile.subject_id,
      displayName: profile.display_name,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  private selectLearnerProfileByVerifiedIdentity(): Record<string, unknown> | null {
    const [tenantId, identityType, identityValue] = this.boundParams;

    if (
      typeof tenantId !== 'string' ||
      !this.isLearnerIdentityType(identityType) ||
      typeof identityValue !== 'string'
    ) {
      throw new Error('Invalid bound parameters for verified learner profile select by identity');
    }

    const identity = this.db.learnerIdentities.find((candidate) => {
      return (
        candidate.tenant_id === tenantId &&
        candidate.identity_type === identityType &&
        candidate.identity_value === identityValue &&
        candidate.is_verified === 1
      );
    });

    if (identity === undefined) {
      return null;
    }

    const profile = this.db.learnerProfiles.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.id === identity.learner_profile_id;
    });

    if (profile === undefined) {
      return null;
    }

    return {
      id: profile.id,
      tenantId: profile.tenant_id,
      subjectId: profile.subject_id,
      displayName: profile.display_name,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  private selectLearnerIdentitiesByProfile(): Record<string, unknown>[] {
    const [tenantId, learnerProfileId] = this.boundParams;

    if (typeof tenantId !== 'string' || typeof learnerProfileId !== 'string') {
      throw new Error('Invalid bound parameters for learner identity list by profile');
    }

    return this.db.learnerIdentities
      .filter((candidate) => {
        return candidate.tenant_id === tenantId && candidate.learner_profile_id === learnerProfileId;
      })
      .sort((left, right) => {
        if (left.is_primary !== right.is_primary) {
          return right.is_primary - left.is_primary;
        }

        return left.created_at.localeCompare(right.created_at);
      })
      .map((row) => {
        return {
          id: row.id,
          tenantId: row.tenant_id,
          learnerProfileId: row.learner_profile_id,
          identityType: row.identity_type,
          identityValue: row.identity_value,
          isPrimary: row.is_primary,
          isVerified: row.is_verified,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
  }

  private isLearnerIdentityType(value: unknown): value is LearnerIdentityType {
    return (
      value === 'email' ||
      value === 'email_sha256' ||
      value === 'did' ||
      value === 'url' ||
      value === 'saml_subject'
    );
  }

  private successResult(): SqlRunResult {
    return {
      success: true,
      meta: {} as SqlExecutionMeta,
    };
  }
}

class FakeSqlDatabase {
  learnerProfiles: FakeLearnerProfileRow[] = [];
  learnerIdentities: FakeLearnerIdentityRow[] = [];

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this, sql);
  }
}

const createFakeDb = (): SqlDatabase => {
  return new FakeSqlDatabase() as unknown as SqlDatabase;
};

class FakeAuthIdentityStatement {
  private readonly sql: string;
  private readonly db: FakeAuthIdentitySqlDatabase;
  private boundParams: unknown[] = [];

  constructor(db: FakeAuthIdentitySqlDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...params: unknown[]): this {
    this.boundParams = params;
    return this;
  }

  run(): Promise<SqlRunResult> {
    const normalizedSql = this.normalizedSql();

    if (normalizedSql.includes('INSERT INTO users')) {
      this.insertUser();
      return Promise.resolve(this.successResult());
    }

    if (normalizedSql.includes('INSERT INTO auth_identity_links')) {
      this.insertAuthIdentityLink();
      return Promise.resolve(this.successResult());
    }

    throw new Error(`Unsupported run SQL in fake auth DB: ${normalizedSql}`);
  }

  first<T>(): Promise<T | null> {
    const normalizedSql = this.normalizedSql();

    if (normalizedSql.includes('FROM users WHERE email = ?')) {
      return Promise.resolve(this.selectUserByEmail() as T | null);
    }

    if (normalizedSql.includes('FROM users WHERE id = ?')) {
      return Promise.resolve(this.selectUserById() as T | null);
    }

    if (
      normalizedSql.includes('FROM auth_identity_links') &&
      normalizedSql.includes('auth_system = ?') &&
      normalizedSql.includes('auth_user_id = ?')
    ) {
      return Promise.resolve(this.selectAuthIdentityLinkByAuthUserId() as T | null);
    }

    if (
      normalizedSql.includes('FROM auth_identity_links') &&
      normalizedSql.includes('auth_system = ?') &&
      normalizedSql.includes('credtrail_user_id = ?')
    ) {
      return Promise.resolve(this.selectAuthIdentityLinkByCredtrailUserId() as T | null);
    }

    throw new Error(`Unsupported first SQL in fake auth DB: ${normalizedSql}`);
  }

  all<T>(): Promise<SqlQueryResult<T>> {
    throw new Error(`Unsupported all SQL in fake auth DB: ${this.normalizedSql()}`);
  }

  private normalizedSql(): string {
    return this.sql.replace(/\s+/g, ' ').trim();
  }

  private insertUser(): void {
    const [id, email] = this.boundParams;

    if (typeof id !== 'string' || typeof email !== 'string') {
      throw new Error('Invalid bound parameters for user insert');
    }

    const existingUser = this.db.users.find((row) => row.email === email);

    if (existingUser === undefined) {
      this.db.users.push({
        id,
        email,
      });
    }
  }

  private insertAuthIdentityLink(): void {
    const [
      id,
      authSystem,
      authUserId,
      authAccountId,
      credtrailUserId,
      emailSnapshot,
      createdAt,
      updatedAt,
    ] = this.boundParams;

    if (
      typeof id !== 'string' ||
      typeof authSystem !== 'string' ||
      typeof authUserId !== 'string' ||
      (authAccountId !== null && typeof authAccountId !== 'string') ||
      typeof credtrailUserId !== 'string' ||
      (emailSnapshot !== null && typeof emailSnapshot !== 'string') ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new Error('Invalid bound parameters for auth identity link insert');
    }

    const existingLink = this.db.authIdentityLinks.find((row) => {
      return row.auth_system === authSystem && row.auth_user_id === authUserId;
    });

    if (existingLink !== undefined) {
      throw new Error(
        'UNIQUE constraint failed: auth_identity_links.auth_system, auth_identity_links.auth_user_id',
      );
    }

    this.db.authIdentityLinks.push({
      id,
      auth_system: authSystem,
      auth_user_id: authUserId,
      auth_account_id: authAccountId,
      credtrail_user_id: credtrailUserId,
      email_snapshot: emailSnapshot,
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }

  private selectUserByEmail(): Record<string, unknown> | null {
    const [email] = this.boundParams;

    if (typeof email !== 'string') {
      throw new Error('Invalid bound parameters for user select by email');
    }

    const row = this.db.users.find((candidate) => candidate.email === email);

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
    };
  }

  private selectUserById(): Record<string, unknown> | null {
    const [userId] = this.boundParams;

    if (typeof userId !== 'string') {
      throw new Error('Invalid bound parameters for user select by id');
    }

    const row = this.db.users.find((candidate) => candidate.id === userId);

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
    };
  }

  private selectAuthIdentityLinkByAuthUserId(): Record<string, unknown> | null {
    const [authSystem, authUserId] = this.boundParams;

    if (typeof authSystem !== 'string' || typeof authUserId !== 'string') {
      throw new Error('Invalid bound parameters for auth identity link select by auth user id');
    }

    const row = this.db.authIdentityLinks.find((candidate) => {
      return candidate.auth_system === authSystem && candidate.auth_user_id === authUserId;
    });

    return row === undefined ? null : this.mapAuthIdentityLink(row);
  }

  private selectAuthIdentityLinkByCredtrailUserId(): Record<string, unknown> | null {
    const [authSystem, credtrailUserId] = this.boundParams;

    if (typeof authSystem !== 'string' || typeof credtrailUserId !== 'string') {
      throw new Error(
        'Invalid bound parameters for auth identity link select by CredTrail user id',
      );
    }

    const row = this.db.authIdentityLinks.find((candidate) => {
      return candidate.auth_system === authSystem && candidate.credtrail_user_id === credtrailUserId;
    });

    return row === undefined ? null : this.mapAuthIdentityLink(row);
  }

  private mapAuthIdentityLink(row: FakeAuthIdentityLinkRow): Record<string, unknown> {
    return {
      id: row.id,
      authSystem: row.auth_system,
      authUserId: row.auth_user_id,
      authAccountId: row.auth_account_id,
      credtrailUserId: row.credtrail_user_id,
      emailSnapshot: row.email_snapshot,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private successResult(): SqlRunResult {
    return {
      success: true,
      meta: {} as SqlExecutionMeta,
    };
  }
}

class FakeAuthIdentitySqlDatabase {
  users: FakeUserRow[] = [];
  authIdentityLinks: FakeAuthIdentityLinkRow[] = [];

  prepare(sql: string): FakeAuthIdentityStatement {
    return new FakeAuthIdentityStatement(this, sql);
  }
}

const createFakeAuthIdentityDb = (): SqlDatabase => {
  return new FakeAuthIdentitySqlDatabase() as unknown as SqlDatabase;
};

class FakeTenantAuthStatement {
  private readonly sql: string;
  private readonly db: FakeTenantAuthSqlDatabase;
  private boundParams: unknown[] = [];

  constructor(db: FakeTenantAuthSqlDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...params: unknown[]): this {
    this.boundParams = params;
    return this;
  }

  run(): Promise<SqlRunResult> {
    const normalizedSql = this.normalizedSql();

    if (normalizedSql.includes('INSERT INTO users')) {
      this.insertUser();
      return Promise.resolve(this.successResult(1));
    }

    if (normalizedSql.includes('INSERT INTO tenant_auth_policies')) {
      return Promise.resolve(this.upsertTenantAuthPolicy());
    }

    if (
      normalizedSql.includes('UPDATE tenant_auth_providers') &&
      normalizedSql.includes('SET is_default = 0') &&
      normalizedSql.includes('AND id <> ?')
    ) {
      return Promise.resolve(this.clearOtherDefaultProviders());
    }

    if (
      normalizedSql.includes('UPDATE tenant_auth_providers') &&
      normalizedSql.includes('SET is_default = 0')
    ) {
      return Promise.resolve(this.clearTenantDefaultProviders());
    }

    if (normalizedSql.includes('INSERT INTO tenant_auth_providers')) {
      return Promise.resolve(this.insertTenantAuthProvider());
    }

    if (
      normalizedSql.includes('UPDATE tenant_auth_providers') &&
      normalizedSql.includes('SET protocol = ?')
    ) {
      return Promise.resolve(this.updateTenantAuthProvider());
    }

    if (normalizedSql.includes('DELETE FROM tenant_auth_providers')) {
      return Promise.resolve(this.deleteTenantAuthProvider());
    }

    if (
      normalizedSql.includes('UPDATE tenant_auth_policies') &&
      normalizedSql.includes('SET default_provider_id = NULL')
    ) {
      return Promise.resolve(this.clearPolicyDefaultProvider());
    }

    if (normalizedSql.includes('INSERT INTO tenant_break_glass_accounts')) {
      return Promise.resolve(this.upsertTenantBreakGlassAccount());
    }

    if (
      normalizedSql.includes('UPDATE tenant_break_glass_accounts') &&
      normalizedSql.includes('SET revoked_at = ?')
    ) {
      return Promise.resolve(this.revokeTenantBreakGlassAccount());
    }

    if (
      normalizedSql.includes('UPDATE tenant_break_glass_accounts') &&
      normalizedSql.includes('SET last_used_at = ?')
    ) {
      return Promise.resolve(this.markTenantBreakGlassAccountUsed());
    }

    if (
      normalizedSql.includes('UPDATE tenant_break_glass_accounts') &&
      normalizedSql.includes('SET last_enrollment_email_sent_at = ?')
    ) {
      return Promise.resolve(this.markTenantBreakGlassEnrollmentEmailSent());
    }

    throw new Error(`Unsupported run SQL in fake tenant auth DB: ${normalizedSql}`);
  }

  first<T>(): Promise<T | null> {
    const normalizedSql = this.normalizedSql();

    if (normalizedSql.includes('FROM users WHERE email = ?')) {
      return Promise.resolve(this.selectUserByEmail() as T | null);
    }

    if (normalizedSql.includes('FROM users WHERE id = ?')) {
      return Promise.resolve(this.selectUserById() as T | null);
    }

    if (normalizedSql.includes('FROM tenant_auth_policies')) {
      return Promise.resolve(this.selectTenantAuthPolicy() as T | null);
    }

    if (
      normalizedSql.includes('FROM tenant_auth_providers') &&
      normalizedSql.includes('AND id = ?')
    ) {
      return Promise.resolve(this.selectTenantAuthProviderById() as T | null);
    }

    if (normalizedSql.includes('FROM tenant_sso_saml_configurations')) {
      return Promise.resolve(this.selectLegacySamlConfiguration() as T | null);
    }

    if (
      normalizedSql.includes('FROM tenant_break_glass_accounts AS account') &&
      normalizedSql.includes('account.user_id = ?')
    ) {
      return Promise.resolve(this.selectTenantBreakGlassAccountByUserId() as T | null);
    }

    if (
      normalizedSql.includes('FROM tenant_break_glass_accounts AS account') &&
      normalizedSql.includes('users.email = ?')
    ) {
      return Promise.resolve(this.selectTenantBreakGlassAccountByEmail() as T | null);
    }

    throw new Error(`Unsupported first SQL in fake tenant auth DB: ${normalizedSql}`);
  }

  all<T>(): Promise<SqlQueryResult<T>> {
    const normalizedSql = this.normalizedSql();

    if (normalizedSql.includes('FROM tenant_auth_providers')) {
      return Promise.resolve({
        ...this.successResult(),
        results: this.selectTenantAuthProviders() as T[],
      });
    }

    if (normalizedSql.includes('FROM tenant_break_glass_accounts AS account')) {
      return Promise.resolve({
        ...this.successResult(),
        results: this.selectTenantBreakGlassAccounts() as T[],
      });
    }

    if (
      normalizedSql.includes('FROM memberships') &&
      normalizedSql.includes('INNER JOIN tenants') &&
      normalizedSql.includes('tenants.is_active = 1')
    ) {
      return Promise.resolve({
        ...this.successResult(),
        results: this.selectAccessibleTenantContexts() as T[],
      });
    }

    throw new Error(`Unsupported all SQL in fake tenant auth DB: ${normalizedSql}`);
  }

  private normalizedSql(): string {
    return this.sql.replace(/\s+/g, ' ').trim();
  }

  private insertUser(): void {
    const [id, email] = this.boundParams;

    if (typeof id !== 'string' || typeof email !== 'string') {
      throw new Error('Invalid bound parameters for user insert');
    }

    const existingUser = this.db.users.find((row) => row.email === email);

    if (existingUser === undefined) {
      this.db.users.push({
        id,
        email,
      });
    }
  }

  private upsertTenantAuthPolicy(): SqlRunResult {
    const [
      tenantId,
      loginMode,
      breakGlassEnabled,
      localMfaRequired,
      defaultProviderId,
      enforceForRoles,
      createdAt,
      updatedAt,
    ] = this.boundParams;

    if (
      typeof tenantId !== 'string' ||
      (loginMode !== 'local' && loginMode !== 'hybrid' && loginMode !== 'sso_required') ||
      typeof breakGlassEnabled !== 'number' ||
      typeof localMfaRequired !== 'number' ||
      (defaultProviderId !== null && typeof defaultProviderId !== 'string') ||
      (enforceForRoles !== 'all_users' && enforceForRoles !== 'admins_only') ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new Error('Invalid bound parameters for tenant auth policy upsert');
    }

    const existingPolicy = this.db.tenantAuthPolicies.find((row) => row.tenant_id === tenantId);

    if (existingPolicy === undefined) {
      this.db.tenantAuthPolicies.push({
        tenant_id: tenantId,
        login_mode: loginMode,
        break_glass_enabled: breakGlassEnabled,
        local_mfa_required: localMfaRequired,
        default_provider_id: defaultProviderId,
        enforce_for_roles: enforceForRoles,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return this.successResult(1);
    }

    existingPolicy.login_mode = loginMode;
    existingPolicy.break_glass_enabled = breakGlassEnabled;
    existingPolicy.local_mfa_required = localMfaRequired;
    existingPolicy.default_provider_id = defaultProviderId;
    existingPolicy.enforce_for_roles = enforceForRoles;
    existingPolicy.updated_at = updatedAt;
    return this.successResult(1);
  }

  private clearOtherDefaultProviders(): SqlRunResult {
    const [updatedAt, tenantId, providerId] = this.boundParams;

    if (
      typeof updatedAt !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof providerId !== 'string'
    ) {
      throw new Error('Invalid bound parameters for clearing tenant auth default providers');
    }

    let rowsWritten = 0;

    for (const row of this.db.tenantAuthProviders) {
      if (row.tenant_id === tenantId && row.id !== providerId && row.is_default === 1) {
        row.is_default = 0;
        row.updated_at = updatedAt;
        rowsWritten += 1;
      }
    }

    return this.successResult(rowsWritten);
  }

  private clearTenantDefaultProviders(): SqlRunResult {
    const [updatedAt, tenantId] = this.boundParams;

    if (typeof updatedAt !== 'string' || typeof tenantId !== 'string') {
      throw new Error('Invalid bound parameters for clearing tenant auth defaults');
    }

    let rowsWritten = 0;

    for (const row of this.db.tenantAuthProviders) {
      if (row.tenant_id === tenantId && row.is_default === 1) {
        row.is_default = 0;
        row.updated_at = updatedAt;
        rowsWritten += 1;
      }
    }

    return this.successResult(rowsWritten);
  }

  private insertTenantAuthProvider(): SqlRunResult {
    const [id, tenantId, protocol, label, enabled, isDefault, configJson, createdAt, updatedAt] =
      this.boundParams;

    if (
      typeof id !== 'string' ||
      typeof tenantId !== 'string' ||
      (protocol !== 'oidc' && protocol !== 'saml') ||
      typeof label !== 'string' ||
      typeof enabled !== 'number' ||
      typeof isDefault !== 'number' ||
      typeof configJson !== 'string' ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new Error('Invalid bound parameters for tenant auth provider insert');
    }

    this.db.tenantAuthProviders.push({
      id,
      tenant_id: tenantId,
      protocol,
      label,
      enabled,
      is_default: isDefault,
      config_json: configJson,
      created_at: createdAt,
      updated_at: updatedAt,
    });

    return this.successResult(1);
  }

  private updateTenantAuthProvider(): SqlRunResult {
    const [protocol, label, enabled, isDefault, configJson, updatedAt, tenantId, providerId] =
      this.boundParams;

    if (
      (protocol !== 'oidc' && protocol !== 'saml') ||
      typeof label !== 'string' ||
      typeof enabled !== 'number' ||
      typeof isDefault !== 'number' ||
      typeof configJson !== 'string' ||
      typeof updatedAt !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof providerId !== 'string'
    ) {
      throw new Error('Invalid bound parameters for tenant auth provider update');
    }

    const row = this.db.tenantAuthProviders.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.id === providerId;
    });

    if (row === undefined) {
      return this.successResult(0);
    }

    row.protocol = protocol;
    row.label = label;
    row.enabled = enabled;
    row.is_default = isDefault;
    row.config_json = configJson;
    row.updated_at = updatedAt;

    return this.successResult(1);
  }

  private deleteTenantAuthProvider(): SqlRunResult {
    const [tenantId, providerId] = this.boundParams;

    if (typeof tenantId !== 'string' || typeof providerId !== 'string') {
      throw new Error('Invalid bound parameters for tenant auth provider delete');
    }

    const beforeCount = this.db.tenantAuthProviders.length;
    this.db.tenantAuthProviders = this.db.tenantAuthProviders.filter((row) => {
      return !(row.tenant_id === tenantId && row.id === providerId);
    });

    return this.successResult(beforeCount - this.db.tenantAuthProviders.length);
  }

  private clearPolicyDefaultProvider(): SqlRunResult {
    const [updatedAt, tenantId, providerId] = this.boundParams;

    if (
      typeof updatedAt !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof providerId !== 'string'
    ) {
      throw new Error('Invalid bound parameters for clearing auth policy default provider');
    }

    let rowsWritten = 0;

    for (const row of this.db.tenantAuthPolicies) {
      if (row.tenant_id === tenantId && row.default_provider_id === providerId) {
        row.default_provider_id = null;
        row.updated_at = updatedAt;
        rowsWritten += 1;
      }
    }

    return this.successResult(rowsWritten);
  }

  private upsertTenantBreakGlassAccount(): SqlRunResult {
    const [tenantId, userId, createdByUserId, lastEnrollmentEmailSentAt, createdAt, updatedAt] =
      this.boundParams;

    if (
      typeof tenantId !== 'string' ||
      typeof userId !== 'string' ||
      (createdByUserId !== null && typeof createdByUserId !== 'string') ||
      (lastEnrollmentEmailSentAt !== null && typeof lastEnrollmentEmailSentAt !== 'string') ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new Error('Invalid bound parameters for tenant break-glass account upsert');
    }

    const existing = this.db.tenantBreakGlassAccounts.find((row) => {
      return row.tenant_id === tenantId && row.user_id === userId;
    });

    if (existing === undefined) {
      this.db.tenantBreakGlassAccounts.push({
        tenant_id: tenantId,
        user_id: userId,
        created_by_user_id: createdByUserId,
        last_used_at: null,
        last_enrollment_email_sent_at: lastEnrollmentEmailSentAt,
        revoked_at: null,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return this.successResult(1);
    }

    existing.created_by_user_id = createdByUserId;
    existing.last_enrollment_email_sent_at =
      lastEnrollmentEmailSentAt ?? existing.last_enrollment_email_sent_at;
    existing.revoked_at = null;
    existing.updated_at = updatedAt;
    return this.successResult(1);
  }

  private revokeTenantBreakGlassAccount(): SqlRunResult {
    const [revokedAt, updatedAt, tenantId, userId] = this.boundParams;

    if (
      typeof revokedAt !== 'string' ||
      typeof updatedAt !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof userId !== 'string'
    ) {
      throw new Error('Invalid bound parameters for tenant break-glass revoke');
    }

    const row = this.db.tenantBreakGlassAccounts.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.user_id === userId && candidate.revoked_at === null;
    });

    if (row === undefined) {
      return this.successResult(0);
    }

    row.revoked_at = revokedAt;
    row.updated_at = updatedAt;
    return this.successResult(1);
  }

  private markTenantBreakGlassAccountUsed(): SqlRunResult {
    const [usedAt, updatedAt, tenantId, userId] = this.boundParams;

    if (
      typeof usedAt !== 'string' ||
      typeof updatedAt !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof userId !== 'string'
    ) {
      throw new Error('Invalid bound parameters for tenant break-glass usage');
    }

    const row = this.db.tenantBreakGlassAccounts.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.user_id === userId;
    });

    if (row === undefined) {
      return this.successResult(0);
    }

    row.last_used_at = usedAt;
    row.updated_at = updatedAt;
    return this.successResult(1);
  }

  private markTenantBreakGlassEnrollmentEmailSent(): SqlRunResult {
    const [sentAt, updatedAt, tenantId, userId] = this.boundParams;

    if (
      typeof sentAt !== 'string' ||
      typeof updatedAt !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof userId !== 'string'
    ) {
      throw new Error('Invalid bound parameters for break-glass enrollment email mark');
    }

    const row = this.db.tenantBreakGlassAccounts.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.user_id === userId;
    });

    if (row === undefined) {
      return this.successResult(0);
    }

    row.last_enrollment_email_sent_at = sentAt;
    row.updated_at = updatedAt;
    return this.successResult(1);
  }

  private selectUserByEmail(): Record<string, unknown> | null {
    const [email] = this.boundParams;

    if (typeof email !== 'string') {
      throw new Error('Invalid bound parameters for user select by email');
    }

    const row = this.db.users.find((candidate) => candidate.email === email);

    return row === undefined
      ? null
      : {
          id: row.id,
          email: row.email,
        };
  }

  private selectUserById(): Record<string, unknown> | null {
    const [userId] = this.boundParams;

    if (typeof userId !== 'string') {
      throw new Error('Invalid bound parameters for user select by id');
    }

    const row = this.db.users.find((candidate) => candidate.id === userId);

    return row === undefined
      ? null
      : {
          id: row.id,
          email: row.email,
        };
  }

  private selectTenantAuthPolicy(): Record<string, unknown> | null {
    const [tenantId] = this.boundParams;

    if (typeof tenantId !== 'string') {
      throw new Error('Invalid bound parameters for tenant auth policy select');
    }

    const row = this.db.tenantAuthPolicies.find((candidate) => candidate.tenant_id === tenantId);

    if (row === undefined) {
      return null;
    }

    return {
      tenantId: row.tenant_id,
      loginMode: row.login_mode,
      breakGlassEnabled: row.break_glass_enabled,
      localMfaRequired: row.local_mfa_required,
      defaultProviderId: row.default_provider_id,
      enforceForRoles: row.enforce_for_roles,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private selectTenantAuthProviders(): Record<string, unknown>[] {
    const [tenantId] = this.boundParams;

    if (typeof tenantId !== 'string') {
      throw new Error('Invalid bound parameters for tenant auth provider list');
    }

    return this.db.tenantAuthProviders
      .filter((row) => row.tenant_id === tenantId)
      .sort((left, right) => {
        if (left.is_default !== right.is_default) {
          return right.is_default - left.is_default;
        }

        return left.id.localeCompare(right.id);
      })
      .map((row) => this.mapTenantAuthProvider(row));
  }

  private selectTenantAuthProviderById(): Record<string, unknown> | null {
    const [tenantId, providerId] = this.boundParams;

    if (typeof tenantId !== 'string' || typeof providerId !== 'string') {
      throw new Error('Invalid bound parameters for tenant auth provider lookup');
    }

    const row = this.db.tenantAuthProviders.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.id === providerId;
    });

    return row === undefined ? null : this.mapTenantAuthProvider(row);
  }

  private selectLegacySamlConfiguration(): Record<string, unknown> | null {
    const [tenantId] = this.boundParams;

    if (typeof tenantId !== 'string') {
      throw new Error('Invalid bound parameters for legacy SAML configuration lookup');
    }

    const row = this.db.legacySamlConfigurations.find((candidate) => candidate.tenant_id === tenantId);

    if (row === undefined) {
      return null;
    }

    return {
      tenantId: row.tenant_id,
      idpEntityId: row.idp_entity_id,
      ssoLoginUrl: row.sso_login_url,
      idpCertificatePem: row.idp_certificate_pem,
      idpMetadataUrl: row.idp_metadata_url,
      spEntityId: row.sp_entity_id,
      assertionConsumerServiceUrl: row.assertion_consumer_service_url,
      nameIdFormat: row.name_id_format,
      enforced: row.enforced,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private selectTenantBreakGlassAccountByUserId(): Record<string, unknown> | null {
    const [tenantId, userId] = this.boundParams;

    if (typeof tenantId !== 'string' || typeof userId !== 'string') {
      throw new Error('Invalid bound parameters for tenant break-glass lookup by user');
    }

    const row = this.db.tenantBreakGlassAccounts.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.user_id === userId && candidate.revoked_at === null;
    });

    return row === undefined ? null : this.mapTenantBreakGlassAccount(row);
  }

  private selectTenantBreakGlassAccountByEmail(): Record<string, unknown> | null {
    const [tenantId, email] = this.boundParams;

    if (typeof tenantId !== 'string' || typeof email !== 'string') {
      throw new Error('Invalid bound parameters for tenant break-glass lookup by email');
    }

    const user = this.db.users.find((candidate) => candidate.email === email);

    if (user === undefined) {
      return null;
    }

    const row = this.db.tenantBreakGlassAccounts.find((candidate) => {
      return candidate.tenant_id === tenantId && candidate.user_id === user.id && candidate.revoked_at === null;
    });

    return row === undefined ? null : this.mapTenantBreakGlassAccount(row);
  }

  private mapTenantAuthProvider(row: FakeTenantAuthProviderRow): Record<string, unknown> {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      protocol: row.protocol,
      label: row.label,
      enabled: row.enabled,
      isDefault: row.is_default,
      configJson: row.config_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private selectTenantBreakGlassAccounts(): Record<string, unknown>[] {
    const [tenantId] = this.boundParams;

    if (typeof tenantId !== 'string') {
      throw new Error('Invalid bound parameters for tenant break-glass list');
    }

    return this.db.tenantBreakGlassAccounts
      .filter((row) => row.tenant_id === tenantId)
      .map((row) => this.mapTenantBreakGlassAccount(row));
  }

  private mapTenantBreakGlassAccount(row: FakeTenantBreakGlassAccountRow): Record<string, unknown> {
    const user = this.db.users.find((candidate) => candidate.id === row.user_id);
    const betterAuthUser = user
      ? this.db.betterAuthUsers.find((candidate) => candidate.email === user.email)
      : undefined;
    const betterAuthAccount =
      betterAuthUser === undefined
        ? undefined
        : this.db.betterAuthAccounts.find((candidate) => {
            return candidate.user_id === betterAuthUser.id && candidate.provider_id === 'credential';
          });

    return {
      tenantId: row.tenant_id,
      userId: row.user_id,
      email: user?.email ?? '',
      createdByUserId: row.created_by_user_id,
      lastUsedAt: row.last_used_at,
      lastEnrollmentEmailSentAt: row.last_enrollment_email_sent_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      betterAuthUserId: betterAuthUser?.id ?? null,
      localCredentialEnabled: betterAuthAccount?.password ? 1 : 0,
      twoFactorEnabled: betterAuthUser?.two_factor_enabled ?? 0,
    };
  }

  private selectAccessibleTenantContexts(): Record<string, unknown>[] {
    const [userId] = this.boundParams;

    if (typeof userId !== 'string') {
      throw new Error('Invalid bound parameters for accessible tenant context list');
    }

    return this.db.memberships
      .filter((membership) => membership.user_id === userId)
      .map((membership) => {
        const tenant = this.db.tenants.find((candidate) => {
          return candidate.id === membership.tenant_id && candidate.is_active === 1;
        });

        if (tenant === undefined) {
          return null;
        }

        return {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantDisplayName: tenant.display_name,
          tenantPlanTier: tenant.plan_tier,
          membershipRole: membership.role,
        };
      })
      .filter((row): row is Record<string, unknown> => row !== null)
      .sort((left, right) => {
        const byName = String(left.tenantDisplayName).localeCompare(String(right.tenantDisplayName));

        if (byName !== 0) {
          return byName;
        }

        return String(left.tenantSlug).localeCompare(String(right.tenantSlug));
      });
  }

  private successResult(rowsWritten = 0): SqlRunResult {
    return {
      success: true,
      meta: {
        rowsWritten,
      } as SqlExecutionMeta,
    };
  }
}

class FakeTenantAuthSqlDatabase {
  users: FakeUserRow[] = [];
  tenantAuthPolicies: FakeTenantAuthPolicyRow[] = [];
  tenantAuthProviders: FakeTenantAuthProviderRow[] = [];
  tenantBreakGlassAccounts: FakeTenantBreakGlassAccountRow[] = [];
  legacySamlConfigurations: FakeLegacySamlConfigurationRow[] = [];
  tenants: FakeTenantRow[] = [];
  memberships: FakeMembershipRow[] = [];
  betterAuthUsers: Array<{
    id: string;
    email: string;
    two_factor_enabled: number;
  }> = [];
  betterAuthAccounts: Array<{
    user_id: string;
    provider_id: string;
    password: string | null;
  }> = [];

  prepare(sql: string): FakeTenantAuthStatement {
    return new FakeTenantAuthStatement(this, sql);
  }
}

const createFakeTenantAuthDb = (): SqlDatabase => {
  return new FakeTenantAuthSqlDatabase() as unknown as SqlDatabase;
};

describe('normalizeLearnerIdentityValue', () => {
  it('normalizes email and email_sha256 identity values', () => {
    expect(normalizeLearnerIdentityValue('email', '  Student@Umich.edu ')).toBe('student@umich.edu');
    expect(normalizeLearnerIdentityValue('email_sha256', ' AABBCC ')).toBe('aabbcc');
  });
});

describe('learner profiles and identity aliases', () => {
  it('creates a learner profile and resolves it by normalized primary identity', async () => {
    const db = createFakeDb();
    const profile = await createLearnerProfile(db, {
      tenantId: 'tenant_umich',
      displayName: 'Jane Doe',
      primaryIdentityType: 'email',
      primaryIdentityValue: ' Jane.Doe@Umich.edu ',
      primaryIdentityVerified: true,
    });

    expect(profile.tenantId).toBe('tenant_umich');
    expect(profile.displayName).toBe('Jane Doe');
    expect(profile.subjectId.startsWith('urn:credtrail:learner:tenant_umich:')).toBe(true);

    const resolved = await findLearnerProfileByIdentity(db, {
      tenantId: 'tenant_umich',
      identityType: 'email',
      identityValue: 'jane.doe@umich.edu',
    });

    expect(resolved?.id).toBe(profile.id);

    const identities = await listLearnerIdentitiesByProfile(db, 'tenant_umich', profile.id);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.isPrimary).toBe(true);
    expect(identities[0]?.isVerified).toBe(true);
    expect(identities[0]?.identityValue).toBe('jane.doe@umich.edu');
  });

  it('links new aliases to the same learner and switches primary identity when requested', async () => {
    const db = createFakeDb();
    const profile = await createLearnerProfile(db, {
      tenantId: 'tenant_umich',
      primaryIdentityType: 'email',
      primaryIdentityValue: 'student@umich.edu',
      primaryIdentityVerified: true,
    });

    await addLearnerIdentityAlias(db, {
      tenantId: 'tenant_umich',
      learnerProfileId: profile.id,
      identityType: 'email',
      identityValue: 'student@gmail.com',
      isPrimary: true,
      isVerified: true,
    });

    const oldIdentityResolved = await findLearnerProfileByIdentity(db, {
      tenantId: 'tenant_umich',
      identityType: 'email',
      identityValue: 'student@umich.edu',
    });
    const newIdentityResolved = await findLearnerProfileByIdentity(db, {
      tenantId: 'tenant_umich',
      identityType: 'email',
      identityValue: 'student@gmail.com',
    });

    expect(oldIdentityResolved?.id).toBe(profile.id);
    expect(newIdentityResolved?.id).toBe(profile.id);

    const identities = await listLearnerIdentitiesByProfile(db, 'tenant_umich', profile.id);
    expect(identities).toHaveLength(2);
    expect(identities[0]?.identityValue).toBe('student@gmail.com');
    expect(identities[0]?.isPrimary).toBe(true);
    expect(identities[1]?.identityValue).toBe('student@umich.edu');
    expect(identities[1]?.isPrimary).toBe(false);
  });

  it('prevents duplicate identity aliases within a tenant', async () => {
    const db = createFakeDb();
    const firstProfile = await createLearnerProfile(db, {
      tenantId: 'tenant_umich',
      primaryIdentityType: 'email',
      primaryIdentityValue: 'first@umich.edu',
    });
    const secondProfile = await createLearnerProfile(db, {
      tenantId: 'tenant_umich',
      primaryIdentityType: 'email',
      primaryIdentityValue: 'second@umich.edu',
    });

    expect(firstProfile.id).not.toBe(secondProfile.id);

    await expect(
      addLearnerIdentityAlias(db, {
        tenantId: 'tenant_umich',
        learnerProfileId: secondProfile.id,
        identityType: 'email',
        identityValue: 'first@umich.edu',
      }),
    ).rejects.toThrow('UNIQUE constraint failed');
  });

  it('resolves to existing learner profile for repeated identity values', async () => {
    const db = createFakeDb();
    const first = await resolveLearnerProfileForIdentity(db, {
      tenantId: 'tenant_umich',
      identityType: 'email',
      identityValue: 'student@umich.edu',
    });
    const second = await resolveLearnerProfileForIdentity(db, {
      tenantId: 'tenant_umich',
      identityType: 'email',
      identityValue: 'student@umich.edu',
    });

    expect(second.id).toBe(first.id);
    const identities = await listLearnerIdentitiesByProfile(db, 'tenant_umich', first.id);
    expect(identities).toHaveLength(1);
  });
});

describe('resolveLearnerProfileFromSaml', () => {
  it('falls back to verified email and links new SAML subject when subject changes', async () => {
    const db = createFakeDb();
    const profile = await createLearnerProfile(db, {
      tenantId: 'tenant_umich',
      primaryIdentityType: 'email',
      primaryIdentityValue: 'student@umich.edu',
      primaryIdentityVerified: true,
    });

    const resolvedFromFallback = await resolveLearnerProfileFromSaml(db, {
      tenantId: 'tenant_umich',
      samlSubject: 'umich-subject-123',
      email: 'student@umich.edu',
    });

    expect(resolvedFromFallback.strategy).toBe('verified_email');
    expect(resolvedFromFallback.profile.id).toBe(profile.id);

    const resolvedBySaml = await resolveLearnerProfileFromSaml(db, {
      tenantId: 'tenant_umich',
      samlSubject: 'umich-subject-123',
      email: 'another-email@umich.edu',
    });

    expect(resolvedBySaml.strategy).toBe('saml_subject');
    expect(resolvedBySaml.profile.id).toBe(profile.id);

    const identities = await listLearnerIdentitiesByProfile(db, 'tenant_umich', profile.id);
    expect(identities.map((entry) => entry.identityType)).toEqual(['saml_subject', 'email']);
    expect(identities[0]?.isPrimary).toBe(true);
    expect(identities[1]?.isPrimary).toBe(false);
  });

  it('creates a new profile when no existing SAML or verified email identity exists', async () => {
    const db = createFakeDb();
    const resolved = await resolveLearnerProfileFromSaml(db, {
      tenantId: 'tenant_umich',
      samlSubject: 'umich-subject-999',
      email: 'new.student@gmail.com',
      displayName: 'New Student',
    });

    expect(resolved.strategy).toBe('created');
    expect(resolved.profile.displayName).toBe('New Student');

    const identities = await listLearnerIdentitiesByProfile(db, 'tenant_umich', resolved.profile.id);
    expect(identities).toHaveLength(2);
    expect(identities[0]?.identityType).toBe('saml_subject');
    expect(identities[1]?.identityType).toBe('email');
    expect(identities[1]?.isVerified).toBe(true);
  });

  it('fails when neither SAML subject nor email is provided', async () => {
    const db = createFakeDb();

    await expect(
      resolveLearnerProfileFromSaml(db, {
        tenantId: 'tenant_umich',
      }),
    ).rejects.toThrow('Cannot resolve learner profile without SAML subject or email');
  });
});

describe('auth identity links', () => {
  it('persists and resolves Better Auth links by auth system and auth user id', async () => {
    const db = createFakeAuthIdentityDb();
    const user = await upsertUserByEmail(db, ' Student@Example.edu ');

    const link = await createAuthIdentityLink(db, {
      authSystem: 'better_auth',
      authUserId: 'ba_usr_123',
      authAccountId: 'ba_account_123',
      credtrailUserId: user.id,
      emailSnapshot: 'student@example.edu',
    });

    const resolvedByAuthUser = await findAuthIdentityLinkByAuthUserId(
      db,
      'better_auth',
      'ba_usr_123',
    );
    const resolvedByCredtrailUser = await findAuthIdentityLinkByCredtrailUserId(
      db,
      'better_auth',
      user.id,
    );
    const resolvedUser = await findUserByEmail(db, 'student@example.edu');

    expect(resolvedByAuthUser).toEqual(link);
    expect(resolvedByCredtrailUser).toEqual(link);
    expect(resolvedUser).toEqual(user);
    expect(link.emailSnapshot).toBe('student@example.edu');
  });
});

describe('tenant auth policy and provider helpers', () => {
  it('resolves local auth policy defaults when no tenant auth policy exists', async () => {
    const db = createFakeTenantAuthDb();

    const policy = await resolveTenantAuthPolicy(db, 'tenant_123');

    expect(policy).toEqual({
      tenantId: 'tenant_123',
      loginMode: 'local',
      breakGlassEnabled: false,
      localMfaRequired: false,
      defaultProviderId: null,
      enforceForRoles: 'all_users',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('persists and updates tenant auth policy state', async () => {
    const db = createFakeTenantAuthDb();

    const created = await upsertTenantAuthPolicy(db, {
      tenantId: 'tenant_123',
      loginMode: 'hybrid',
      breakGlassEnabled: true,
      localMfaRequired: true,
      defaultProviderId: 'tap_oidc',
      enforceForRoles: 'admins_only',
    });
    const resolved = await findTenantAuthPolicy(db, 'tenant_123');

    expect(created.loginMode).toBe('hybrid');
    expect(created.breakGlassEnabled).toBe(true);
    expect(created.localMfaRequired).toBe(true);
    expect(created.defaultProviderId).toBe('tap_oidc');
    expect(created.enforceForRoles).toBe('admins_only');
    expect(resolved).toEqual(created);
  });

  it('keeps exactly one default auth provider per tenant when providers are created or updated', async () => {
    const db = createFakeTenantAuthDb();

    await createTenantAuthProvider(db, {
      id: 'tap_oidc',
      tenantId: 'tenant_123',
      protocol: 'oidc',
      label: 'Campus OIDC',
      enabled: true,
      isDefault: true,
      configJson: '{"issuer":"https://idp.example.edu"}',
    });
    await createTenantAuthProvider(db, {
      id: 'tap_saml',
      tenantId: 'tenant_123',
      protocol: 'saml',
      label: 'Campus SAML',
      enabled: true,
      isDefault: false,
      configJson: '{"ssoLoginUrl":"https://idp.example.edu/sso"}',
    });

    const updated = await updateTenantAuthProvider(db, {
      tenantId: 'tenant_123',
      providerId: 'tap_saml',
      protocol: 'saml',
      label: 'Campus SAML',
      enabled: false,
      isDefault: true,
      configJson: '{"ssoLoginUrl":"https://idp.example.edu/sso"}',
    });
    const providers = await listTenantAuthProviders(db, 'tenant_123');

    expect(updated?.isDefault).toBe(true);
    expect(updated?.enabled).toBe(false);
    expect(providers).toHaveLength(2);
    expect(providers.find((provider) => provider.id === 'tap_saml')?.isDefault).toBe(true);
    expect(providers.find((provider) => provider.id === 'tap_oidc')?.isDefault).toBe(false);

    const samlProvider = await findTenantAuthProviderById(db, 'tenant_123', 'tap_saml');
    expect(samlProvider?.enabled).toBe(false);
  });

  it('bridges legacy SAML configuration into the provider and policy model', async () => {
    const db = createFakeTenantAuthDb();
    const tenantAuthDb = db as unknown as FakeTenantAuthSqlDatabase;

    tenantAuthDb.legacySamlConfigurations.push({
      tenant_id: 'tenant_legacy',
      idp_entity_id: 'https://idp.example.edu/entity',
      sso_login_url: 'https://idp.example.edu/sso/login',
      idp_certificate_pem: '-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----',
      idp_metadata_url: 'https://idp.example.edu/metadata',
      sp_entity_id: 'https://credtrail.example.edu/saml/sp',
      assertion_consumer_service_url: 'https://credtrail.example.edu/saml/acs',
      name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      enforced: 1,
      created_at: '2026-03-16T10:00:00.000Z',
      updated_at: '2026-03-16T10:00:00.000Z',
    });

    const policy = await findTenantAuthPolicy(db, 'tenant_legacy');
    const providers = await listTenantAuthProviders(db, 'tenant_legacy');

    expect(policy?.loginMode).toBe('sso_required');
    expect(policy?.defaultProviderId).toBe('tenant_legacy:provider:saml-default');
    expect(providers).toEqual([
      expect.objectContaining({
        id: 'tenant_legacy:provider:saml-default',
        protocol: 'saml',
        isDefault: true,
        enabled: true,
      }),
    ]);

    const configJson = providers[0]?.configJson ?? '{}';
    expect(configJson).toContain('idpEntityId');
    expect(configJson).toContain('idpCertificatePem');
  });

  it('stores break-glass accounts with enrollment and usage status', async () => {
    const db = createFakeTenantAuthDb();
    const tenantAuthDb = db as unknown as FakeTenantAuthSqlDatabase;
    const user = await upsertUserByEmail(db, 'Admin@Example.edu');

    tenantAuthDb.betterAuthUsers.push({
      id: 'ba_usr_admin',
      email: 'admin@example.edu',
      two_factor_enabled: 1,
    });
    tenantAuthDb.betterAuthAccounts.push({
      user_id: 'ba_usr_admin',
      provider_id: 'credential',
      password: 'hashed-password',
    });

    await upsertTenantBreakGlassAccount(db, {
      tenantId: 'tenant_123',
      userId: user.id,
      createdByUserId: 'usr_owner',
    });
    await markTenantBreakGlassEnrollmentEmailSent(db, {
      tenantId: 'tenant_123',
      userId: user.id,
      sentAt: '2026-03-16T12:05:00.000Z',
    });
    await markTenantBreakGlassAccountUsed(db, {
      tenantId: 'tenant_123',
      userId: user.id,
      usedAt: '2026-03-16T12:10:00.000Z',
    });

    const listed = await listTenantBreakGlassAccounts(db, 'tenant_123');
    const resolved = await findActiveTenantBreakGlassAccountByEmail(
      db,
      'tenant_123',
      'admin@example.edu',
    );

    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(
      expect.objectContaining({
        tenantId: 'tenant_123',
        userId: user.id,
        email: 'admin@example.edu',
        betterAuthUserId: 'ba_usr_admin',
        localCredentialEnabled: true,
        twoFactorEnabled: true,
      }),
    );
    expect(resolved?.lastEnrollmentEmailSentAt).toBe('2026-03-16T12:05:00.000Z');
    expect(resolved?.lastUsedAt).toBe('2026-03-16T12:10:00.000Z');

    const removed = await revokeTenantBreakGlassAccount(db, {
      tenantId: 'tenant_123',
      userId: user.id,
      revokedAt: '2026-03-16T12:20:00.000Z',
    });
    const resolvedAfterRevoke = await findActiveTenantBreakGlassAccountByEmail(
      db,
      'tenant_123',
      'admin@example.edu',
    );

    expect(removed).toBe(true);
    expect(resolvedAfterRevoke).toBeNull();
  });

  it('lists accessible tenant contexts for a user from active memberships', async () => {
    const db = createFakeTenantAuthDb();
    const tenantAuthDb = db as unknown as FakeTenantAuthSqlDatabase;

    tenantAuthDb.tenants.push(
      {
        id: 'tenant_admin',
        slug: 'tenant-admin',
        display_name: 'Admin Tenant',
        plan_tier: 'enterprise',
        is_active: 1,
      },
      {
        id: 'tenant_viewer',
        slug: 'tenant-viewer',
        display_name: 'Viewer Tenant',
        plan_tier: 'team',
        is_active: 1,
      },
      {
        id: 'tenant_inactive',
        slug: 'tenant-inactive',
        display_name: 'Inactive Tenant',
        plan_tier: 'institution',
        is_active: 0,
      },
    );
    tenantAuthDb.memberships.push(
      {
        tenant_id: 'tenant_viewer',
        user_id: 'usr_123',
        role: 'viewer',
      },
      {
        tenant_id: 'tenant_admin',
        user_id: 'usr_123',
        role: 'admin',
      },
      {
        tenant_id: 'tenant_inactive',
        user_id: 'usr_123',
        role: 'owner',
      },
    );

    const contexts = await listAccessibleTenantContextsForUser(db, 'usr_123');

    expect(contexts).toEqual([
      {
        tenantId: 'tenant_admin',
        tenantSlug: 'tenant-admin',
        tenantDisplayName: 'Admin Tenant',
        tenantPlanTier: 'enterprise',
        membershipRole: 'admin',
      },
      {
        tenantId: 'tenant_viewer',
        tenantSlug: 'tenant-viewer',
        tenantDisplayName: 'Viewer Tenant',
        tenantPlanTier: 'team',
        membershipRole: 'viewer',
      },
    ]);
  });
});

describe('better auth core migration', () => {
  it('keeps Better Auth tables in an auth schema and preserves CredTrail-owned tables', () => {
    const sql = readFileSync(
      new URL('../migrations/0025_better_auth_core.sql', import.meta.url),
      'utf8',
    );

    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS auth');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS auth.user');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS auth.session');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS auth.account');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS auth.verification');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS auth_identity_links');
    expect(sql).not.toContain('CREATE TABLE IF NOT EXISTS users');
    expect(sql).not.toContain('CREATE TABLE IF NOT EXISTS sessions');
  });

  it('adds tenant auth policy and provider migrations with legacy SAML backfill', () => {
    const policySql = readFileSync(
      new URL('../migrations/0026_tenant_auth_policies.sql', import.meta.url),
      'utf8',
    );
    const providerSql = readFileSync(
      new URL('../migrations/0027_tenant_auth_providers.sql', import.meta.url),
      'utf8',
    );
    const backfillSql = readFileSync(
      new URL('../migrations/0028_backfill_legacy_saml_auth_providers.sql', import.meta.url),
      'utf8',
    );

    expect(policySql).toContain('CREATE TABLE IF NOT EXISTS tenant_auth_policies');
    expect(policySql).toContain("CHECK (login_mode IN ('local', 'hybrid', 'sso_required'))");
    expect(providerSql).toContain('CREATE TABLE IF NOT EXISTS tenant_auth_providers');
    expect(providerSql).toContain("CHECK (protocol IN ('oidc', 'saml'))");
    expect(providerSql).toContain('idx_tenant_auth_providers_default_per_tenant');
    expect(backfillSql).toContain('INSERT INTO tenant_auth_providers');
    expect(backfillSql).toContain('tenant_sso_saml_configurations');
    expect(backfillSql).toContain('tenant_auth_policies');
  });

  it('adds Better Auth enterprise SSO indexes without changing CredTrail-owned tables', () => {
    const ssoSql = readFileSync(
      new URL('../migrations/0029_better_auth_enterprise_sso.sql', import.meta.url),
      'utf8',
    );

    expect(ssoSql).toContain('idx_auth_user_email');
    expect(ssoSql).toContain('idx_auth_account_provider_user');
    expect(ssoSql).not.toContain('CREATE TABLE IF NOT EXISTS tenant_auth_providers');
  });

  it('adds Better Auth two-factor and tenant break-glass migrations', () => {
    const twoFactorSql = readFileSync(
      new URL('../migrations/0030_better_auth_two_factor.sql', import.meta.url),
      'utf8',
    );
    const breakGlassSql = readFileSync(
      new URL('../migrations/0031_tenant_break_glass_accounts.sql', import.meta.url),
      'utf8',
    );

    expect(twoFactorSql).toContain('ALTER TABLE auth.user');
    expect(twoFactorSql).toContain('two_factor_enabled');
    expect(twoFactorSql).toContain('CREATE TABLE IF NOT EXISTS auth.two_factor');
    expect(breakGlassSql).toContain('CREATE TABLE IF NOT EXISTS tenant_break_glass_accounts');
    expect(breakGlassSql).toContain('last_enrollment_email_sent_at');
    expect(breakGlassSql).toContain('idx_tenant_break_glass_accounts_tenant_active');
  });
});
