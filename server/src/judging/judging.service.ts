import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Table } from '../entities/table.entity';
import { Seat } from '../entities/seat.entity';
import { Submission } from '../entities/submission.entity';
import { Score } from '../entities/score.entity';
import {
  TableAssignmentPlanDto,
  CategoryAssignmentPlanDto,
  SeatSequenceDto,
  NextSubmissionDto,
} from './dto';
import {
  generateAllSeatSequences,
  mapSequenceToSubmissions,
  shuffleWithSeed,
  stringToSeed,
  SequenceConfig,
  DEFAULT_CONFIG,
} from './helpers/seat-sequence.helper';

/**
 * Service for managing judging workflows including:
 * - Table assignment plan generation
 * - Seat sequence management
 * - Next submission routing
 */
@Injectable()
export class JudgingService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
  ) {}

  /**
   * Generate an assignment plan for a category.
   *
   * This distributes submissions across tables and generates
   * seat-specific evaluation sequences for the taste/texture phase.
   */
  async generateCategoryAssignmentPlan(
    categoryId: string,
    seed?: number,
  ): Promise<CategoryAssignmentPlanDto> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['event'],
    });

    if (!category) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Category not found',
      });
    }

    const eventId = category.eventId;

    // Get all tables for this event
    const tables = await this.tableRepository.find({
      where: { eventId },
      order: { tableNumber: 'ASC' },
    });

    if (tables.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'No tables configured for this event',
      });
    }

    // Get all submissions for this category
    const submissions = await this.submissionRepository.find({
      where: { categoryId },
      relations: ['team'],
      order: { createdAt: 'ASC' },
    });

    if (submissions.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'No submissions found for this category',
      });
    }

    // Generate or use provided seed
    const actualSeed =
      seed ?? stringToSeed(`${eventId}-${categoryId}-${Date.now()}`);

    // Shuffle submissions deterministically
    const shuffledSubmissions = shuffleWithSeed(submissions, actualSeed);

    // Distribute submissions across tables as evenly as possible
    const submissionsPerTable = this.distributeSubmissions(
      shuffledSubmissions.map((s) => s.id),
      tables.length,
    );

    // Generate assignment plan for each table
    const tablePlans: TableAssignmentPlanDto[] = [];

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const tableSubmissionIds = submissionsPerTable[i];

      if (tableSubmissionIds.length === 0) {
        continue; // Skip tables with no submissions
      }

      // Get seats for this table
      const seats = await this.seatRepository.find({
        where: { tableId: table.id },
        order: { seatNumber: 'ASC' },
      });

      const seatCount = seats.length || 6; // Default to 6 if no seats configured

      // Generate sequences for this table
      const config: SequenceConfig = {
        submissionCount: tableSubmissionIds.length,
        seatCount,
        entryPoint: DEFAULT_CONFIG.entryPoint,
      };

      const numericSequences = generateAllSeatSequences(config);

      // Map numeric sequences to actual submission IDs
      const seatSequences: SeatSequenceDto[] = [];
      for (const [seatNumber, sequence] of numericSequences) {
        const submissionSequence = mapSequenceToSubmissions(
          tableSubmissionIds,
          sequence,
        );
        seatSequences.push({
          seatNumber,
          sequence: submissionSequence,
        });
      }

      tablePlans.push({
        tableId: table.id,
        tableNumber: table.tableNumber,
        categoryId: category.id,
        categoryName: category.name,
        submissionIds: tableSubmissionIds,
        seatSequences,
        seed: actualSeed,
      });
    }

    return {
      categoryId: category.id,
      categoryName: category.name,
      eventId,
      totalSubmissions: submissions.length,
      totalTables: tablePlans.length,
      tablePlans,
    };
  }

  /**
   * Get the next submission for a judge to evaluate.
   *
   * For appearance phase: returns submissions in numeric order (1..N)
   * For taste/texture phase: returns submissions in seat-specific sequence order
   */
  async getNextSubmission(
    categoryId: string,
    tableId: string,
    seatId: string,
    phase: 'appearance' | 'taste_texture',
  ): Promise<NextSubmissionDto | null> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Category not found',
      });
    }

    const seat = await this.seatRepository.findOne({
      where: { id: seatId },
    });

    if (!seat || seat.tableId !== tableId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Seat not found or does not belong to table',
      });
    }

    // Get submissions assigned to this table for this category
    // For now, we'll compute the assignment on-the-fly
    // In production, this should be stored when the assignment plan is generated
    const submissions = await this.submissionRepository.find({
      where: { categoryId },
      order: { createdAt: 'ASC' },
    });

    if (submissions.length === 0) {
      return null;
    }

    // Get scores already submitted by this seat for this category
    const existingScores = await this.scoreRepository
      .createQueryBuilder('score')
      .innerJoin('score.submission', 'submission')
      .where('score.seatId = :seatId', { seatId })
      .andWhere('score.phase = :phase', { phase })
      .andWhere('submission.categoryId = :categoryId', { categoryId })
      .select('score.submissionId')
      .getMany();

    const scoredSubmissionIds = new Set(existingScores.map((s) => s.submissionId));

    // Determine sequence based on phase
    let sequence: string[];

    if (phase === 'appearance') {
      // Appearance: simple numeric order
      sequence = submissions.map((s) => s.id);
    } else {
      // Taste/texture: seat-specific sequence
      const config: SequenceConfig = {
        submissionCount: submissions.length,
        seatCount: 6, // Default
        entryPoint: DEFAULT_CONFIG.entryPoint,
      };

      const numericSequences = generateAllSeatSequences(config);
      const numericSequence = numericSequences.get(seat.seatNumber) || [];
      sequence = mapSequenceToSubmissions(
        submissions.map((s) => s.id),
        numericSequence,
      );
    }

    // Find next unscored submission in sequence
    let position = 0;
    for (const submissionId of sequence) {
      position++;
      if (!scoredSubmissionIds.has(submissionId)) {
        return {
          submissionId,
          submissionNumber: position,
          totalSubmissions: submissions.length,
          categoryId: category.id,
          categoryName: category.name,
          phase,
        };
      }
    }

    // All submissions scored
    return null;
  }

  /**
   * Get the evaluation sequence for a specific seat in a category.
   */
  async getSeatSequence(
    categoryId: string,
    tableId: string,
    seatNumber: number,
    phase: 'appearance' | 'taste_texture',
  ): Promise<string[]> {
    const submissions = await this.submissionRepository.find({
      where: { categoryId },
      order: { createdAt: 'ASC' },
    });

    if (submissions.length === 0) {
      return [];
    }

    if (phase === 'appearance') {
      return submissions.map((s) => s.id);
    }

    // Taste/texture: seat-specific sequence
    const config: SequenceConfig = {
      submissionCount: submissions.length,
      seatCount: 6,
      entryPoint: DEFAULT_CONFIG.entryPoint,
    };

    const numericSequences = generateAllSeatSequences(config);
    const numericSequence = numericSequences.get(seatNumber) || [];

    return mapSequenceToSubmissions(
      submissions.map((s) => s.id),
      numericSequence,
    );
  }

  /**
   * Distribute items across N buckets as evenly as possible.
   */
  private distributeSubmissions(items: string[], bucketCount: number): string[][] {
    const buckets: string[][] = Array.from({ length: bucketCount }, () => []);

    items.forEach((item, index) => {
      const bucketIndex = index % bucketCount;
      buckets[bucketIndex].push(item);
    });

    return buckets;
  }
}
