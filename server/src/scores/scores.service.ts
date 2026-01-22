import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Criterion } from '../entities/criterion.entity';
import { Seat } from '../entities/seat.entity';
import { Event } from '../entities/event.entity';
import { CreateScoreDto } from './dto/create-score.dto';
import { UpdateScoreDto } from './dto/update-score.dto';

/**
 * Seat context from JWT for judge authentication.
 */
export interface SeatContext {
  eventId: string;
  tableId: string;
  seatId: string;
  seatNumber: number;
}

/**
 * Service for managing score entities.
 * Handles score creation, validation against event scoring scale, and authorization.
 */
@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Criterion)
    private readonly criterionRepository: Repository<Criterion>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  /**
   * Create a single score.
   * Validates score value against event's scoring scale.
   * Enforces uniqueness: one score per submission+seat+criterion.
   */
  async create(
    submissionId: string,
    createScoreDto: CreateScoreDto,
    seatContext: SeatContext,
  ): Promise<Score> {
    const submission = await this.getSubmissionWithValidation(submissionId, seatContext.eventId);
    const criterion = await this.getCriterionWithValidation(
      createScoreDto.criterionId,
      seatContext.eventId,
    );
    const event = await this.getEvent(seatContext.eventId);

    this.validateScoreValue(createScoreDto.scoreValue, event);

    const existingScore = await this.scoreRepository.findOne({
      where: {
        submissionId,
        seatId: seatContext.seatId,
        criterionId: createScoreDto.criterionId,
      },
    });

    if (existingScore) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'A score already exists for this submission, seat, and criterion',
      });
    }

    const score = this.scoreRepository.create({
      submissionId,
      seatId: seatContext.seatId,
      criterionId: createScoreDto.criterionId,
      scoreValue: createScoreDto.scoreValue,
      phase: createScoreDto.phase,
      comment: createScoreDto.comment || null,
      submittedAt: new Date(),
    });

    return this.scoreRepository.save(score);
  }

  /**
   * Create multiple scores in bulk.
   */
  async createBulk(
    submissionId: string,
    scores: CreateScoreDto[],
    seatContext: SeatContext,
  ): Promise<Score[]> {
    const submission = await this.getSubmissionWithValidation(submissionId, seatContext.eventId);
    const event = await this.getEvent(seatContext.eventId);

    const createdScores: Score[] = [];

    for (const scoreDto of scores) {
      const criterion = await this.getCriterionWithValidation(scoreDto.criterionId, seatContext.eventId);
      this.validateScoreValue(scoreDto.scoreValue, event);

      const existingScore = await this.scoreRepository.findOne({
        where: {
          submissionId,
          seatId: seatContext.seatId,
          criterionId: scoreDto.criterionId,
        },
      });

      if (existingScore) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: `A score already exists for criterion ${scoreDto.criterionId}`,
        });
      }

      const score = this.scoreRepository.create({
        submissionId,
        seatId: seatContext.seatId,
        criterionId: scoreDto.criterionId,
        scoreValue: scoreDto.scoreValue,
        phase: scoreDto.phase,
        comment: scoreDto.comment || null,
        submittedAt: new Date(),
      });

      const savedScore = await this.scoreRepository.save(score);
      createdScores.push(savedScore);
    }

    return createdScores;
  }

  /**
   * Find all scores for a submission.
   */
  async findBySubmission(submissionId: string): Promise<Score[]> {
    return this.scoreRepository.find({
      where: { submissionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find a score by ID.
   */
  async findOne(id: string): Promise<Score> {
    const score = await this.scoreRepository.findOne({ where: { id } });

    if (!score) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Score not found',
      });
    }

    return score;
  }

  /**
   * Update a score by ID.
   * Restricts updates to own scores (seat JWT) or ADMIN.
   */
  async update(
    id: string,
    updateScoreDto: UpdateScoreDto,
    seatContext: SeatContext | null,
    isAdmin: boolean,
  ): Promise<Score> {
    const score = await this.findOne(id);

    if (!isAdmin && (!seatContext || score.seatId !== seatContext.seatId)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You can only update your own scores',
      });
    }

    if (updateScoreDto.scoreValue !== undefined) {
      const submission = await this.submissionRepository.findOne({
        where: { id: score.submissionId },
        relations: ['category'],
      });

      if (submission) {
        const event = await this.eventRepository.findOne({
          where: { id: submission.category.eventId },
        });

        if (event) {
          this.validateScoreValue(updateScoreDto.scoreValue, event);
        }
      }

      score.scoreValue = updateScoreDto.scoreValue;
    }

    if (updateScoreDto.comment !== undefined) {
      score.comment = updateScoreDto.comment;
    }

    return this.scoreRepository.save(score);
  }

  /**
   * Hard delete a score by ID.
   * Only ADMIN can delete scores.
   */
  async remove(id: string): Promise<void> {
    const score = await this.findOne(id);
    await this.scoreRepository.remove(score);
  }

  /**
   * Get submission with validation that it exists and belongs to the correct event.
   */
  private async getSubmissionWithValidation(
    submissionId: string,
    eventId: string,
  ): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['category'],
    });

    if (!submission) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Submission not found',
      });
    }

    if (submission.category.eventId !== eventId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Submission does not belong to your event',
      });
    }

    const validStatuses = [
      SubmissionStatus.TURNED_IN,
      SubmissionStatus.BEING_JUDGED,
      SubmissionStatus.SCORED,
    ];

    if (!validStatuses.includes(submission.status)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Submission must be in ${validStatuses.join(', ')} status to be scored`,
      });
    }

    return submission;
  }

  /**
   * Get criterion with validation that it exists and belongs to the correct event.
   */
  private async getCriterionWithValidation(
    criterionId: string,
    eventId: string,
  ): Promise<Criterion> {
    const criterion = await this.criterionRepository.findOne({
      where: { id: criterionId },
    });

    if (!criterion) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Criterion not found',
      });
    }

    if (criterion.eventId !== eventId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Criterion does not belong to your event',
      });
    }

    return criterion;
  }

  /**
   * Get event by ID.
   */
  private async getEvent(eventId: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    return event;
  }

  /**
   * Validate score value against event's scoring scale.
   * Score must be >= min, <= max, and divisible by step.
   */
  private validateScoreValue(scoreValue: number, event: Event): void {
    const min = Number(event.scoringScaleMin);
    const max = Number(event.scoringScaleMax);
    const step = Number(event.scoringScaleStep);

    if (scoreValue < min) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Score value must be at least ${min}`,
      });
    }

    if (scoreValue > max) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Score value must be at most ${max}`,
      });
    }

    const normalized = (scoreValue - min) / step;
    const isValidStep = Math.abs(normalized - Math.round(normalized)) < 0.0001;

    if (!isValidStep) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Score value must be divisible by ${step}`,
      });
    }
  }

  /**
   * Get seat by seatId with table loaded.
   */
  async getSeatWithTable(seatId: string): Promise<Seat | null> {
    return this.seatRepository.findOne({
      where: { id: seatId },
      relations: ['table'],
    });
  }
}
