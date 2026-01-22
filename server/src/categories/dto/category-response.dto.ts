import { Category } from '../../entities/category.entity';

/**
 * DTO for category responses.
 */
export class CategoryResponseDto {
  id: string;
  eventId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a Category entity to CategoryResponseDto.
   */
  static fromEntity(category: Category): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.eventId = category.eventId;
    dto.name = category.name;
    dto.sortOrder = category.sortOrder;
    dto.createdAt = category.createdAt;
    dto.updatedAt = category.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Category entities to CategoryResponseDtos.
   */
  static fromEntities(categories: Category[]): CategoryResponseDto[] {
    return categories.map((category) => CategoryResponseDto.fromEntity(category));
  }
}
