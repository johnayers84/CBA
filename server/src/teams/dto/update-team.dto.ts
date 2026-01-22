import { IsString, IsOptional, MaxLength, IsInt, IsPositive } from 'class-validator';

/**
 * DTO for updating an existing team.
 */
export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  teamNumber?: number;
}
