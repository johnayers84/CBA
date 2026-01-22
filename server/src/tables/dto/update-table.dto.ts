import { IsInt, IsPositive, IsOptional } from 'class-validator';

/**
 * DTO for updating an existing table.
 */
export class UpdateTableDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  tableNumber?: number;
}
