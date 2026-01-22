import { Score } from '../../entities/score.entity';

/**
 * DTO for score responses.
 */
export class ScoreResponseDto {
  id: string;
  submissionId: string;
  seatId: string;
  criterionId: string;
  scoreValue: number;
  comment: string | null;
  phase: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a Score entity to ScoreResponseDto.
   */
  static fromEntity(score: Score): ScoreResponseDto {
    const dto = new ScoreResponseDto();
    dto.id = score.id;
    dto.submissionId = score.submissionId;
    dto.seatId = score.seatId;
    dto.criterionId = score.criterionId;
    dto.scoreValue = Number(score.scoreValue);
    dto.comment = score.comment;
    dto.phase = score.phase;
    dto.submittedAt = score.submittedAt;
    dto.createdAt = score.createdAt;
    dto.updatedAt = score.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Score entities to ScoreResponseDtos.
   */
  static fromEntities(scores: Score[]): ScoreResponseDto[] {
    return scores.map((score) => ScoreResponseDto.fromEntity(score));
  }
}
