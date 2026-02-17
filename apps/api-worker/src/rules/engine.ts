import type { BadgeIssuanceRuleCondition, BadgeIssuanceRuleDefinition } from '@credtrail/validation';

export interface BadgeIssuanceRuleGradeFact {
  courseId: string;
  learnerId: string;
  currentScore: number | null;
  finalScore: number | null;
}

export interface BadgeIssuanceRuleCompletionFact {
  courseId: string;
  learnerId: string;
  completed: boolean;
  completionPercent: number | null;
}

export interface BadgeIssuanceRuleSubmissionFact {
  courseId: string;
  assignmentId: string;
  learnerId: string;
  score: number | null;
  workflowState: string | null;
  submittedAt: string | null;
}

export interface BadgeIssuanceRuleEvaluationFacts {
  learnerId: string;
  nowIso: string;
  grades: readonly BadgeIssuanceRuleGradeFact[];
  completions: readonly BadgeIssuanceRuleCompletionFact[];
  submissions: readonly BadgeIssuanceRuleSubmissionFact[];
  earnedBadgeTemplateIds: readonly string[];
}

export interface BadgeIssuanceRuleRequirements {
  courseIds: string[];
  assignmentRefs: {
    courseId: string;
    assignmentId: string;
  }[];
  prerequisiteBadgeTemplateIds: string[];
}

export interface BadgeIssuanceRuleEvaluationNode {
  type: string;
  matched: boolean;
  detail: string;
  children?: BadgeIssuanceRuleEvaluationNode[];
}

export interface BadgeIssuanceRuleEvaluationResult {
  matched: boolean;
  tree: BadgeIssuanceRuleEvaluationNode;
}

const assignmentKey = (input: { courseId: string; assignmentId: string }): string => {
  return `${input.courseId}::${input.assignmentId}`;
};

export const extractBadgeIssuanceRuleRequirements = (
  definition: BadgeIssuanceRuleDefinition,
): BadgeIssuanceRuleRequirements => {
  const courseIds = new Set<string>();
  const assignmentRefs = new Map<string, { courseId: string; assignmentId: string }>();
  const prerequisiteBadgeTemplateIds = new Set<string>();

  const collect = (condition: BadgeIssuanceRuleCondition): void => {
    if ('all' in condition) {
      for (const child of condition.all) {
        collect(child);
      }
      return;
    }

    if ('any' in condition) {
      for (const child of condition.any) {
        collect(child);
      }
      return;
    }

    if ('not' in condition) {
      collect(condition.not);
      return;
    }

    switch (condition.type) {
      case 'grade_threshold':
      case 'course_completion':
        courseIds.add(condition.courseId);
        return;
      case 'program_completion':
        for (const courseId of condition.courseIds) {
          courseIds.add(courseId);
        }
        return;
      case 'assignment_submission': {
        courseIds.add(condition.courseId);
        assignmentRefs.set(
          assignmentKey({
            courseId: condition.courseId,
            assignmentId: condition.assignmentId,
          }),
          {
            courseId: condition.courseId,
            assignmentId: condition.assignmentId,
          },
        );
        return;
      }
      case 'prerequisite_badge':
        prerequisiteBadgeTemplateIds.add(condition.badgeTemplateId);
        return;
      case 'time_window':
        return;
    }
  };

  collect(definition.conditions);

  return {
    courseIds: Array.from(courseIds).sort(),
    assignmentRefs: Array.from(assignmentRefs.values()),
    prerequisiteBadgeTemplateIds: Array.from(prerequisiteBadgeTemplateIds).sort(),
  };
};

const evaluatePredicate = (
  condition: Exclude<BadgeIssuanceRuleCondition, { all: BadgeIssuanceRuleCondition[] } | { any: BadgeIssuanceRuleCondition[] } | { not: BadgeIssuanceRuleCondition }>,
  facts: BadgeIssuanceRuleEvaluationFacts,
): BadgeIssuanceRuleEvaluationNode => {
  switch (condition.type) {
    case 'grade_threshold': {
      const grade = facts.grades.find(
        (candidate) =>
          candidate.courseId === condition.courseId && candidate.learnerId === facts.learnerId,
      );

      if (grade === undefined) {
        return {
          type: 'grade_threshold',
          matched: false,
          detail: `No grade fact found for course ${condition.courseId}`,
        };
      }

      const scoreField = condition.scoreField ?? 'final_score';
      const score =
        scoreField === 'current_score'
          ? grade.currentScore
          : grade.finalScore ?? grade.currentScore;

      if (score === null) {
        return {
          type: 'grade_threshold',
          matched: false,
          detail: `Score is unavailable for course ${condition.courseId}`,
        };
      }

      if (condition.minScore !== undefined && score < condition.minScore) {
        return {
          type: 'grade_threshold',
          matched: false,
          detail: `Score ${score.toFixed(2)} is below minimum ${condition.minScore.toFixed(2)}`,
        };
      }

      if (condition.maxScore !== undefined && score > condition.maxScore) {
        return {
          type: 'grade_threshold',
          matched: false,
          detail: `Score ${score.toFixed(2)} exceeds maximum ${condition.maxScore.toFixed(2)}`,
        };
      }

      return {
        type: 'grade_threshold',
        matched: true,
        detail: `Score ${score.toFixed(2)} satisfies threshold for course ${condition.courseId}`,
      };
    }
    case 'course_completion': {
      const completion = facts.completions.find(
        (candidate) =>
          candidate.courseId === condition.courseId && candidate.learnerId === facts.learnerId,
      );

      if (completion === undefined) {
        return {
          type: 'course_completion',
          matched: false,
          detail: `No completion fact found for course ${condition.courseId}`,
        };
      }

      const requireCompleted = condition.requireCompleted ?? true;

      if (requireCompleted && !completion.completed) {
        return {
          type: 'course_completion',
          matched: false,
          detail: `Course ${condition.courseId} is not marked completed`,
        };
      }

      if (
        condition.minCompletionPercent !== undefined &&
        (completion.completionPercent === null || completion.completionPercent < condition.minCompletionPercent)
      ) {
        return {
          type: 'course_completion',
          matched: false,
          detail: `Completion percent for course ${condition.courseId} is below ${String(condition.minCompletionPercent)}`,
        };
      }

      return {
        type: 'course_completion',
        matched: true,
        detail: `Completion criteria satisfied for course ${condition.courseId}`,
      };
    }
    case 'program_completion': {
      const minimumCompleted = condition.minimumCompleted ?? condition.courseIds.length;
      let completedCount = 0;

      for (const courseId of condition.courseIds) {
        const completion = facts.completions.find(
          (candidate) => candidate.courseId === courseId && candidate.learnerId === facts.learnerId,
        );

        if (completion?.completed === true) {
          completedCount += 1;
        }
      }

      if (completedCount < minimumCompleted) {
        return {
          type: 'program_completion',
          matched: false,
          detail: `Completed ${String(completedCount)}/${String(condition.courseIds.length)} courses; requires ${String(minimumCompleted)}`,
        };
      }

      return {
        type: 'program_completion',
        matched: true,
        detail: `Completed ${String(completedCount)}/${String(condition.courseIds.length)} required courses`,
      };
    }
    case 'assignment_submission': {
      const submission = facts.submissions.find(
        (candidate) =>
          candidate.courseId === condition.courseId &&
          candidate.assignmentId === condition.assignmentId &&
          candidate.learnerId === facts.learnerId,
      );

      if (submission === undefined) {
        return {
          type: 'assignment_submission',
          matched: false,
          detail: `No submission found for assignment ${condition.assignmentId}`,
        };
      }

      const requireSubmitted = condition.requireSubmitted ?? true;
      const submitted =
        submission.submittedAt !== null ||
        (submission.workflowState !== null && submission.workflowState !== 'unsubmitted');

      if (requireSubmitted && !submitted) {
        return {
          type: 'assignment_submission',
          matched: false,
          detail: `Assignment ${condition.assignmentId} has not been submitted`,
        };
      }

      if (condition.minScore !== undefined && (submission.score === null || submission.score < condition.minScore)) {
        return {
          type: 'assignment_submission',
          matched: false,
          detail: `Assignment score is below required threshold ${String(condition.minScore)}`,
        };
      }

      if (
        condition.workflowStates !== undefined &&
        (submission.workflowState === null || !condition.workflowStates.includes(submission.workflowState))
      ) {
        return {
          type: 'assignment_submission',
          matched: false,
          detail: `Submission workflow state ${submission.workflowState ?? 'null'} is not allowed`,
        };
      }

      return {
        type: 'assignment_submission',
        matched: true,
        detail: `Submission criteria satisfied for assignment ${condition.assignmentId}`,
      };
    }
    case 'prerequisite_badge': {
      const matched = facts.earnedBadgeTemplateIds.includes(condition.badgeTemplateId);

      return {
        type: 'prerequisite_badge',
        matched,
        detail: matched
          ? `Prerequisite badge ${condition.badgeTemplateId} is present`
          : `Prerequisite badge ${condition.badgeTemplateId} is missing`,
      };
    }
    case 'time_window': {
      const nowMs = Date.parse(facts.nowIso);

      if (!Number.isFinite(nowMs)) {
        return {
          type: 'time_window',
          matched: false,
          detail: 'Evaluation timestamp is invalid',
        };
      }

      const notBeforeMs = condition.notBefore === undefined ? undefined : Date.parse(condition.notBefore);
      const notAfterMs = condition.notAfter === undefined ? undefined : Date.parse(condition.notAfter);

      if (notBeforeMs !== undefined && Number.isFinite(notBeforeMs) && nowMs < notBeforeMs) {
        return {
          type: 'time_window',
          matched: false,
          detail: `Current time is before ${String(condition.notBefore)}`,
        };
      }

      if (notAfterMs !== undefined && Number.isFinite(notAfterMs) && nowMs > notAfterMs) {
        return {
          type: 'time_window',
          matched: false,
          detail: `Current time is after ${String(condition.notAfter)}`,
        };
      }

      return {
        type: 'time_window',
        matched: true,
        detail: 'Evaluation timestamp is within allowed window',
      };
    }
  }
};

const evaluateCondition = (
  condition: BadgeIssuanceRuleCondition,
  facts: BadgeIssuanceRuleEvaluationFacts,
): BadgeIssuanceRuleEvaluationNode => {
  if ('all' in condition) {
    const children = condition.all.map((child) => evaluateCondition(child, facts));
    const matched = children.every((child) => child.matched);

    return {
      type: 'all',
      matched,
      detail: matched ? 'All conditions matched' : 'At least one condition failed',
      children,
    };
  }

  if ('any' in condition) {
    const children = condition.any.map((child) => evaluateCondition(child, facts));
    const matched = children.some((child) => child.matched);

    return {
      type: 'any',
      matched,
      detail: matched ? 'At least one condition matched' : 'No conditions matched',
      children,
    };
  }

  if ('not' in condition) {
    const child = evaluateCondition(condition.not, facts);

    return {
      type: 'not',
      matched: !child.matched,
      detail: !child.matched ? 'Negated condition matched' : 'Negated condition failed',
      children: [child],
    };
  }

  return evaluatePredicate(condition, facts);
};

export const evaluateBadgeIssuanceRuleDefinition = (
  definition: BadgeIssuanceRuleDefinition,
  facts: BadgeIssuanceRuleEvaluationFacts,
): BadgeIssuanceRuleEvaluationResult => {
  const tree = evaluateCondition(definition.conditions, facts);

  return {
    matched: tree.matched,
    tree,
  };
};
