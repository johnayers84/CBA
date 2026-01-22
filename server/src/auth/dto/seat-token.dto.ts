import { IsString, Length, IsInt, Min } from 'class-validator';

/**
 * Seat token request DTO for judge authentication via QR code.
 */
export class SeatTokenRequestDto {
  @IsString()
  @Length(64, 64)
  qrToken: string;

  @IsInt()
  @Min(1)
  seatNumber: number;
}

/**
 * Seat info returned in seat token response.
 */
export interface SeatInfo {
  eventId: string;
  tableId: string;
  seatNumber: number;
}

/**
 * Seat token response DTO with JWT token and seat info.
 */
export interface SeatTokenResponseDto {
  accessToken: string;
  expiresIn: number;
  seat: SeatInfo;
}
