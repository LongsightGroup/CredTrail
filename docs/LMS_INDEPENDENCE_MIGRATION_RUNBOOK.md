# LMS Independence Durability Runbook

This runbook operationalizes `badging-iil.6`.

Goal: prove badge credentials remain institution-governed and durable when LMS-specific configuration changes, courses are removed, platform hostnames change, or learner identities are remapped.

## Scope

Durability scenarios covered:

1. Course deletion resilience
2. LMS migration resilience
3. Platform move resilience
4. Identity remap resilience

## Automated Scenario Execution

Run from repository root:

```bash
pnpm test -- apps/api-worker/src/index.test.ts -t "LMS-independence durability"
pnpm test -- apps/api-worker/src/index.test.ts -t "stable learner subject identifiers across old and new recipient emails"
```

Current automated scenario mapping:

- Course deletion: `GET /badges/:badgeIdentifier > keeps public badge pages available after LMS course deletion`
- LMS migration: `GET /credentials/v1/:credentialId/download > keeps credential downloads available after LMS issuer migration`
- Platform move: `GET /badges/:badgeIdentifier > rebuilds canonical and LinkedIn links for the current platform host after platform move`
- Identity remap: `POST /v1/tenants/:tenantId/assertions/manual-issue > uses stable learner subject identifiers across old and new recipient emails`

## Prerequisites

- Latest database migrations applied.
- Valid tenant signing registration for each tenant in scope.
- Badge object storage reachable.
- Operational API worker deployment.
- Access to `psql` (or equivalent SQL console) for integrity checks.

## Data Integrity Checks

Run before and after any migration event.

1. Assertions always point to tenant-owned templates and org ownership:

```sql
SELECT a.id, a.tenant_id, a.badge_template_id
FROM assertions a
LEFT JOIN badge_templates bt
  ON bt.tenant_id = a.tenant_id
 AND bt.id = a.badge_template_id
LEFT JOIN tenant_org_units tou
  ON tou.tenant_id = bt.tenant_id
 AND tou.id = bt.owner_org_unit_id
WHERE bt.id IS NULL
   OR tou.id IS NULL;
```

Expected result: zero rows.

2. Lifecycle history exists for non-active terminal states:

```sql
SELECT a.id, a.tenant_id, a.revoked_at
FROM assertions a
LEFT JOIN assertion_lifecycle_events ale
  ON ale.tenant_id = a.tenant_id
 AND ale.assertion_id = a.id
WHERE a.revoked_at IS NOT NULL
GROUP BY a.id, a.tenant_id, a.revoked_at
HAVING COUNT(ale.id) = 0;
```

Expected result: zero rows.

3. Delegated authority grants must reference valid org units:

```sql
SELECT g.id, g.tenant_id, g.org_unit_id
FROM delegated_issuing_authority_grants g
LEFT JOIN tenant_org_units tou
  ON tou.tenant_id = g.tenant_id
 AND tou.id = g.org_unit_id
WHERE tou.id IS NULL;
```

Expected result: zero rows.

4. Learner identity aliases map to an existing profile:

```sql
SELECT li.id, li.tenant_id, li.learner_profile_id
FROM learner_identities li
LEFT JOIN learner_profiles lp
  ON lp.tenant_id = li.tenant_id
 AND lp.id = li.learner_profile_id
WHERE lp.id IS NULL;
```

Expected result: zero rows.

## Manual Scenario Procedures

### 1) Course Deletion Resilience

Objective: deleting LMS course configuration must not remove previously issued credentials.

1. Confirm issued assertion exists (`assertions.id`) and public badge URL is reachable.
2. Remove or disable the associated LMS course/deployment in LMS admin.
3. Verify:

- `GET /badges/:publicId` still renders
- `GET /credentials/v1/:assertionId` still returns verification payload
- `GET /credentials/v1/:assertionId/download` still returns JSON-LD

4. Record assertion IDs and response statuses.

Pass criteria: all previously issued credentials remain retrievable and verifiable.

### 2) LMS Migration Resilience

Objective: switching LMS issuer registrations must not strand existing credentials.

1. Capture baseline credential URLs for a representative tenant.
2. Add new LMS issuer registration.
3. Validate new LMS login initiation flow (`/v1/lti/oidc/login`) resolves to new issuer endpoint.
4. Re-run credential retrieval/verification for baseline credentials.

Pass criteria: new LMS launch path works and previously issued credentials remain unchanged and accessible.

### 3) Platform Move Resilience

Objective: host/domain changes preserve badge identifier continuity.

1. Move traffic to new platform hostname.
2. Verify existing badge URL identifiers still resolve under new host.
3. Confirm rendered canonical and LinkedIn `certUrl` links use the new host.
4. Verify credential JSON-LD and PDF downloads still work on new host.

Pass criteria: same badge IDs remain valid; host-derived links point at the new platform domain.

### 4) Identity Remap Resilience

Objective: learner identity changes do not fork learner subject continuity.

1. Issue badge to learner with initial identity (for example, institutional email).
2. Remap learner identity (for example, personal email or updated alias).
3. Issue another badge to remapped identity.
4. Compare `credentialSubject.id` values.

Pass criteria: both credentials resolve to the same stable learner subject identifier.

## Rollback Guidance

If any scenario fails:

1. Stop rollout changes (LMS config, hostname routing, or migration scripts).
2. Restore previous LMS issuer registration set.
3. Restore previous platform routing and hostname configuration.
4. If data integrity checks fail, restore database snapshot from pre-change backup.
5. Re-run integrity SQL checks and automated durability tests.
6. Re-open rollout only after all checks return to green.

## Sign-off Checklist

- [ ] Automated durability tests passed in CI.
- [ ] Manual scenario checks completed for representative tenant(s).
- [ ] All data integrity SQL checks returned zero unexpected rows.
- [ ] Rollback procedure validated and documented with owner/date.
- [ ] Final runbook evidence archived with assertion IDs and timestamps.
