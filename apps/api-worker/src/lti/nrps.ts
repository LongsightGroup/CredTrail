import {
  LTI_CLAIM_NRPS_NAMES_ROLE_SERVICE,
  LTI_NRPS_SCOPE_CONTEXT_MEMBERSHIP_READONLY,
  type LtiLaunchClaims,
} from '@credtrail/lti';
import { asJsonObject, asNonEmptyString } from '../utils/value-parsers';

const NRPS_LEARNER_ROLE_MARKERS = ['#learner', '#student'];

const asJsonArray = (value: unknown): readonly unknown[] | null => {
  return Array.isArray(value) ? value : null;
};

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeRoles = (candidate: unknown): string[] => {
  const roleEntries = asJsonArray(candidate);

  if (roleEntries === null) {
    return [];
  }

  return roleEntries
    .map((entry) => asNonEmptyString(entry))
    .filter((entry): entry is string => entry !== null);
};

const roleSummary = (roles: readonly string[]): string => {
  if (roles.length === 0) {
    return '';
  }

  return roles.join(', ');
};

const parseNrpsAccessToken = (candidate: unknown): string => {
  const payload = asJsonObject(candidate);

  if (payload === null) {
    throw new Error('NRPS token response must be a JSON object');
  }

  const accessToken = asNonEmptyString(payload.access_token);

  if (accessToken === null) {
    throw new Error('NRPS token response is missing access_token');
  }

  return accessToken;
};

const basicAuthHeaderValue = (clientId: string, clientSecret: string): string => {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
};

export interface LtiNrpsNamesRoleServiceClaim {
  contextMembershipsUrl: string;
  serviceVersions: readonly string[];
}

export interface LtiNrpsMember {
  userId: string;
  sourcedId: string | null;
  displayName: string | null;
  email: string | null;
  status: string | null;
  pictureUrl: string | null;
  roles: readonly string[];
  roleSummary: string;
  isLearner: boolean;
}

export interface LtiNrpsRoster {
  contextId: string | null;
  members: readonly LtiNrpsMember[];
  learnerMembers: readonly LtiNrpsMember[];
}

const parseNrpsMember = (candidate: unknown): LtiNrpsMember | null => {
  const member = asJsonObject(candidate);

  if (member === null) {
    return null;
  }

  const userId = asNonEmptyString(member.user_id);

  if (userId === null) {
    return null;
  }

  const roles = normalizeRoles(member.roles);
  const normalizedRoles = roles.map((role) => role.toLowerCase());
  const isLearner = normalizedRoles.some((role) =>
    NRPS_LEARNER_ROLE_MARKERS.some((marker) => role.includes(marker)),
  );
  const derivedDisplayName = [asNonEmptyString(member.given_name), asNonEmptyString(member.family_name)]
    .filter((entry): entry is string => entry !== null)
    .join(' ')
    .trim();
  const displayName = asNonEmptyString(member.name) ?? (derivedDisplayName.length === 0 ? null : derivedDisplayName);
  const email = asNonEmptyString(member.email);
  const sourcedId = asNonEmptyString(member.lis_person_sourcedid);
  const status = asNonEmptyString(member.status);
  const pictureUrl = asNonEmptyString(member.picture);

  return {
    userId,
    sourcedId,
    displayName,
    email,
    status,
    pictureUrl,
    roles,
    roleSummary: roleSummary(roles),
    isLearner,
  };
};

const parseNrpsRoster = (candidate: unknown): LtiNrpsRoster => {
  const payload = asJsonObject(candidate);

  if (payload === null) {
    throw new Error('NRPS membership response must be a JSON object');
  }

  const memberEntries = asJsonArray(payload.members);

  if (memberEntries === null) {
    throw new Error('NRPS membership response is missing members[]');
  }

  const members = memberEntries
    .map((entry) => parseNrpsMember(entry))
    .filter((entry): entry is LtiNrpsMember => entry !== null);
  const learnerMembers = members.filter((member) => member.isLearner);
  const context = asJsonObject(payload.context);
  const contextId = asNonEmptyString(context?.id);

  return {
    contextId,
    members,
    learnerMembers,
  };
};

export const parseLtiNrpsNamesRoleServiceClaim = (
  claims: LtiLaunchClaims,
): LtiNrpsNamesRoleServiceClaim | null => {
  const claim = asJsonObject(claims[LTI_CLAIM_NRPS_NAMES_ROLE_SERVICE]);

  if (claim === null) {
    return null;
  }

  const contextMembershipsUrl = asNonEmptyString(claim.context_memberships_url);

  if (contextMembershipsUrl === null || !isAbsoluteHttpUrl(contextMembershipsUrl)) {
    return null;
  }

  const versions = asJsonArray(claim.service_versions);
  const serviceVersions =
    versions === null
      ? []
      : versions
          .map((entry) => asNonEmptyString(entry))
          .filter((entry): entry is string => entry !== null);

  return {
    contextMembershipsUrl,
    serviceVersions,
  };
};

export const fetchNrpsRoster = async (input: {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  contextMembershipsUrl: string;
  scope?: string;
  fetchImpl?: typeof fetch;
}): Promise<LtiNrpsRoster> => {
  const fetchImpl = input.fetchImpl ?? fetch;
  const scope = input.scope ?? LTI_NRPS_SCOPE_CONTEXT_MEMBERSHIP_READONLY;
  const tokenResponse = await fetchImpl(input.tokenEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
      authorization: basicAuthHeaderValue(input.clientId, input.clientSecret),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    throw new Error(`NRPS token request failed (${String(tokenResponse.status)})`);
  }

  const tokenResponsePayload = await tokenResponse.json<unknown>().catch(() => null);
  const accessToken = parseNrpsAccessToken(tokenResponsePayload);
  const rosterResponse = await fetchImpl(input.contextMembershipsUrl, {
    method: 'GET',
    headers: {
      accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json, application/json',
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!rosterResponse.ok) {
    throw new Error(`NRPS membership request failed (${String(rosterResponse.status)})`);
  }

  const rosterPayload = await rosterResponse.json<unknown>().catch(() => null);
  return parseNrpsRoster(rosterPayload);
};
