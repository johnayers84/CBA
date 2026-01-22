import { IsInt, IsPositive, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a single table.
 */
export class CreateTableDto {
  @IsInt()
  @IsPositive()
  tableNumber: number;
}

/**
 * DTO for bulk creating tables.
 */
export class CreateTablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Type(() => CreateTableDto)
  tables: CreateTableDto[];
}
