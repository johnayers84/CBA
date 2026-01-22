import { Table } from '../../entities/table.entity';

/**
 * DTO for table responses.
 */
export class TableResponseDto {
  id: string;
  eventId: string;
  tableNumber: number;
  qrToken: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform a Table entity to TableResponseDto.
   */
  static fromEntity(table: Table): TableResponseDto {
    const dto = new TableResponseDto();
    dto.id = table.id;
    dto.eventId = table.eventId;
    dto.tableNumber = table.tableNumber;
    dto.qrToken = table.qrToken;
    dto.createdAt = table.createdAt;
    dto.updatedAt = table.updatedAt;
    return dto;
  }

  /**
   * Transform multiple Table entities to TableResponseDtos.
   */
  static fromEntities(tables: Table[]): TableResponseDto[] {
    return tables.map((table) => TableResponseDto.fromEntity(table));
  }
}
