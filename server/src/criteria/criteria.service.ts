import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Criterion } from '../entities/criterion.entity';
import { Event } from '../entities/event.entity';
import { CreateCriterionDto } from './dto/create-criterion.dto';
import { UpdateCriterionDto } from './dto/update-criterion.dto';

/**
 * Service for managing criterion entities.
 */
@Injectable()
export class CriteriaService {
  constructor(
    @InjectRepository(Criterion)
    private readonly criterionRepository: Repository<Criterion>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

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
   * Create a single criterion for an event.
   */
  async create(eventId: string, createCriterionDto: CreateCriterionDto): Promise<Criterion> {
    await this.verifyEventExists(eventId);

    const existingCriterion = await this.criterionRepository.findOne({
      where: { eventId, name: createCriterionDto.name },
    });

    if (existingCriterion) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Criterion "${createCriterionDto.name}" already exists for this event`,
      });
    }

    const criterion = this.criterionRepository.create({
      eventId,
      name: createCriterionDto.name,
      weight: createCriterionDto.weight ?? 1.0,
      sortOrder: createCriterionDto.sortOrder ?? 0,
    });

    return this.criterionRepository.save(criterion);
  }

  /**
   * Bulk create criteria for an event.
   */
  async createBulk(eventId: string, createCriterionDtos: CreateCriterionDto[]): Promise<Criterion[]> {
    await this.verifyEventExists(eventId);

    const criterionNames = createCriterionDtos.map((dto) => dto.name);

    // Check for duplicates in the request
    const uniqueNames = new Set(criterionNames);
    if (uniqueNames.size !== criterionNames.length) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Duplicate criterion names in request',
      });
    }

    // Check for existing criterion names
    const existingCriteria = await this.criterionRepository.find({
      where: { eventId, name: In(criterionNames) },
    });

    if (existingCriteria.length > 0) {
      const existingNames = existingCriteria.map((c) => c.name);
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Criterion names already exist: ${existingNames.join(', ')}`,
      });
    }

    const criteria = createCriterionDtos.map((dto) =>
      this.criterionRepository.create({
        eventId,
        name: dto.name,
        weight: dto.weight ?? 1.0,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );

    return this.criterionRepository.save(criteria);
  }

  /**
   * Find all criteria for an event.
   */
  async findAllByEvent(eventId: string, includeDeleted = false): Promise<Criterion[]> {
    await this.verifyEventExists(eventId);

    return this.criterionRepository.find({
      where: { eventId },
      withDeleted: includeDeleted,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Find a criterion by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<Criterion> {
    const criterion = await this.criterionRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!criterion) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Criterion not found',
      });
    }

    return criterion;
  }

  /**
   * Update a criterion by ID.
   */
  async update(id: string, updateCriterionDto: UpdateCriterionDto): Promise<Criterion> {
    const criterion = await this.findOne(id);

    if (updateCriterionDto.name !== undefined && updateCriterionDto.name !== criterion.name) {
      const existingCriterion = await this.criterionRepository.findOne({
        where: { eventId: criterion.eventId, name: updateCriterionDto.name },
      });

      if (existingCriterion) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: `Criterion "${updateCriterionDto.name}" already exists for this event`,
        });
      }

      criterion.name = updateCriterionDto.name;
    }

    if (updateCriterionDto.weight !== undefined) {
      criterion.weight = updateCriterionDto.weight;
    }

    if (updateCriterionDto.sortOrder !== undefined) {
      criterion.sortOrder = updateCriterionDto.sortOrder;
    }

    return this.criterionRepository.save(criterion);
  }

  /**
   * Soft delete a criterion by ID.
   */
  async remove(id: string): Promise<void> {
    const criterion = await this.findOne(id);
    await this.criterionRepository.softDelete(criterion.id);
  }
}
