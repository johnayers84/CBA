import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Query parameter for including soft-deleted records.
 * Only accessible to ADMIN users.
 */
export class SoftDeleteQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean = false;
}
