import {
  IsString,
  IsOptional,
  MaxLength,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { EventStatus, AggregationMethod } from '../../entities/event.entity';

/**
 * DTO for updating an existing event.
 * All fields are optional.
 */
export class UpdateEventDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  scoringScaleMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  scoringScaleMax?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  scoringScaleStep?: number;

  @IsEnum(AggregationMethod)
  @IsOptional()
  aggregationMethod?: AggregationMethod;
}
