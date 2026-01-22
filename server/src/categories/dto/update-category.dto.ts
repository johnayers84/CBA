import { IsString, IsOptional, MaxLength, IsInt } from 'class-validator';

/**
 * DTO for updating an existing category.
 */
export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
