import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Seat } from '../entities/seat.entity';
import { Table } from '../entities/table.entity';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';

/**
 * Service for managing seat entities.
 */
@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  /**
   * Verify that the table exists.
   */
  private async verifyTableExists(tableId: string): Promise<void> {
    const table = await this.tableRepository.findOne({ where: { id: tableId } });
    if (!table) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Table not found',
      });
    }
  }

  /**
   * Create a single seat for a table.
   */
  async create(tableId: string, createSeatDto: CreateSeatDto): Promise<Seat> {
    await this.verifyTableExists(tableId);

    const existingSeat = await this.seatRepository.findOne({
      where: { tableId, seatNumber: createSeatDto.seatNumber },
    });

    if (existingSeat) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Seat number ${createSeatDto.seatNumber} already exists for this table`,
      });
    }

    const seat = this.seatRepository.create({
      tableId,
      seatNumber: createSeatDto.seatNumber,
    });

    return this.seatRepository.save(seat);
  }

  /**
   * Bulk create seats for a table.
   */
  async createBulk(tableId: string, createSeatDtos: CreateSeatDto[]): Promise<Seat[]> {
    await this.verifyTableExists(tableId);

    const seatNumbers = createSeatDtos.map((dto) => dto.seatNumber);

    // Check for duplicates in the request
    const uniqueNumbers = new Set(seatNumbers);
    if (uniqueNumbers.size !== seatNumbers.length) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Duplicate seat numbers in request',
      });
    }

    // Check for existing seat numbers
    const existingSeats = await this.seatRepository.find({
      where: { tableId, seatNumber: In(seatNumbers) },
    });

    if (existingSeats.length > 0) {
      const existingNumbers = existingSeats.map((s) => s.seatNumber);
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Seat numbers already exist: ${existingNumbers.join(', ')}`,
      });
    }

    const seats = createSeatDtos.map((dto) =>
      this.seatRepository.create({
        tableId,
        seatNumber: dto.seatNumber,
      }),
    );

    return this.seatRepository.save(seats);
  }

  /**
   * Find all seats for a table.
   */
  async findAllByTable(tableId: string, includeDeleted = false): Promise<Seat[]> {
    await this.verifyTableExists(tableId);

    return this.seatRepository.find({
      where: { tableId },
      withDeleted: includeDeleted,
      order: { seatNumber: 'ASC' },
    });
  }

  /**
   * Find a seat by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<Seat> {
    const seat = await this.seatRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!seat) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Seat not found',
      });
    }

    return seat;
  }

  /**
   * Update a seat by ID.
   */
  async update(id: string, updateSeatDto: UpdateSeatDto): Promise<Seat> {
    const seat = await this.findOne(id);

    if (updateSeatDto.seatNumber !== undefined && updateSeatDto.seatNumber !== seat.seatNumber) {
      const existingSeat = await this.seatRepository.findOne({
        where: { tableId: seat.tableId, seatNumber: updateSeatDto.seatNumber },
      });

      if (existingSeat) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: `Seat number ${updateSeatDto.seatNumber} already exists for this table`,
        });
      }

      seat.seatNumber = updateSeatDto.seatNumber;
    }

    return this.seatRepository.save(seat);
  }

  /**
   * Soft delete a seat by ID.
   */
  async remove(id: string): Promise<void> {
    const seat = await this.findOne(id);
    await this.seatRepository.softDelete(seat.id);
  }
}
