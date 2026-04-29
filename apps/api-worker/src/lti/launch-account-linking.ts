import {
  addLearnerIdentityAlias,
  ensureTenantMembership,
  findLearnerProfileByIdentity,
  resolveLearnerProfileForIdentity,
  upsertUserByEmail,
  type SqlDatabase,
  type TenantMembershipRole,
} from "@credtrail/db";
import type { LtiLaunchClaims, LtiRoleKind } from "@credtrail/lti";
import {
  ltiDisplayNameFromClaims,
  ltiEmailFromClaims,
  ltiFederatedSubjectIdentity,
  ltiMembershipRoleFromRoleKind,
  ltiSourcedIdFromClaims,
  ltiSyntheticEmail,
} from "./lti-helpers";

export interface LinkedLtiLaunchAccount {
  learnerProfileId: string;
  userId: string;
  membershipRole: TenantMembershipRole;
}

export const linkLtiLaunchAccount = async (input: {
  db: SqlDatabase;
  tenantId: string;
  launchClaims: LtiLaunchClaims;
  roleKind: LtiRoleKind;
  sha256Hex: (value: string) => Promise<string>;
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
}): Promise<LinkedLtiLaunchAccount> => {
  const federatedSubject = ltiFederatedSubjectIdentity(
    input.launchClaims.iss,
    input.launchClaims.sub,
  );
  const displayName = ltiDisplayNameFromClaims(input.launchClaims);
  const learnerProfile = await resolveLearnerProfileForIdentity(input.db, {
    tenantId: input.tenantId,
    identityType: "saml_subject",
    identityValue: federatedSubject,
    ...(displayName === undefined ? {} : { displayName }),
  });
  const claimedEmail = ltiEmailFromClaims(input.launchClaims);

  if (claimedEmail !== null) {
    const existingEmailProfile = await findLearnerProfileByIdentity(input.db, {
      tenantId: input.tenantId,
      identityType: "email",
      identityValue: claimedEmail,
    });

    if (existingEmailProfile !== null && existingEmailProfile.id !== learnerProfile.id) {
      throw new Error("LTI email claim is already linked to a different learner profile");
    }

    if (existingEmailProfile === null) {
      await addLearnerIdentityAlias(input.db, {
        tenantId: input.tenantId,
        learnerProfileId: learnerProfile.id,
        identityType: "email",
        identityValue: claimedEmail,
        isPrimary: false,
        isVerified: true,
      });
    }
  }

  const sourcedId = ltiSourcedIdFromClaims(input.launchClaims);

  if (sourcedId !== null) {
    const existingSourcedIdProfile = await findLearnerProfileByIdentity(input.db, {
      tenantId: input.tenantId,
      identityType: "sourced_id",
      identityValue: sourcedId,
    });

    if (existingSourcedIdProfile !== null && existingSourcedIdProfile.id !== learnerProfile.id) {
      throw new Error("LTI sourcedId claim is already linked to a different learner profile");
    }

    if (existingSourcedIdProfile === null) {
      await addLearnerIdentityAlias(input.db, {
        tenantId: input.tenantId,
        learnerProfileId: learnerProfile.id,
        identityType: "sourced_id",
        identityValue: sourcedId,
        isPrimary: false,
        isVerified: true,
      });
    }
  }

  const user = await upsertUserByEmail(
    input.db,
    claimedEmail ?? (await ltiSyntheticEmail(input.tenantId, federatedSubject, input.sha256Hex)),
  );
  const membershipResult = await ensureTenantMembership(input.db, input.tenantId, user.id);
  let membershipRole = membershipResult.membership.role;
  const desiredRole = ltiMembershipRoleFromRoleKind(input.roleKind);

  if (desiredRole === "issuer" && membershipRole === "viewer") {
    const promotedMembership = await input.upsertTenantMembershipRole(input.db, {
      tenantId: input.tenantId,
      userId: user.id,
      role: desiredRole,
    });
    membershipRole = promotedMembership.membership.role;
  }

  return {
    learnerProfileId: learnerProfile.id,
    userId: user.id,
    membershipRole,
  };
};
