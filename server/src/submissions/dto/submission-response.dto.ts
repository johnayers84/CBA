import { Submission } from '../../entities/submission.entity';

/**
 * DTO for submission responses.
 */
export class SubmissionResponseDto {
  id: string;
  teamId: string;
  categoryId: string;
  status: string;
  turnedInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a Submission entity to SubmissionResponseDto.
   */
  static fromEntity(submission: Submission): SubmissionResponseDto {
    const dto = new SubmissionResponseDto();
    dto.id = submission.id;
    dto.teamId = submission.teamId;
    dto.categoryId = submission.categoryId;
    dto.status = submission.status;
    dto.turnedInAt = submission.turnedInAt;
    dto.createdAt = submission.createdAt;
    dto.updatedAt = submission.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Submission entities to SubmissionResponseDtos.
   */
  static fromEntities(submissions: Submission[]): SubmissionResponseDto[] {
    return submissions.map((submission) => SubmissionResponseDto.fromEntity(submission));
  }
}
