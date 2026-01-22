import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a single criterion.
 */
export class CreateCriterionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number = 1.0;

  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;
}

/**
 * DTO for bulk creating criteria.
 */
export class CreateCriteriaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @Type(() => CreateCriterionDto)
  criteria: CreateCriterionDto[];
}
