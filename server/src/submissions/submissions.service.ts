import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Team } from '../entities/team.entity';
import { Category } from '../entities/category.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

/**
 * Valid status transitions for submissions.
 * Status workflow: pending -> turned_in -> being_judged -> scored -> finalized
 */
const VALID_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  [SubmissionStatus.PENDING]: [SubmissionStatus.TURNED_IN],
  [SubmissionStatus.TURNED_IN]: [SubmissionStatus.BEING_JUDGED],
  [SubmissionStatus.BEING_JUDGED]: [SubmissionStatus.SCORED],
  [SubmissionStatus.SCORED]: [SubmissionStatus.FINALIZED],
  [SubmissionStatus.FINALIZED]: [],
};

/**
 * Service for managing submission entities.
 * Handles CRUD operations and workflow status transitions.
 */
@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Create a new submission.
   * Validates team + category uniqueness (one submission per team per category).
   */
  async create(createSubmissionDto: CreateSubmissionDto): Promise<Submission> {
    const { teamId, categoryId } = createSubmissionDto;

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Team not found',
      });
    }

    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Category not found',
      });
    }

    if (team.eventId !== category.eventId) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Team and category must belong to the same event',
      });
    }

    const existingSubmission = await this.submissionRepository.findOne({
      where: { teamId, categoryId },
    });

    if (existingSubmission) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'A submission already exists for this team and category',
      });
    }

    const submission = this.submissionRepository.create({
      teamId,
      categoryId,
      status: SubmissionStatus.PENDING,
    });

    return this.submissionRepository.save(submission);
  }

  /**
   * Find all submissions for an event.
   */
  async findByEvent(eventId: string, includeDeleted = false): Promise<Submission[]> {
    const queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.category', 'category')
      .where('category.eventId = :eventId', { eventId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getMany();
  }

  /**
   * Find all submissions for a category.
   */
  async findByCategory(categoryId: string, includeDeleted = false): Promise<Submission[]> {
    if (includeDeleted) {
      return this.submissionRepository.find({
        where: { categoryId },
        withDeleted: true,
      });
    }
    return this.submissionRepository.find({ where: { categoryId } });
  }

  /**
   * Find a submission by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!submission) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Submission not found',
      });
    }

    return submission;
  }

  /**
   * Update a submission by ID.
   */
  async update(id: string, updateSubmissionDto: UpdateSubmissionDto): Promise<Submission> {
    const submission = await this.findOne(id);

    if (updateSubmissionDto.status && updateSubmissionDto.status !== submission.status) {
      this.validateStatusTransition(submission.status, updateSubmissionDto.status);
      submission.status = updateSubmissionDto.status;

      if (updateSubmissionDto.status === SubmissionStatus.TURNED_IN) {
        submission.turnedInAt = new Date();
      }
    }

    return this.submissionRepository.save(submission);
  }

  /**
   * Soft delete a submission by ID.
   */
  async remove(id: string): Promise<void> {
    const submission = await this.findOne(id);
    await this.submissionRepository.softDelete(submission.id);
  }

  /**
   * Mark submission as turned in.
   * Sets status to TURNED_IN and records timestamp.
   */
  async turnIn(id: string): Promise<Submission> {
    const submission = await this.findOne(id);

    this.validateStatusTransition(submission.status, SubmissionStatus.TURNED_IN);

    submission.status = SubmissionStatus.TURNED_IN;
    submission.turnedInAt = new Date();

    return this.submissionRepository.save(submission);
  }

  /**
   * Mark submission as being judged.
   * Sets status to BEING_JUDGED.
   */
  async startJudging(id: string): Promise<Submission> {
    const submission = await this.findOne(id);

    this.validateStatusTransition(submission.status, SubmissionStatus.BEING_JUDGED);

    submission.status = SubmissionStatus.BEING_JUDGED;

    return this.submissionRepository.save(submission);
  }

  /**
   * Mark submission as finalized.
   * Sets status to FINALIZED.
   */
  async finalize(id: string): Promise<Submission> {
    const submission = await this.findOne(id);

    this.validateStatusTransition(submission.status, SubmissionStatus.FINALIZED);

    submission.status = SubmissionStatus.FINALIZED;

    return this.submissionRepository.save(submission);
  }

  /**
   * Mark submission as scored.
   * Sets status to SCORED.
   */
  async markScored(id: string): Promise<Submission> {
    const submission = await this.findOne(id);

    this.validateStatusTransition(submission.status, SubmissionStatus.SCORED);

    submission.status = SubmissionStatus.SCORED;

    return this.submissionRepository.save(submission);
  }

  /**
   * Validate that a status transition is allowed.
   * Throws UnprocessableEntityException if transition is invalid.
   */
  private validateStatusTransition(
    currentStatus: SubmissionStatus,
    newStatus: SubmissionStatus,
  ): void {
    const validNextStatuses = VALID_TRANSITIONS[currentStatus];

    if (!validNextStatuses.includes(newStatus)) {
      throw new UnprocessableEntityException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
      });
    }
  }

  /**
   * Get submission with loaded relations (for authorization checks).
   */
  async findOneWithRelations(id: string): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      relations: ['category', 'team'],
    });

    if (!submission) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Submission not found',
      });
    }

    return submission;
  }
}
