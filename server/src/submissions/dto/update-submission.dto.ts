import { IsEnum, IsOptional } from 'class-validator';
import { SubmissionStatus } from '../../entities/submission.entity';

/**
 * DTO for updating an existing submission.
 * Only status can be updated via this DTO.
 */
export class UpdateSubmissionDto {
  @IsEnum(SubmissionStatus)
  @IsOptional()
  status?: SubmissionStatus;
}
