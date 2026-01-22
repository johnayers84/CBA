import { CategoryResultsDto } from './category-results.dto';

/**
 * DTO representing a team's overall ranking across all categories.
 */
export class TeamOverallResultDto {
  teamId: string;
  teamName: string;
  teamNumber: number;
  rank: number;
  rankSum: number;
  totalScore: number;
  categoryRanks: { categoryId: string; categoryName: string; rank: number }[];
}

/**
 * DTO representing full event results with all categories and overall rankings.
 */
export class EventResultsDto {
  eventId: string;
  eventName: string;
  aggregationMethod: string;
  categoryResults: CategoryResultsDto[];
  overallRankings: TeamOverallResultDto[];
}
