import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { Team } from '../../entities/team.entity';

/**
 * Request DTO for barcode verification.
 */
export class VerifyBarcodeDto {
  @IsString()
  @IsNotEmpty()
  payload: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;
}

/**
 * Response DTO for barcode verification.
 */
export class VerifyBarcodeResponseDto {
  valid: boolean;
  error?: string;
  team?: {
    id: string;
    eventId: string;
    teamNumber: number;
    name: string;
  };

  static fromVerification(
    valid: boolean,
    team?: Team,
    error?: string,
  ): VerifyBarcodeResponseDto {
    const response = new VerifyBarcodeResponseDto();
    response.valid = valid;

    if (team) {
      response.team = {
        id: team.id,
        eventId: team.eventId,
        teamNumber: team.teamNumber,
        name: team.name,
      };
    }

    if (error) {
      response.error = error;
    }

    return response;
  }
}
