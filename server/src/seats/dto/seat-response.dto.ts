import { Seat } from '../../entities/seat.entity';

/**
 * DTO for seat responses.
 */
export class SeatResponseDto {
  id: string;
  tableId: string;
  seatNumber: number;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a Seat entity to SeatResponseDto.
   */
  static fromEntity(seat: Seat): SeatResponseDto {
    const dto = new SeatResponseDto();
    dto.id = seat.id;
    dto.tableId = seat.tableId;
    dto.seatNumber = seat.seatNumber;
    dto.createdAt = seat.createdAt;
    dto.updatedAt = seat.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Seat entities to SeatResponseDtos.
   */
  static fromEntities(seats: Seat[]): SeatResponseDto[] {
    return seats.map((seat) => SeatResponseDto.fromEntity(seat));
  }
}
