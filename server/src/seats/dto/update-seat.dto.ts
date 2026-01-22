import { IsInt, IsPositive, IsOptional } from 'class-validator';

/**
 * DTO for updating an existing seat.
 */
export class UpdateSeatDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  seatNumber?: number;
}
