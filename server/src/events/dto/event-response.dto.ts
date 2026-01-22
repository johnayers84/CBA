import { Event } from '../../entities/event.entity';

/**
 * DTO for event responses.
 */
export class EventResponseDto {
  id: string;
  name: string;
  date: string;
  location: string | null;
  status: string;
  scoringScaleMin: number;
  scoringScaleMax: number;
  scoringScaleStep: number;
  aggregationMethod: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform an Event entity to EventResponseDto.
   */
  static fromEntity(event: Event): EventResponseDto {
    const dto = new EventResponseDto();
    dto.id = event.id;
    dto.name = event.name;
    dto.date = event.date instanceof Date ? event.date.toISOString().split('T')[0] : String(event.date);
    dto.location = event.location;
    dto.status = event.status;
    dto.scoringScaleMin = Number(event.scoringScaleMin);
    dto.scoringScaleMax = Number(event.scoringScaleMax);
    dto.scoringScaleStep = Number(event.scoringScaleStep);
    dto.aggregationMethod = event.aggregationMethod;
    dto.createdAt = event.createdAt;
    dto.updatedAt = event.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Event entities to EventResponseDtos.
   */
  static fromEntities(events: Event[]): EventResponseDto[] {
    return events.map((event) => EventResponseDto.fromEntity(event));
  }
}
