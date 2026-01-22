import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Table } from '../entities/table.entity';
import { Event } from '../entities/event.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

/**
 * Service for managing table entities.
 */
@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  /**
   * Generate a unique 64-character QR token.
   */
  private generateQrToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Verify that the event exists.
   */
  private async verifyEventExists(eventId: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }
  }

  /**
   * Create a single table for an event.
   */
  async create(eventId: string, createTableDto: CreateTableDto): Promise<Table> {
    await this.verifyEventExists(eventId);

    const existingTable = await this.tableRepository.findOne({
      where: { eventId, tableNumber: createTableDto.tableNumber },
    });

    if (existingTable) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Table number ${createTableDto.tableNumber} already exists for this event`,
      });
    }

    const table = this.tableRepository.create({
      eventId,
      tableNumber: createTableDto.tableNumber,
      qrToken: this.generateQrToken(),
    });

    return this.tableRepository.save(table);
  }

  /**
   * Bulk create tables for an event.
   */
  async createBulk(eventId: string, createTableDtos: CreateTableDto[]): Promise<Table[]> {
    await this.verifyEventExists(eventId);

    const tableNumbers = createTableDtos.map((dto) => dto.tableNumber);

    // Check for duplicates in the request
    const uniqueNumbers = new Set(tableNumbers);
    if (uniqueNumbers.size !== tableNumbers.length) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Duplicate table numbers in request',
      });
    }

    // Check for existing table numbers
    const existingTables = await this.tableRepository.find({
      where: { eventId, tableNumber: In(tableNumbers) },
    });

    if (existingTables.length > 0) {
      const existingNumbers = existingTables.map((t) => t.tableNumber);
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Table numbers already exist: ${existingNumbers.join(', ')}`,
      });
    }

    const tables = createTableDtos.map((dto) =>
      this.tableRepository.create({
        eventId,
        tableNumber: dto.tableNumber,
        qrToken: this.generateQrToken(),
      }),
    );

    return this.tableRepository.save(tables);
  }

  /**
   * Find all tables for an event.
   */
  async findAllByEvent(eventId: string, includeDeleted = false): Promise<Table[]> {
    await this.verifyEventExists(eventId);

    return this.tableRepository.find({
      where: { eventId },
      withDeleted: includeDeleted,
      order: { tableNumber: 'ASC' },
    });
  }

  /**
   * Find a table by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!table) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Table not found',
      });
    }

    return table;
  }

  /**
   * Update a table by ID.
   */
  async update(id: string, updateTableDto: UpdateTableDto): Promise<Table> {
    const table = await this.findOne(id);

    if (updateTableDto.tableNumber !== undefined && updateTableDto.tableNumber !== table.tableNumber) {
      const existingTable = await this.tableRepository.findOne({
        where: { eventId: table.eventId, tableNumber: updateTableDto.tableNumber },
      });

      if (existingTable) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: `Table number ${updateTableDto.tableNumber} already exists for this event`,
        });
      }

      table.tableNumber = updateTableDto.tableNumber;
    }

    return this.tableRepository.save(table);
  }

  /**
   * Regenerate the QR token for a table.
   */
  async regenerateToken(id: string): Promise<Table> {
    const table = await this.findOne(id);
    table.qrToken = this.generateQrToken();
    return this.tableRepository.save(table);
  }

  /**
   * Soft delete a table by ID.
   */
  async remove(id: string): Promise<void> {
    const table = await this.findOne(id);
    await this.tableRepository.softDelete(table.id);
  }
}
