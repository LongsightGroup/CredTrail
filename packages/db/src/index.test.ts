import { describe, expect, it } from 'vitest';

import {
  addLearnerIdentityAlias,
  createAuthIdentityLink,
  createLearnerProfile,
  findLearnerProfileByIdentity,
  findAuthIdentityLinkByAuthUserId,
  findAuthIdentityLinkByCredtrailUserId,
  findUserByEmail,
  listLearnerIdentitiesByProfile,
  normalizeLearnerIdentityValue,
  resolveLearnerProfileForIdentity,
  resolveLearnerProfileFromSaml,
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
