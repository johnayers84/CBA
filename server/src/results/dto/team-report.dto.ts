import { CriterionScoreDto } from './criterion-score.dto';
import { CompletionStatus } from './submission-result.dto';

/**
 * A team's result for a single category.
 */
export class TeamCategoryResultDto {
  categoryId: string;
  categoryName: string;
  submissionId: string;
  rank: number;
  totalEntries: number;
  finalScore: number;
  criterionScores: CriterionScoreDto[];
  completionStatus: CompletionStatus;
}

/**
 * Complete team report with all category results and overall standing.
 */
export class TeamReportDto {
  eventId: string;
  eventName: string;
  teamId: string;
  teamName: string;
  teamNumber: number;
  overallRank: number;
  totalTeams: number;
  rankSum: number;
  totalScore: number;
  categoryResults: TeamCategoryResultDto[];
  generatedAt: string;
}
