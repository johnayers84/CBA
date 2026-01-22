import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO for creating a new submission.
 */
export class CreateSubmissionDto {
  @IsUUID()
  @IsNotEmpty()
  teamId: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
