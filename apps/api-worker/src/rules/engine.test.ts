import { describe, expect, it } from 'vitest';
import {
  evaluateBadgeIssuanceRuleDefinition,
  extractBadgeIssuanceRuleRequirements,
} from './engine';
import { parseCreateBadgeIssuanceRuleRequest } from '@credtrail/validation';

const baseDefinition = parseCreateBadgeIssuanceRuleRequest({
  name: 'CS Program Completion',
  badgeTemplateId: 'badge_template_program',
  lmsProviderKind: 'canvas',
  definition: {
    conditions: {
      all: [
        {
          type: 'course_completion',
          courseId: 'course_101',
        },
        {
          type: 'grade_threshold',
          courseId: 'course_101',
          minScore: 85,
        },
        {
          type: 'assignment_submission',
          courseId: 'course_101',
          assignmentId: 'assignment_midterm',
          minScore: 80,
        },
        {
          type: 'prerequisite_badge',
          badgeTemplateId: 'badge_template_foundations',
        },
      ],
    },
  },
}).definition;

describe('badge issuance rule engine', () => {
  it('extracts referenced courses, assignments, and prerequisites', () => {
    const requirements = extractBadgeIssuanceRuleRequirements(baseDefinition);

    expect(requirements.courseIds).toEqual(['course_101']);
    expect(requirements.assignmentRefs).toEqual([
      {
        courseId: 'course_101',
        assignmentId: 'assignment_midterm',
      },
    ]);
    expect(requirements.prerequisiteBadgeTemplateIds).toEqual(['badge_template_foundations']);
  });

  it('returns a matched evaluation when all constraints pass', () => {
    const result = evaluateBadgeIssuanceRuleDefinition(baseDefinition, {
      learnerId: 'learner_123',
      nowIso: '2026-02-17T00:00:00.000Z',
      grades: [
        {
          courseId: 'course_101',
          learnerId: 'learner_123',
          currentScore: 90,
          finalScore: 91,
        },
      ],
      completions: [
        {
          courseId: 'course_101',
          learnerId: 'learner_123',
          completed: true,
          completionPercent: 100,
        },
      ],
      submissions: [
        {
          courseId: 'course_101',
          assignmentId: 'assignment_midterm',
          learnerId: 'learner_123',
          score: 90,
          workflowState: 'graded',
          submittedAt: '2026-01-15T12:00:00.000Z',
        },
      ],
      earnedBadgeTemplateIds: ['badge_template_foundations'],
    });

    expect(result.matched).toBe(true);
    expect(result.tree.type).toBe('all');
  });

  it('returns an unmatched evaluation when a prerequisite is missing', () => {
    const result = evaluateBadgeIssuanceRuleDefinition(baseDefinition, {
      learnerId: 'learner_123',
      nowIso: '2026-02-17T00:00:00.000Z',
      grades: [
        {
          courseId: 'course_101',
          learnerId: 'learner_123',
          currentScore: 90,
          finalScore: 91,
        },
      ],
      completions: [
        {
          courseId: 'course_101',
          learnerId: 'learner_123',
          completed: true,
          completionPercent: 100,
        },
      ],
      submissions: [
        {
          courseId: 'course_101',
          assignmentId: 'assignment_midterm',
          learnerId: 'learner_123',
          score: 90,
          workflowState: 'graded',
          submittedAt: '2026-01-15T12:00:00.000Z',
        },
      ],
      earnedBadgeTemplateIds: [],
    });

    expect(result.matched).toBe(false);
    expect(JSON.stringify(result.tree)).toContain('Prerequisite badge badge_template_foundations is missing');
  });
});
