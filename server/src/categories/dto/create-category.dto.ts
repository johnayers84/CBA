import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a single category.
 */
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;
}

/**
 * DTO for bulk creating categories.
 */
export class CreateCategoriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @Type(() => CreateCategoryDto)
  categories: CreateCategoryDto[];
}
