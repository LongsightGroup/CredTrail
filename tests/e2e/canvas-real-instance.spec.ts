import { type APIResponse, expect, test } from '@playwright/test';

interface CanvasCourseSnapshotResponse {
  tenantId: string;
  provider: string;
  generatedAt: string;
  courses: Array<{
    courseId: string;
    title: string;
  }>;
}

interface CanvasCourseDetailSnapshotResponse extends CanvasCourseSnapshotResponse {
  assignments: unknown[];
  enrollments: Array<{
    learnerId: string;
  }>;
  grades: Array<{
    learnerId: string;
  }>;
  completions: Array<{
    learnerId: string;
  }>;
  submissions: Array<{
    learnerId: string;
    assignmentId: string;
  }>;
  badgeCriteriaFacts: {
    courseCompletionFacts: unknown[];
    courseGradeFacts: unknown[];
    assignmentSubmissionFacts: unknown[];
  };
}

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const realCanvasEnabled = parseBoolean(process.env.E2E_REAL_CANVAS_ENABLED, false);
const adminToken = process.env.E2E_BOOTSTRAP_ADMIN_TOKEN?.trim() ?? '';
const canvasTenantId = process.env.E2E_CANVAS_TENANT_ID?.trim() ?? '';
const expectedCourseId = process.env.E2E_CANVAS_EXPECTED_COURSE_ID?.trim() ?? '';
const expectedLearnerId = process.env.E2E_CANVAS_EXPECTED_LEARNER_ID?.trim() ?? '';
const expectCourses = parseBoolean(process.env.E2E_CANVAS_EXPECT_COURSES, true);

const decodeJsonBody = async <T>(response: APIResponse): Promise<T> => {
  const textBody = await response.text();
  expect(response.status(), textBody).toBe(200);
  return JSON.parse(textBody) as T;
};

test('real Canvas snapshot endpoint returns live gradebook data @real-canvas', async ({
  request,
}) => {
  test.skip(
    !realCanvasEnabled,
    'Set E2E_REAL_CANVAS_ENABLED=true with Canvas env vars to run real-instance validation.',
  );

  expect(adminToken, 'E2E_BOOTSTRAP_ADMIN_TOKEN is required for real Canvas e2e').not.toBe('');
  expect(canvasTenantId, 'E2E_CANVAS_TENANT_ID is required for real Canvas e2e').not.toBe('');

  const snapshotPath = `/v1/admin/tenants/${encodeURIComponent(canvasTenantId)}/lms/canvas/gradebook/snapshot`;
  const headers = {
    authorization: `Bearer ${adminToken}`,
  };
  const coursesResponse = await request.get(snapshotPath, { headers });
  const coursesPayload = await decodeJsonBody<CanvasCourseSnapshotResponse>(coursesResponse);

  expect(coursesPayload.provider).toBe('canvas');
  expect(coursesPayload.tenantId).toBe(canvasTenantId);
  expect(Array.isArray(coursesPayload.courses)).toBe(true);

  if (expectCourses) {
    expect(coursesPayload.courses.length).toBeGreaterThan(0);
  }

  const resolvedCourseId =
    expectedCourseId.length > 0 ? expectedCourseId : coursesPayload.courses[0]?.courseId ?? '';
  expect(resolvedCourseId, 'No Canvas course available to evaluate detail snapshot').not.toBe('');

  const detailQuery = new URLSearchParams({
    courseId: resolvedCourseId,
  });

  if (expectedLearnerId.length > 0) {
    detailQuery.set('learnerId', expectedLearnerId);
  }

  const detailResponse = await request.get(`${snapshotPath}?${detailQuery.toString()}`, { headers });
  const detailPayload = await decodeJsonBody<CanvasCourseDetailSnapshotResponse>(detailResponse);

  expect(detailPayload.provider).toBe('canvas');
  expect(detailPayload.tenantId).toBe(canvasTenantId);
  expect(Array.isArray(detailPayload.assignments)).toBe(true);
  expect(Array.isArray(detailPayload.enrollments)).toBe(true);
  expect(Array.isArray(detailPayload.grades)).toBe(true);
  expect(Array.isArray(detailPayload.completions)).toBe(true);
  expect(Array.isArray(detailPayload.submissions)).toBe(true);
  expect(Array.isArray(detailPayload.badgeCriteriaFacts.courseCompletionFacts)).toBe(true);
  expect(Array.isArray(detailPayload.badgeCriteriaFacts.courseGradeFacts)).toBe(true);
  expect(Array.isArray(detailPayload.badgeCriteriaFacts.assignmentSubmissionFacts)).toBe(true);

  if (expectedLearnerId.length > 0) {
    for (const enrollment of detailPayload.enrollments) {
      expect(enrollment.learnerId).toBe(expectedLearnerId);
    }

    for (const grade of detailPayload.grades) {
      expect(grade.learnerId).toBe(expectedLearnerId);
    }

    for (const completion of detailPayload.completions) {
      expect(completion.learnerId).toBe(expectedLearnerId);
    }

    for (const submission of detailPayload.submissions) {
      expect(submission.learnerId).toBe(expectedLearnerId);
    }
  }
});
