import { SubmissionResultDto } from './submission-result.dto';

/**
 * Ranked submission result with rank position.
 */
export class RankedSubmissionResultDto extends SubmissionResultDto {
  rank: number;
}

/**
 * DTO representing results for a category with rankings.
 */
export class CategoryResultsDto {
  categoryId: string;
  categoryName: string;
  eventId: string;
  aggregationMethod: string;
  results: RankedSubmissionResultDto[];
}
