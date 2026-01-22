import { Team } from '../../entities/team.entity';

/**
 * DTO for team responses.
 */
export class TeamResponseDto {
  id: string;
  eventId: string;
  name: string;
  teamNumber: number;
  barcodePayload: string;
  codeInvalidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a Team entity to TeamResponseDto.
   */
  static fromEntity(team: Team): TeamResponseDto {
    const dto = new TeamResponseDto();
    dto.id = team.id;
    dto.eventId = team.eventId;
    dto.name = team.name;
    dto.teamNumber = team.teamNumber;
    dto.barcodePayload = team.barcodePayload;
    dto.codeInvalidatedAt = team.codeInvalidatedAt;
    dto.createdAt = team.createdAt;
    dto.updatedAt = team.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Team entities to TeamResponseDtos.
   */
  static fromEntities(teams: Team[]): TeamResponseDto[] {
    return teams.map((team) => TeamResponseDto.fromEntity(team));
  }
}
