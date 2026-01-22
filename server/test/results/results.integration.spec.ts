/**
 * Integration Tests for Results Service with PostgreSQL Database.
 *
 * These tests validate the score calculation engine against the actual database,
 * including score aggregation, weighted scoring, rankings, and tie handling.
 *
 * Test Coverage:
 * 1. Single submission result calculation with MEAN aggregation
 * 2. Single submission result calculation with TRIMMED_MEAN aggregation
 * 3. Trimmed mean fallback to mean with < 3 judges
 * 4. Category results with rankings
 * 5. Tie handling in rankings
 * 6. Event-wide results with overall team rankings
 * 7. Partial completion status for incomplete scoring
 * 8. Weighted criterion scoring
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';

import { entities } from '../../src/entities';
import { Event, AggregationMethod } from '../../src/entities/event.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { Submission, SubmissionStatus } from '../../src/entities/submission.entity';
import { Score, ScoringPhase } from '../../src/entities/score.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { ResultsService } from '../../src/results/results.service';
import { CompletionStatus } from '../../src/results/dto';
import {
  createFactoryContext,
  resetFactoryCounters,
  createTestEvent,
  createTestTable,
  createTestSeat,
  createTestCategory,
  createTestCriterion,
  createTestTeam,
  createTestSubmission,
  createTestScore,
  FactoryContext,
} from '../factories';

/**
 * Test DataSource for integration tests with all entities.
 */
const integrationTestDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  username: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'cba_test',
  entities,
  synchronize: true,
  dropSchema: true,
  logging: process.env.TEST_DB_LOGGING === 'true',
});

describe('Results Service Integration Tests', () => {
  let ctx: FactoryContext;
  let resultsService: ResultsService;
  let eventRepo: Repository<Event>;
  let categoryRepo: Repository<Category>;
  let criterionRepo: Repository<Criterion>;
  let teamRepo: Repository<Team>;
  let submissionRepo: Repository<Submission>;
  let scoreRepo: Repository<Score>;
  let tableRepo: Repository<Table>;
  let seatRepo: Repository<Seat>;

  beforeAll(async () => {
    if (!integrationTestDataSource.isInitialized) {
      try {
        await integrationTestDataSource.initialize();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('ECONNREFUSED')) {
          throw new Error(
            'Database connection refused. Ensure PostgreSQL is running.\n' +
              'Run: docker compose up -d postgres-test\n',
          );
        }
        throw error;
      }
    }

    ctx = createFactoryContext(integrationTestDataSource);
    eventRepo = integrationTestDataSource.getRepository(Event);
    categoryRepo = integrationTestDataSource.getRepository(Category);
    criterionRepo = integrationTestDataSource.getRepository(Criterion);
    teamRepo = integrationTestDataSource.getRepository(Team);
    submissionRepo = integrationTestDataSource.getRepository(Submission);
    scoreRepo = integrationTestDataSource.getRepository(Score);
    tableRepo = integrationTestDataSource.getRepository(Table);
    seatRepo = integrationTestDataSource.getRepository(Seat);

    // Create ResultsService with actual repositories
    resultsService = new ResultsService(
      scoreRepo,
      submissionRepo,
      criterionRepo,
      categoryRepo,
      eventRepo,
      teamRepo,
      seatRepo,
    );
  });

  afterAll(async () => {
    if (integrationTestDataSource.isInitialized) {
      await integrationTestDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await integrationTestDataSource.synchronize(true);
    resetFactoryCounters(ctx);
  });

  describe('Single Submission Result Calculation', () => {
    /**
     * Test 1: Calculate submission result with MEAN aggregation
     */
    it('calculates submission result with MEAN aggregation', async () => {
      // Setup: Event with MEAN aggregation
      const event = await createTestEvent(ctx, {
        aggregationMethod: AggregationMethod.MEAN,
      });
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat1 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 1 });
      const seat2 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 2 });
      const category = await createTestCategory(ctx, { eventId: event.id, name: 'Brisket' });
      const criterion = await createTestCriterion(ctx, {
        eventId: event.id,
        name: 'Appearance',
        weight: 1.0,
      });
      const team = await createTestTeam(ctx, { eventId: event.id, name: 'Smoky Joes' });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
        status: SubmissionStatus.BEING_JUDGED,
      });

      // Create scores from 2 judges
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat1.id,
        criterionId: criterion.id,
        scoreValue: 8,
        phase: ScoringPhase.APPEARANCE,
      });
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat2.id,
        criterionId: criterion.id,
        scoreValue: 6,
        phase: ScoringPhase.APPEARANCE,
      });

      // Calculate result
      const result = await resultsService.getSubmissionResult(submission.id);

      // Verify
      expect(result.submissionId).toBe(submission.id);
      expect(result.teamId).toBe(team.id);
      expect(result.teamName).toBe('Smoky Joes');
      expect(result.categoryId).toBe(category.id);
      expect(result.categoryName).toBe('Brisket');
      expect(result.criterionScores).toHaveLength(1);
      expect(result.criterionScores[0].aggregatedScore).toBe(7); // (8 + 6) / 2
      expect(result.criterionScores[0].judgeCount).toBe(2);
      expect(result.finalScore).toBe(7);
    });

    /**
     * Test 2: Calculate submission result with TRIMMED_MEAN aggregation
     */
    it('calculates submission result with TRIMMED_MEAN aggregation (6 judges)', async () => {
      // Setup: Event with TRIMMED_MEAN aggregation
      const event = await createTestEvent(ctx, {
        aggregationMethod: AggregationMethod.TRIMMED_MEAN,
      });
      const table = await createTestTable(ctx, { eventId: event.id });

      // Create 6 seats/judges
      const seats: Seat[] = [];
      for (let i = 1; i <= 6; i++) {
        const seat = await createTestSeat(ctx, { tableId: table.id, seatNumber: i });
        seats.push(seat);
      }

      const category = await createTestCategory(ctx, { eventId: event.id });
      const criterion = await createTestCriterion(ctx, {
        eventId: event.id,
        name: 'Taste',
        weight: 1.0,
      });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // Scores: 1, 5, 6, 7, 8, 9 - trimmed mean should be (5+6+7+8)/4 = 6.5
      const scores = [1, 5, 6, 7, 8, 9];
      for (let i = 0; i < 6; i++) {
        await createTestScore(ctx, {
          submissionId: submission.id,
          seatId: seats[i].id,
          criterionId: criterion.id,
          scoreValue: scores[i],
          phase: ScoringPhase.TASTE_TEXTURE,
        });
      }

      // Calculate result
      const result = await resultsService.getSubmissionResult(submission.id);

      // Verify trimmed mean (drop high=9 and low=1)
      expect(result.criterionScores[0].aggregatedScore).toBe(6.5); // (5+6+7+8)/4
      expect(result.criterionScores[0].judgeCount).toBe(6);
      expect(result.finalScore).toBe(6.5);
    });

    /**
     * Test 3: TRIMMED_MEAN falls back to MEAN with fewer than 3 judges
     */
    it('falls back to MEAN when TRIMMED_MEAN has fewer than 3 judges', async () => {
      const event = await createTestEvent(ctx, {
        aggregationMethod: AggregationMethod.TRIMMED_MEAN,
      });
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat1 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 1 });
      const seat2 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 2 });
      const category = await createTestCategory(ctx, { eventId: event.id });
      const criterion = await createTestCriterion(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // Only 2 scores - should use regular mean
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat1.id,
        criterionId: criterion.id,
        scoreValue: 4,
        phase: ScoringPhase.APPEARANCE,
      });
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat2.id,
        criterionId: criterion.id,
        scoreValue: 8,
        phase: ScoringPhase.APPEARANCE,
      });

      const result = await resultsService.getSubmissionResult(submission.id);

      // Falls back to regular mean: (4+8)/2 = 6
      expect(result.criterionScores[0].aggregatedScore).toBe(6);
    });
  });

  describe('Weighted Criterion Scoring', () => {
    /**
     * Test 4: Weighted score calculation
     */
    it('calculates weighted score from multiple criteria', async () => {
      const event = await createTestEvent(ctx, {
        aggregationMethod: AggregationMethod.MEAN,
      });
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });
      const category = await createTestCategory(ctx, { eventId: event.id });

      // Create criteria with different weights
      const appearanceCriterion = await createTestCriterion(ctx, {
        eventId: event.id,
        name: 'Appearance',
        weight: 1.0,
        sortOrder: 1,
      });
      const tasteCriterion = await createTestCriterion(ctx, {
        eventId: event.id,
        name: 'Taste',
        weight: 2.0, // Double weight for taste
        sortOrder: 2,
      });

      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // Appearance: 6, Taste: 9
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat.id,
        criterionId: appearanceCriterion.id,
        scoreValue: 6,
        phase: ScoringPhase.APPEARANCE,
      });
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat.id,
        criterionId: tasteCriterion.id,
        scoreValue: 9,
        phase: ScoringPhase.TASTE_TEXTURE,
      });

      const result = await resultsService.getSubmissionResult(submission.id);

      // Weighted score: (6*1 + 9*2) / (1+2) = 24/3 = 8
      expect(result.finalScore).toBe(8);
      expect(result.criterionScores).toHaveLength(2);
    });
  });

  describe('Category Results with Rankings', () => {
    /**
     * Test 5: Category results with proper ranking
     */
    it('ranks submissions within a category correctly', async () => {
      const event = await createTestEvent(ctx, {
        aggregationMethod: AggregationMethod.MEAN,
      });
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });
      const category = await createTestCategory(ctx, { eventId: event.id, name: 'Ribs' });
      const criterion = await createTestCriterion(ctx, {
        eventId: event.id,
        name: 'Overall',
        weight: 1.0,
      });

      // Create 3 teams with different scores
      const team1 = await createTestTeam(ctx, { eventId: event.id, name: 'Team Alpha' });
      const team2 = await createTestTeam(ctx, { eventId: event.id, name: 'Team Beta' });
      const team3 = await createTestTeam(ctx, { eventId: event.id, name: 'Team Gamma' });

      const sub1 = await createTestSubmission(ctx, { teamId: team1.id, categoryId: category.id });
      const sub2 = await createTestSubmission(ctx, { teamId: team2.id, categoryId: category.id });
      const sub3 = await createTestSubmission(ctx, { teamId: team3.id, categoryId: category.id });

      // Scores: Team2 (9) > Team1 (7) > Team3 (5)
      await createTestScore(ctx, {
        submissionId: sub1.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 7,
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      await createTestScore(ctx, {
        submissionId: sub2.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 9,
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      await createTestScore(ctx, {
        submissionId: sub3.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 5,
        phase: ScoringPhase.TASTE_TEXTURE,
      });

      const result = await resultsService.getCategoryResults(category.id);

      expect(result.categoryId).toBe(category.id);
      expect(result.categoryName).toBe('Ribs');
      expect(result.results).toHaveLength(3);

      // Verify ranking order (highest score first)
      expect(result.results[0].teamName).toBe('Team Beta');
      expect(result.results[0].rank).toBe(1);
      expect(result.results[0].finalScore).toBe(9);

      expect(result.results[1].teamName).toBe('Team Alpha');
      expect(result.results[1].rank).toBe(2);
      expect(result.results[1].finalScore).toBe(7);

      expect(result.results[2].teamName).toBe('Team Gamma');
      expect(result.results[2].rank).toBe(3);
      expect(result.results[2].finalScore).toBe(5);
    });

    /**
     * Test 6: Tie handling - same rank for tied scores
     */
    it('handles ties by assigning same rank and skipping next', async () => {
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });
      const category = await createTestCategory(ctx, { eventId: event.id });
      const criterion = await createTestCriterion(ctx, { eventId: event.id });

      // 4 teams: scores 9, 8, 8, 7 -> ranks 1, 2, 2, 4
      const teams: Team[] = [];
      const submissions: Submission[] = [];
      const scores = [9, 8, 8, 7];

      for (let i = 0; i < 4; i++) {
        const team = await createTestTeam(ctx, { eventId: event.id, name: `Team ${i + 1}` });
        teams.push(team);
        const sub = await createTestSubmission(ctx, {
          teamId: team.id,
          categoryId: category.id,
        });
        submissions.push(sub);
        await createTestScore(ctx, {
          submissionId: sub.id,
          seatId: seat.id,
          criterionId: criterion.id,
          scoreValue: scores[i],
          phase: ScoringPhase.APPEARANCE,
        });
      }

      const result = await resultsService.getCategoryResults(category.id);

      expect(result.results[0].rank).toBe(1); // Score 9
      expect(result.results[1].rank).toBe(2); // Score 8 (tied)
      expect(result.results[2].rank).toBe(2); // Score 8 (tied)
      expect(result.results[3].rank).toBe(4); // Score 7 (skipped rank 3)
    });
  });

  describe('Event-Wide Results with Overall Rankings', () => {
    /**
     * Test 7: Full event results with overall team rankings
     */
    it('calculates overall team rankings across multiple categories', async () => {
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });

      // Two categories
      const brisketCategory = await createTestCategory(ctx, {
        eventId: event.id,
        name: 'Brisket',
        sortOrder: 1,
      });
      const ribsCategory = await createTestCategory(ctx, {
        eventId: event.id,
        name: 'Ribs',
        sortOrder: 2,
      });

      const criterion = await createTestCriterion(ctx, { eventId: event.id });

      // Two teams
      const team1 = await createTestTeam(ctx, { eventId: event.id, name: 'Team One' });
      const team2 = await createTestTeam(ctx, { eventId: event.id, name: 'Team Two' });

      // Team 1: Brisket=8 (rank 1), Ribs=6 (rank 2) -> rankSum=3
      // Team 2: Brisket=6 (rank 2), Ribs=8 (rank 1) -> rankSum=3
      // Tie broken by total score: Team1=14, Team2=14 (still tied)
      const sub1Brisket = await createTestSubmission(ctx, {
        teamId: team1.id,
        categoryId: brisketCategory.id,
      });
      const sub1Ribs = await createTestSubmission(ctx, {
        teamId: team1.id,
        categoryId: ribsCategory.id,
      });
      const sub2Brisket = await createTestSubmission(ctx, {
        teamId: team2.id,
        categoryId: brisketCategory.id,
      });
      const sub2Ribs = await createTestSubmission(ctx, {
        teamId: team2.id,
        categoryId: ribsCategory.id,
      });

      // Team 1 scores
      await createTestScore(ctx, {
        submissionId: sub1Brisket.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 8,
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      await createTestScore(ctx, {
        submissionId: sub1Ribs.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 6,
        phase: ScoringPhase.TASTE_TEXTURE,
      });

      // Team 2 scores
      await createTestScore(ctx, {
        submissionId: sub2Brisket.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 6,
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      await createTestScore(ctx, {
        submissionId: sub2Ribs.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 8,
        phase: ScoringPhase.TASTE_TEXTURE,
      });

      const result = await resultsService.getEventResults(event.id);

      expect(result.eventId).toBe(event.id);
      expect(result.categoryResults).toHaveLength(2);
      expect(result.overallRankings).toHaveLength(2);

      // Both teams have rankSum=3 and totalScore=14, so they tie at rank 1
      const team1Overall = result.overallRankings.find((r) => r.teamId === team1.id);
      const team2Overall = result.overallRankings.find((r) => r.teamId === team2.id);

      expect(team1Overall?.rankSum).toBe(3);
      expect(team1Overall?.totalScore).toBe(14);
      expect(team2Overall?.rankSum).toBe(3);
      expect(team2Overall?.totalScore).toBe(14);

      // Both should have same rank (tied)
      expect(team1Overall?.rank).toBe(team2Overall?.rank);
    });

    /**
     * Test 8: Overall ranking breaks ties by total score
     */
    it('breaks overall ranking ties by total score', async () => {
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });

      const cat1 = await createTestCategory(ctx, { eventId: event.id, sortOrder: 1 });
      const cat2 = await createTestCategory(ctx, { eventId: event.id, sortOrder: 2 });
      const criterion = await createTestCriterion(ctx, { eventId: event.id });

      const team1 = await createTestTeam(ctx, { eventId: event.id, name: 'Higher Total' });
      const team2 = await createTestTeam(ctx, { eventId: event.id, name: 'Lower Total' });

      // Team 1: Cat1=9 (rank 1), Cat2=7 (rank 2) -> rankSum=3, total=16
      // Team 2: Cat1=8 (rank 2), Cat2=8 (rank 1) -> rankSum=3, total=16
      // Actually let's make totals different:
      // Team 1: Cat1=9 (rank 1), Cat2=6 (rank 2) -> rankSum=3, total=15
      // Team 2: Cat1=7 (rank 2), Cat2=9 (rank 1) -> rankSum=3, total=16
      const sub1Cat1 = await createTestSubmission(ctx, { teamId: team1.id, categoryId: cat1.id });
      const sub1Cat2 = await createTestSubmission(ctx, { teamId: team1.id, categoryId: cat2.id });
      const sub2Cat1 = await createTestSubmission(ctx, { teamId: team2.id, categoryId: cat1.id });
      const sub2Cat2 = await createTestSubmission(ctx, { teamId: team2.id, categoryId: cat2.id });

      await createTestScore(ctx, {
        submissionId: sub1Cat1.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 9,
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      await createTestScore(ctx, {
        submissionId: sub1Cat2.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 6,
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      await createTestScore(ctx, {
        submissionId: sub2Cat1.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 7,
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      await createTestScore(ctx, {
        submissionId: sub2Cat2.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 9,
        phase: ScoringPhase.TASTE_TEXTURE,
      });

      const result = await resultsService.getEventResults(event.id);

      // Team 2 has higher total score (16 vs 15), so wins the tiebreaker
      expect(result.overallRankings[0].teamName).toBe('Lower Total');
      expect(result.overallRankings[0].totalScore).toBe(16);
      expect(result.overallRankings[0].rank).toBe(1);

      expect(result.overallRankings[1].teamName).toBe('Higher Total');
      expect(result.overallRankings[1].totalScore).toBe(15);
      expect(result.overallRankings[1].rank).toBe(2);
    });
  });

  describe('Completion Status', () => {
    /**
     * Test 9: Partial completion when not all criteria are scored
     */
    it('returns PARTIAL status when some criteria are not scored', async () => {
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });
      const category = await createTestCategory(ctx, { eventId: event.id });

      // Two criteria but only one scored
      const criterion1 = await createTestCriterion(ctx, {
        eventId: event.id,
        name: 'Appearance',
        sortOrder: 1,
      });
      const criterion2 = await createTestCriterion(ctx, {
        eventId: event.id,
        name: 'Taste',
        sortOrder: 2,
      });

      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // Only score criterion1
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat.id,
        criterionId: criterion1.id,
        scoreValue: 8,
        phase: ScoringPhase.APPEARANCE,
      });

      const result = await resultsService.getSubmissionResult(submission.id);

      expect(result.completionStatus).toBe(CompletionStatus.PARTIAL);
      expect(result.scoredCriteriaCount).toBe(1);
      expect(result.totalCriteriaCount).toBe(2);
    });

    /**
     * Test 10: NONE status when no scores exist
     */
    it('returns NONE status when no scores exist', async () => {
      const event = await createTestEvent(ctx);
      await createTestTable(ctx, { eventId: event.id }); // Need for judge count
      const category = await createTestCategory(ctx, { eventId: event.id });
      await createTestCriterion(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      const result = await resultsService.getSubmissionResult(submission.id);

      expect(result.completionStatus).toBe(CompletionStatus.NONE);
      expect(result.finalScore).toBe(0);
      expect(result.scoredCriteriaCount).toBe(0);
    });

    /**
     * Test 11: COMPLETE status when all judges have scored all criteria
     */
    it('returns COMPLETE status when fully scored', async () => {
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat1 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 1 });
      const seat2 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 2 });
      const category = await createTestCategory(ctx, { eventId: event.id });
      const criterion = await createTestCriterion(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // Both judges score
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat1.id,
        criterionId: criterion.id,
        scoreValue: 8,
        phase: ScoringPhase.APPEARANCE,
      });
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat2.id,
        criterionId: criterion.id,
        scoreValue: 7,
        phase: ScoringPhase.APPEARANCE,
      });

      const result = await resultsService.getSubmissionResult(submission.id);

      expect(result.completionStatus).toBe(CompletionStatus.COMPLETE);
      expect(result.totalJudges).toBe(2);
    });
  });
});
