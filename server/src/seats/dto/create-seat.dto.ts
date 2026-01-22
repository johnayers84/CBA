import { IsInt, IsPositive, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a single seat.
 */
export class CreateSeatDto {
  @IsInt()
  @IsPositive()
  seatNumber: number;
}

/**
 * DTO for bulk creating seats.
 */
export class CreateSeatsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @Type(() => CreateSeatDto)
  seats: CreateSeatDto[];
}
