import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from '../entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

/**
 * Valid status transitions for events.
 */
const VALID_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.ACTIVE],
  [EventStatus.ACTIVE]: [EventStatus.FINALIZED],
  [EventStatus.FINALIZED]: [EventStatus.ARCHIVED],
  [EventStatus.ARCHIVED]: [],
};

/**
 * Service for managing event entities.
 */
@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  /**
   * Create a new event.
   */
  async create(createEventDto: CreateEventDto): Promise<Event> {
    this.validateScoringScale(
      createEventDto.scoringScaleMin ?? 1,
      createEventDto.scoringScaleMax ?? 9,
    );

    const event = this.eventRepository.create({
      name: createEventDto.name,
      date: new Date(createEventDto.date),
      location: createEventDto.location ?? null,
      status: createEventDto.status ?? EventStatus.DRAFT,
      scoringScaleMin: createEventDto.scoringScaleMin ?? 1,
      scoringScaleMax: createEventDto.scoringScaleMax ?? 9,
      scoringScaleStep: createEventDto.scoringScaleStep ?? 1,
      aggregationMethod: createEventDto.aggregationMethod,
    });

    return this.eventRepository.save(event);
  }

  /**
   * Find all events, optionally including soft-deleted ones.
   */
  async findAll(includeDeleted = false): Promise<Event[]> {
    if (includeDeleted) {
      return this.eventRepository.find({ withDeleted: true });
    }
    return this.eventRepository.find();
  }

  /**
   * Find an event by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    return event;
  }

  /**
   * Update an event by ID.
   * For operators, only status changes are allowed (handled in controller).
   */
  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (updateEventDto.status && updateEventDto.status !== event.status) {
      this.validateStatusTransition(event.status, updateEventDto.status);
    }

    if (
      updateEventDto.scoringScaleMin !== undefined ||
      updateEventDto.scoringScaleMax !== undefined
    ) {
      const min = updateEventDto.scoringScaleMin ?? Number(event.scoringScaleMin);
      const max = updateEventDto.scoringScaleMax ?? Number(event.scoringScaleMax);
      this.validateScoringScale(min, max);
    }

    if (updateEventDto.name !== undefined) {
      event.name = updateEventDto.name;
    }

    if (updateEventDto.date !== undefined) {
      event.date = new Date(updateEventDto.date);
    }

    if (updateEventDto.location !== undefined) {
      event.location = updateEventDto.location;
    }

    if (updateEventDto.status !== undefined) {
      event.status = updateEventDto.status;
    }

    if (updateEventDto.scoringScaleMin !== undefined) {
      event.scoringScaleMin = updateEventDto.scoringScaleMin;
    }

    if (updateEventDto.scoringScaleMax !== undefined) {
      event.scoringScaleMax = updateEventDto.scoringScaleMax;
    }

    if (updateEventDto.scoringScaleStep !== undefined) {
      event.scoringScaleStep = updateEventDto.scoringScaleStep;
    }

    if (updateEventDto.aggregationMethod !== undefined) {
      event.aggregationMethod = updateEventDto.aggregationMethod;
    }

    return this.eventRepository.save(event);
  }

  /**
   * Update only the status of an event (for operators).
   */
  async updateStatus(id: string, status: EventStatus): Promise<Event> {
    const event = await this.findOne(id);
    this.validateStatusTransition(event.status, status);
    event.status = status;
    return this.eventRepository.save(event);
  }

  /**
   * Soft delete an event by ID.
   */
  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.softDelete(event.id);
  }

  /**
   * Validate that scoringScaleMin is less than scoringScaleMax.
   */
  private validateScoringScale(min: number, max: number): void {
    if (min >= max) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'scoringScaleMin must be less than scoringScaleMax',
      });
    }
  }

  /**
   * Validate that the status transition is allowed.
   */
  private validateStatusTransition(currentStatus: EventStatus, newStatus: EventStatus): void {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      throw new UnprocessableEntityException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
      });
    }
  }
}
