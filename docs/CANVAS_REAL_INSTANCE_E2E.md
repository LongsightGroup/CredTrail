# Canvas Real-Instance E2E Validation

This runbook defines the `badging-f9b` validation path: execute a live end-to-end check against a
real Canvas tenant through CredTrail's admin gradebook snapshot API.

## What this test validates

The Playwright test `tests/e2e/canvas-real-instance.spec.ts` validates:

1. CredTrail can authenticate a bootstrap admin request.
2. CredTrail can call live Canvas gradebook endpoints via the configured tenant integration.
3. Snapshot payloads are returned with expected course/detail structures.

This test is intentionally gated and skipped by default in standard CI.

## Prerequisites

1. A CredTrail tenant with Canvas integration already configured and connected (token present).
2. A bootstrap admin token valid for the target CredTrail environment.
3. Network reachability from the test runner to both CredTrail and Canvas.

## Local execution

Run from repository root:

```bash
E2E_BASE_URL="https://credtrail.org" \
E2E_REAL_CANVAS_ENABLED="true" \
E2E_BOOTSTRAP_ADMIN_TOKEN="<bootstrap-admin-token>" \
E2E_CANVAS_TENANT_ID="sakai" \
E2E_CANVAS_EXPECTED_COURSE_ID="<optional-course-id>" \
E2E_CANVAS_EXPECTED_LEARNER_ID="<optional-learner-id>" \
pnpm test:e2e:canvas-real --project=chromium
```

Optional behavior:

- `E2E_CANVAS_EXPECT_COURSES` defaults to `true`.
- Set `E2E_CANVAS_EXPECT_COURSES=false` if the tenant may legitimately return zero active courses.

## GitHub Actions execution

Use workflow: `.github/workflows/canvas-real-e2e.yml`

Inputs:

1. `base_url`
2. `tenant_id`
3. optional `expected_course_id`
4. optional `expected_learner_id`
5. `expect_courses`

Required repository secret:

- `E2E_BOOTSTRAP_ADMIN_TOKEN`

## Failure triage

Common failures:

1. `404 Canvas gradebook integration not found`
2. `409 Canvas integration is not connected`
3. `502 Canvas access token refresh failed`
4. `401` due to invalid bootstrap admin token

When failures occur:

1. Verify tenant integration exists and has valid access/refresh token material.
2. Re-run `/v1/admin/tenants/:tenantId/lms/canvas/gradebook/snapshot` manually with the same token.
3. Confirm Canvas-side API scopes still allow course/enrollment/grade queries.
