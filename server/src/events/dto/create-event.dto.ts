import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { EventStatus, AggregationMethod } from '../../entities/event.entity';

/**
 * DTO for creating a new event.
 */
export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus = EventStatus.DRAFT;

  @IsNumber()
  @IsOptional()
  @Min(0)
  scoringScaleMin?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(0)
  scoringScaleMax?: number = 9;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  scoringScaleStep?: number = 1;

  @IsEnum(AggregationMethod)
  @IsOptional()
  aggregationMethod?: AggregationMethod = AggregationMethod.MEAN;
}
