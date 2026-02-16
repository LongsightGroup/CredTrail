import { asJsonObject, asNonEmptyString, asString } from '../utils/value-parsers';
import type {
  CanvasGradebookProviderConfig,
  GradebookAssignmentRecord,
  GradebookCompletionRecord,
  GradebookCourseRecord,
  GradebookEnrollmentRecord,
  GradebookGradeRecord,
  GradebookProvider,
  GradebookSubmissionRecord,
} from './gradebook-types';

interface CreateCanvasGradebookProviderInput {
  config: CanvasGradebookProviderConfig;
  fetchImpl?: typeof fetch;
}

const asJsonArray = (value: unknown): readonly unknown[] | null => {
  return Array.isArray(value) ? value : null;
};

const asIdentifier = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === 'boolean' ? value : null;
};

const asIsoTimestamp = (value: unknown): string | null => {
  const timestamp = asNonEmptyString(value);

  if (timestamp === null) {
    return null;
  }

  return Number.isFinite(Date.parse(timestamp)) ? timestamp : null;
};

const ensureHttpBaseUrl = (candidate: string): URL => {
  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Gradebook provider apiBaseUrl must be a valid absolute URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Gradebook provider apiBaseUrl must use http or https');
  }

  if (!parsed.pathname.endsWith('/')) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return parsed;
};

const parseCourseRecord = (candidate: unknown): GradebookCourseRecord | null => {
  const course = asJsonObject(candidate);

  if (course === null) {
    return null;
  }

  const courseId = asIdentifier(course.id);
  const title = asNonEmptyString(course.name);

  if (courseId === null || title === null) {
    return null;
  }

  return {
    courseId,
    title,
    courseCode: asString(course.course_code),
    workflowState: asString(course.workflow_state),
    startsAt: asIsoTimestamp(course.start_at),
    endsAt: asIsoTimestamp(course.end_at),
  };
};

const parseAssignmentRecord = (
  courseId: string,
  candidate: unknown,
): GradebookAssignmentRecord | null => {
  const assignment = asJsonObject(candidate);

  if (assignment === null) {
    return null;
  }

  const assignmentId = asIdentifier(assignment.id);
  const title = asNonEmptyString(assignment.name);

  if (assignmentId === null || title === null) {
    return null;
  }

  return {
    assignmentId,
    courseId,
    title,
    workflowState: asString(assignment.workflow_state),
    pointsPossible: asNumber(assignment.points_possible),
    dueAt: asIsoTimestamp(assignment.due_at),
  };
};

const parseEnrollmentRecord = (
  courseId: string,
  candidate: unknown,
): GradebookEnrollmentRecord | null => {
  const enrollment = asJsonObject(candidate);

  if (enrollment === null) {
    return null;
  }

  const learnerId = asIdentifier(enrollment.user_id);
  const enrollmentState = asNonEmptyString(enrollment.enrollment_state);

  if (learnerId === null || enrollmentState === null) {
    return null;
  }

  return {
    courseId,
    learnerId,
    enrollmentState,
    role: asString(enrollment.type),
    startedAt: asIsoTimestamp(enrollment.created_at),
    lastActivityAt: asIsoTimestamp(enrollment.last_activity_at),
  };
};

const parseSubmissionRecord = (
  courseId: string,
  candidate: unknown,
): GradebookSubmissionRecord | null => {
  const submission = asJsonObject(candidate);

  if (submission === null) {
    return null;
  }

  const learnerId = asIdentifier(submission.user_id);
  const assignmentId = asIdentifier(submission.assignment_id);

  if (learnerId === null || assignmentId === null) {
    return null;
  }

  return {
    courseId,
    learnerId,
    assignmentId,
    workflowState: asString(submission.workflow_state),
    score: asNumber(submission.score),
    submittedAt: asIsoTimestamp(submission.submitted_at),
    gradedAt: asIsoTimestamp(submission.graded_at),
    late: asBoolean(submission.late),
    missing: asBoolean(submission.missing),
  };
};

const parseGradeRecord = (courseId: string, candidate: unknown): GradebookGradeRecord | null => {
  const enrollment = asJsonObject(candidate);

  if (enrollment === null) {
    return null;
  }

  const learnerId = asIdentifier(enrollment.user_id);
  const grades = asJsonObject(enrollment.grades);

  if (learnerId === null || grades === null) {
    return null;
  }

  return {
    courseId,
    learnerId,
    currentScore: asNumber(grades.current_score),
    finalScore: asNumber(grades.final_score),
    currentGrade: asString(grades.current_grade),
    finalGrade: asString(grades.final_grade),
  };
};

const parseCompletionRecord = (
  courseId: string,
  candidate: unknown,
): GradebookCompletionRecord | null => {
  const enrollment = asJsonObject(candidate);

  if (enrollment === null) {
    return null;
  }

  const learnerId = asIdentifier(enrollment.user_id);
  const enrollmentState = asString(enrollment.enrollment_state);
  const grades = asJsonObject(enrollment.grades);

  if (learnerId === null) {
    return null;
  }

  const normalizedState = enrollmentState?.toLowerCase() ?? null;
  const completed =
    normalizedState === 'completed' || normalizedState === 'concluded' || normalizedState === 'inactive';

  return {
    courseId,
    learnerId,
    completed,
    completedAt: completed
      ? asIsoTimestamp(enrollment.completed_at) ??
        asIsoTimestamp(enrollment.updated_at) ??
        asIsoTimestamp(enrollment.last_activity_at)
      : null,
    completionPercent:
      grades === null ? null : asNumber(grades.final_score) ?? asNumber(grades.current_score),
    sourceState: enrollmentState,
  };
};

export const createCanvasGradebookProvider = (
  input: CreateCanvasGradebookProviderInput,
): GradebookProvider => {
  const { config } = input;
  const fetchImpl = input.fetchImpl ?? fetch;
  const apiBaseUrl = ensureHttpBaseUrl(config.apiBaseUrl);

  const requestArray = async (
    path: string,
    query?: URLSearchParams,
  ): Promise<readonly unknown[]> => {
    const requestUrl = new URL(path, apiBaseUrl);

    if (query !== undefined && query.size > 0) {
      requestUrl.search = query.toString();
    }

    const response = await fetchImpl(requestUrl.toString(), {
      method: 'GET',
      headers: {
        authorization: `Bearer ${config.accessToken}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Canvas gradebook API request failed (${String(response.status)}) for ${requestUrl.pathname}`,
      );
    }

    const body = await response.json<unknown>().catch(() => null);
    const payload = asJsonArray(body);

    if (payload === null) {
      throw new Error(`Canvas gradebook API response must be a JSON array for ${requestUrl.pathname}`);
    }

    return payload;
  };

  const listRawEnrollments = async (input: {
    courseId: string;
    learnerId?: string;
  }): Promise<readonly unknown[]> => {
    const query = new URLSearchParams();
    query.set('per_page', '100');
    query.append('type[]', 'StudentEnrollment');

    if (input.learnerId !== undefined) {
      query.append('student_ids[]', input.learnerId);
    }

    return requestArray(`/api/v1/courses/${encodeURIComponent(input.courseId)}/enrollments`, query);
  };

  return {
    kind: 'canvas',
    listCourses: async (): Promise<readonly GradebookCourseRecord[]> => {
      const query = new URLSearchParams();
      query.set('per_page', '100');
      query.set('enrollment_state', 'active');
      const courses = await requestArray('/api/v1/courses', query);
      const normalizedCourses = courses
        .map((course) => parseCourseRecord(course))
        .filter((course): course is GradebookCourseRecord => course !== null);
      return normalizedCourses;
    },
    listAssignments: async (input): Promise<readonly GradebookAssignmentRecord[]> => {
      const query = new URLSearchParams();
      query.set('per_page', '100');
      const assignments = await requestArray(
        `/api/v1/courses/${encodeURIComponent(input.courseId)}/assignments`,
        query,
      );
      const normalizedAssignments = assignments
        .map((assignment) => parseAssignmentRecord(input.courseId, assignment))
        .filter((assignment): assignment is GradebookAssignmentRecord => assignment !== null);
      return normalizedAssignments;
    },
    listEnrollments: async (input): Promise<readonly GradebookEnrollmentRecord[]> => {
      const enrollments = await listRawEnrollments(input);
      const normalizedEnrollments = enrollments
        .map((enrollment) => parseEnrollmentRecord(input.courseId, enrollment))
        .filter((enrollment): enrollment is GradebookEnrollmentRecord => enrollment !== null);
      return normalizedEnrollments;
    },
    listSubmissions: async (input): Promise<readonly GradebookSubmissionRecord[]> => {
      const query = new URLSearchParams();
      query.set('per_page', '100');

      if (input.assignmentId !== undefined) {
        query.append('assignment_ids[]', input.assignmentId);
      }

      if (input.learnerId !== undefined) {
        query.append('student_ids[]', input.learnerId);
      }

      const submissions = await requestArray(
        `/api/v1/courses/${encodeURIComponent(input.courseId)}/students/submissions`,
        query,
      );
      const normalizedSubmissions = submissions
        .map((submission) => parseSubmissionRecord(input.courseId, submission))
        .filter((submission): submission is GradebookSubmissionRecord => submission !== null);
      return normalizedSubmissions;
    },
    listGrades: async (input): Promise<readonly GradebookGradeRecord[]> => {
      const enrollments = await listRawEnrollments(input);
      const normalizedGrades = enrollments
        .map((enrollment) => parseGradeRecord(input.courseId, enrollment))
        .filter((grade): grade is GradebookGradeRecord => grade !== null);
      return normalizedGrades;
    },
    listCompletions: async (input): Promise<readonly GradebookCompletionRecord[]> => {
      const enrollments = await listRawEnrollments(input);
      const normalizedCompletions = enrollments
        .map((enrollment) => parseCompletionRecord(input.courseId, enrollment))
        .filter((completion): completion is GradebookCompletionRecord => completion !== null);
      return normalizedCompletions;
    },
  };
};
