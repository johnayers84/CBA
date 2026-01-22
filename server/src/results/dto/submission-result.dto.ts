import { CriterionScoreDto } from './criterion-score.dto';

/**
 * Completion status for submission scoring.
 */
export enum CompletionStatus {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
  NONE = 'none',
}

/**
 * DTO representing the calculated result for a single submission.
 */
export class SubmissionResultDto {
  submissionId: string;
  teamId: string;
  teamName: string;
  teamNumber: number;
  categoryId: string;
  categoryName: string;
  criterionScores: CriterionScoreDto[];
  finalScore: number;
  completionStatus: CompletionStatus;
  totalJudges: number;
  scoredCriteriaCount: number;
  totalCriteriaCount: number;
}
