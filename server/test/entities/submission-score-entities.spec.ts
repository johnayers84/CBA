import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { Event, EventStatus } from '../../src/entities/event.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { Submission, SubmissionStatus } from '../../src/entities/submission.entity';
import { Score, ScoringPhase } from '../../src/entities/score.entity';

/**
 * Test DataSource for submission and score entities.
 */
const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  username: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'cba_test',
  entities: [Event, Table, Seat, Category, Criterion, Team, Submission, Score],
  synchronize: true,
  dropSchema: true,
  logging: process.env.TEST_DB_LOGGING === 'true',
});

describe('Submission and Score Entities', () => {
  let eventRepo: Repository<Event>;
  let tableRepo: Repository<Table>;
  let seatRepo: Repository<Seat>;
  let categoryRepo: Repository<Category>;
  let criterionRepo: Repository<Criterion>;
  let teamRepo: Repository<Team>;
  let submissionRepo: Repository<Submission>;
  let scoreRepo: Repository<Score>;

  let testEvent: Event;
  let testTable: Table;
  let testSeat: Seat;
  let testCategory: Category;
  let testCriterion: Criterion;
  let testTeam: Team;

  beforeAll(async () => {
    await testDataSource.initialize();
    eventRepo = testDataSource.getRepository(Event);
    tableRepo = testDataSource.getRepository(Table);
    seatRepo = testDataSource.getRepository(Seat);
    categoryRepo = testDataSource.getRepository(Category);
    criterionRepo = testDataSource.getRepository(Criterion);
    teamRepo = testDataSource.getRepository(Team);
    submissionRepo = testDataSource.getRepository(Submission);
    scoreRepo = testDataSource.getRepository(Score);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);

    // Create prerequisite entities for testing
    testEvent = await eventRepo.save({
      name: 'Test BBQ Event',
      date: new Date('2026-06-15'),
      status: EventStatus.DRAFT,
    });

    testTable = await tableRepo.save({
      eventId: testEvent.id,
      tableNumber: 1,
      qrToken: 'test-qr-token-123',
    });

    testSeat = await seatRepo.save({
      tableId: testTable.id,
      seatNumber: 1,
    });

    testCategory = await categoryRepo.save({
      eventId: testEvent.id,
      name: 'Brisket',
      sortOrder: 1,
    });

    testCriterion = await criterionRepo.save({
      eventId: testEvent.id,
      name: 'Appearance',
      weight: 1.0,
      sortOrder: 1,
    });

    testTeam = await teamRepo.save({
      eventId: testEvent.id,
      name: 'Smokin Hot BBQ',
      teamNumber: 1,
      barcodePayload: 'AZTEC-PAYLOAD-12345',
    });
  });

  describe('Submission Entity', () => {
    it('creates a submission with team and category relationships', async () => {
      const submission = await submissionRepo.save({
        teamId: testTeam.id,
        categoryId: testCategory.id,
      });

      expect(submission.id).toBeDefined();
      expect(submission.teamId).toBe(testTeam.id);
      expect(submission.categoryId).toBe(testCategory.id);
      expect(submission.createdAt).toBeInstanceOf(Date);

      // Verify relationship loading
      const loadedSubmission = await submissionRepo.findOne({
        where: { id: submission.id },
        relations: ['team', 'category'],
      });

      expect(loadedSubmission?.team).toBeDefined();
      expect(loadedSubmission?.team.id).toBe(testTeam.id);
      expect(loadedSubmission?.category).toBeDefined();
      expect(loadedSubmission?.category.id).toBe(testCategory.id);
    });

    it('enforces unique constraint on (team_id, category_id)', async () => {
      await submissionRepo.save({
        teamId: testTeam.id,
        categoryId: testCategory.id,
      });

      // Attempting to create another submission for the same team/category should fail
      await expect(
        submissionRepo.save({
          teamId: testTeam.id,
          categoryId: testCategory.id,
        }),
      ).rejects.toThrow();
    });

    it('validates status enum and uses default value', async () => {
      // Test default value
      const submissionWithDefault = await submissionRepo.save({
        teamId: testTeam.id,
        categoryId: testCategory.id,
      });

      expect(submissionWithDefault.status).toBe(SubmissionStatus.PENDING);

      // Test explicit status values
      const testTeam2 = await teamRepo.save({
        eventId: testEvent.id,
        name: 'BBQ Masters',
        teamNumber: 2,
        barcodePayload: 'AZTEC-PAYLOAD-67890',
      });

      const submissionTurnedIn = await submissionRepo.save({
        teamId: testTeam2.id,
        categoryId: testCategory.id,
        status: SubmissionStatus.TURNED_IN,
        turnedInAt: new Date(),
      });

      expect(submissionTurnedIn.status).toBe(SubmissionStatus.TURNED_IN);
      expect(submissionTurnedIn.turnedInAt).toBeInstanceOf(Date);
    });
  });

  describe('Score Entity', () => {
    it('creates a score with all three foreign keys (submission, seat, criterion)', async () => {
      const submission = await submissionRepo.save({
        teamId: testTeam.id,
        categoryId: testCategory.id,
        status: SubmissionStatus.BEING_JUDGED,
      });

      const score = await scoreRepo.save({
        submissionId: submission.id,
        seatId: testSeat.id,
        criterionId: testCriterion.id,
        scoreValue: 8.5,
        comment: 'Excellent presentation',
        phase: ScoringPhase.APPEARANCE,
      });

      expect(score.id).toBeDefined();
      expect(score.submissionId).toBe(submission.id);
      expect(score.seatId).toBe(testSeat.id);
      expect(score.criterionId).toBe(testCriterion.id);
      expect(Number(score.scoreValue)).toBe(8.5);
      expect(score.comment).toBe('Excellent presentation');
      expect(score.phase).toBe(ScoringPhase.APPEARANCE);
      expect(score.submittedAt).toBeInstanceOf(Date);
      expect(score.createdAt).toBeInstanceOf(Date);

      // Verify relationship loading
      const loadedScore = await scoreRepo.findOne({
        where: { id: score.id },
        relations: ['submission', 'seat', 'criterion'],
      });

      expect(loadedScore?.submission).toBeDefined();
      expect(loadedScore?.submission.id).toBe(submission.id);
      expect(loadedScore?.seat).toBeDefined();
      expect(loadedScore?.seat.id).toBe(testSeat.id);
      expect(loadedScore?.criterion).toBeDefined();
      expect(loadedScore?.criterion.id).toBe(testCriterion.id);
    });

    it('enforces unique constraint on (submission_id, seat_id, criterion_id)', async () => {
      const submission = await submissionRepo.save({
        teamId: testTeam.id,
        categoryId: testCategory.id,
        status: SubmissionStatus.BEING_JUDGED,
      });

      await scoreRepo.save({
        submissionId: submission.id,
        seatId: testSeat.id,
        criterionId: testCriterion.id,
        scoreValue: 7.0,
        phase: ScoringPhase.APPEARANCE,
      });

      // Attempting to create another score for the same submission/seat/criterion should fail
      await expect(
        scoreRepo.save({
          submissionId: submission.id,
          seatId: testSeat.id,
          criterionId: testCriterion.id,
          scoreValue: 8.0,
          phase: ScoringPhase.APPEARANCE,
        }),
      ).rejects.toThrow();
    });

    it('does NOT have soft delete (no deleted_at column)', async () => {
      const submission = await submissionRepo.save({
        teamId: testTeam.id,
        categoryId: testCategory.id,
        status: SubmissionStatus.BEING_JUDGED,
      });

      const score = await scoreRepo.save({
        submissionId: submission.id,
        seatId: testSeat.id,
        criterionId: testCriterion.id,
        scoreValue: 7.5,
        phase: ScoringPhase.TASTE_TEXTURE,
      });

      // Verify the Score entity does not have a deletedAt property
      expect('deletedAt' in score).toBe(false);

      // Verify the score table does not have a deleted_at column
      const columns = await testDataSource.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'scores'
      `);

      const columnNames = columns.map(
        (col: { column_name: string }) => col.column_name,
      );
      expect(columnNames).not.toContain('deleted_at');
    });
  });
});
