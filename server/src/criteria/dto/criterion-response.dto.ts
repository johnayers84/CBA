import { Criterion } from '../../entities/criterion.entity';

/**
 * DTO for criterion responses.
 */
export class CriterionResponseDto {
  id: string;
  eventId: string;
  name: string;
  weight: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a Criterion entity to CriterionResponseDto.
   */
  static fromEntity(criterion: Criterion): CriterionResponseDto {
    const dto = new CriterionResponseDto();
    dto.id = criterion.id;
    dto.eventId = criterion.eventId;
    dto.name = criterion.name;
    dto.weight = Number(criterion.weight);
    dto.sortOrder = criterion.sortOrder;
    dto.createdAt = criterion.createdAt;
    dto.updatedAt = criterion.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Criterion entities to CriterionResponseDtos.
   */
  static fromEntities(criteria: Criterion[]): CriterionResponseDto[] {
    return criteria.map((criterion) => CriterionResponseDto.fromEntity(criterion));
  }
}
