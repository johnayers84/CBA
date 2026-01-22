import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScoringPhase } from '../../entities/score.entity';

/**
 * DTO for creating a single score.
 */
export class CreateScoreDto {
  @IsUUID()
  @IsNotEmpty()
  criterionId: string;

  @IsNumber()
  @IsNotEmpty()
  scoreValue: number;

  @IsEnum(ScoringPhase)
  @IsNotEmpty()
  phase: ScoringPhase;

  @IsString()
  @IsOptional()
  comment?: string;
}

/**
 * DTO for bulk creating scores.
 */
export class CreateScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScoreDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  scores: CreateScoreDto[];
}
