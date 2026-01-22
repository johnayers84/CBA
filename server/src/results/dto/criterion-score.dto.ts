/**
 * DTO representing aggregated scores for a single criterion.
 */
export class CriterionScoreDto {
  criterionId: string;
  criterionName: string;
  weight: number;
  aggregatedScore: number;
  judgeCount: number;
  individualScores: number[];
}
