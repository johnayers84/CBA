import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating an existing score.
 */
export class UpdateScoreDto {
  @IsNumber()
  @IsOptional()
  scoreValue?: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
