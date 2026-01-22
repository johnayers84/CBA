import { IsString, IsOptional, MaxLength, IsNumber, IsInt, Min } from 'class-validator';

/**
 * DTO for updating an existing criterion.
 */
export class UpdateCriterionDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
