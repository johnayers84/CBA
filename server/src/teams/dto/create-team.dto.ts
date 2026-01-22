import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  IsPositive,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a single team.
 */
export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsInt()
  @IsPositive()
  teamNumber: number;
}

/**
 * DTO for bulk creating teams.
 */
export class CreateTeamsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @Type(() => CreateTeamDto)
  teams: CreateTeamDto[];
}
