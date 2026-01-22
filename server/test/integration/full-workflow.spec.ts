import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Event, EventStatus, AggregationMethod } from '../../src/entities/event.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { Submission, SubmissionStatus } from '../../src/entities/submission.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { Score } from '../../src/entities/score.entity';
import { entities } from '../../src/entities';
import { TeamsService } from '../../src/teams/teams.service';
import { JudgingService } from '../../src/judging/judging.service';
import { ResultsService } from '../../src/results/results.service';
import { verifyBarcode } from '../../src/teams/helpers/barcode.helper';

/**
 * Test DataSource for full workflow integration tests.
 */
const testDataSource = new DataSource({
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

const mockConfigService = {
  get: (key: string) => {
    if (key === 'BARCODE_SECRET') return 'test-barcode-secret-for-integration';
    return undefined;
  },
} as ConfigService;

describe('Full Workflow Integration Tests', () => {
  let eventRepo: Repository<Event>;
  let categoryRepo: Repository<Category>;
  let criterionRepo: Repository<Criterion>;
  let teamRepo: Repository<Team>;
  let submissionRepo: Repository<Submission>;
  let tableRepo: Repository<Table>;
  let seatRepo: Repository<Seat>;
  let scoreRepo: Repository<Score>;

  let teamsService: TeamsService;
  let judgingService: JudgingService;
  let resultsService: ResultsService;

  let testEvent: Event;
  let testCategory: Category;
  let testCriteria: Criterion[];
  let testTeams: Team[];
  let testSubmissions: Submission[];
  let testTable: Table;
  let testSeats: Seat[];

  beforeAll(async () => {
    await testDataSource.initialize();

    eventRepo = testDataSource.getRepository(Event);
    categoryRepo = testDataSource.getRepository(Category);
    criterionRepo = testDataSource.getRepository(Criterion);
    teamRepo = testDataSource.getRepository(Team);
    submissionRepo = testDataSource.getRepository(Submission);
    tableRepo = testDataSource.getRepository(Table);
    seatRepo = testDataSource.getRepository(Seat);
    scoreRepo = testDataSource.getRepository(Score);

    teamsService = new TeamsService(teamRepo, eventRepo, mockConfigService);
    judgingService = new JudgingService(
      categoryRepo,
      tableRepo,
      seatRepo,
      submissionRepo,
      scoreRepo,
    );
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
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);

    // Create test event with TRIMMED_MEAN aggregation
    testEvent = await eventRepo.save({
      name: 'BBQ Championship 2026',
      date: new Date('2026-06-15'),
      location: 'Austin, TX',
      status: EventStatus.ACTIVE,
      aggregationMethod: AggregationMethod.TRIMMED_MEAN,
      scoreMin: 1,
      scoreMax: 10,
      scoreStep: 0.5,
    });

    // Create category
    testCategory = await categoryRepo.save({
      eventId: testEvent.id,
      name: 'Brisket',
      sortOrder: 1,
    });

    // Create criteria with weights
    testCriteria = await criterionRepo.save([
      { eventId: testEvent.id, name: 'Appearance', weight: 1.0, sortOrder: 1 },
      { eventId: testEvent.id, name: 'Taste', weight: 2.0, sortOrder: 2 },
      { eventId: testEvent.id, name: 'Tenderness', weight: 1.5, sortOrder: 3 },
    ]);

    // Create table with seats
    testTable = await tableRepo.save({
      eventId: testEvent.id,
      tableNumber: 1,
      qrToken: 'test-qr-token-12345',
    });

    testSeats = await seatRepo.save([
      { tableId: testTable.id, seatNumber: 1 },
      { tableId: testTable.id, seatNumber: 2 },
      { tableId: testTable.id, seatNumber: 3 },
      { tableId: testTable.id, seatNumber: 4 },
      { tableId: testTable.id, seatNumber: 5 },
      { tableId: testTable.id, seatNumber: 6 },
    ]);
  });

  describe('Team HMAC Barcode Workflow', () => {
    it('creates teams with HMAC-signed barcodes', async () => {
      const teams = await teamsService.createBulk(testEvent.id, [
        { name: 'Smoke Masters', teamNumber: 1 },
        { name: 'BBQ Kings', teamNumber: 2 },
        { name: 'Grill Wizards', teamNumber: 3 },
      ]);

      expect(teams).toHaveLength(3);

      // Verify each barcode is HMAC-signed with correct format
      for (const team of teams) {
        const parts = team.barcodePayload.split(':');
        expect(parts).toHaveLength(4);
        expect(parts[0]).toBe(testEvent.id); // eventId
        expect(parts[1]).toBe(team.id); // teamId
        expect(parseInt(parts[2], 10)).toBeGreaterThan(0); // timestamp
        expect(parts[3]).toHaveLength(16); // signature
      }
    });

    it('verifies valid barcodes and returns team info', async () => {
      const team = await teamsService.create(testEvent.id, {
        name: 'Test Team',
        teamNumber: 1,
      });

      const result = await teamsService.verifyBarcode(team.barcodePayload);

      expect(result.valid).toBe(true);
      expect(result.team).toBeDefined();
      expect(result.team!.id).toBe(team.id);
      expect(result.team!.name).toBe('Test Team');
    });

    it('rejects tampered barcodes', async () => {
      const team = await teamsService.create(testEvent.id, {
        name: 'Test Team',
        teamNumber: 1,
      });

      // Tamper with the teamId in the barcode
      const parts = team.barcodePayload.split(':');
      parts[1] = '00000000-0000-0000-0000-000000000000';
      const tamperedBarcode = parts.join(':');

      const result = await teamsService.verifyBarcode(tamperedBarcode);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('rejects barcodes from wrong event', async () => {
      const team = await teamsService.create(testEvent.id, {
        name: 'Test Team',
        teamNumber: 1,
      });

      const result = await teamsService.verifyBarcode(
        team.barcodePayload,
        'different-event-id',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Barcode belongs to a different event');
    });

    it('rejects invalidated barcodes', async () => {
      const team = await teamsService.create(testEvent.id, {
        name: 'Test Team',
        teamNumber: 1,
      });

      const originalBarcode = team.barcodePayload;

      // Invalidate the barcode
      await teamsService.invalidateCode(team.id);

      // Old barcode should no longer work
      const result = await teamsService.verifyBarcode(originalBarcode);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Barcode has been invalidated');
    });

    it('accepts new barcode after invalidation', async () => {
      const team = await teamsService.create(testEvent.id, {
        name: 'Test Team',
        teamNumber: 1,
      });

      const updatedTeam = await teamsService.invalidateCode(team.id);

      // New barcode should work
      const result = await teamsService.verifyBarcode(updatedTeam.barcodePayload);

      expect(result.valid).toBe(true);
      expect(result.team!.id).toBe(team.id);
    });
  });

  describe('Judging Seat Sequence Workflow', () => {
    beforeEach(async () => {
      // Create teams and submissions
      testTeams = await teamsService.createBulk(testEvent.id, [
        { name: 'Team 1', teamNumber: 1 },
        { name: 'Team 2', teamNumber: 2 },
        { name: 'Team 3', teamNumber: 3 },
        { name: 'Team 4', teamNumber: 4 },
        { name: 'Team 5', teamNumber: 5 },
        { name: 'Team 6', teamNumber: 6 },
        { name: 'Team 7', teamNumber: 7 },
        { name: 'Team 8', teamNumber: 8 },
        { name: 'Team 9', teamNumber: 9 },
      ]);

      testSubmissions = await submissionRepo.save(
        testTeams.map((team, i) => ({
          categoryId: testCategory.id,
          teamId: team.id,
          submissionNumber: i + 1,
          status: SubmissionStatus.CHECKED_IN,
        })),
      );
    });

    it('generates assignment plan for category', async () => {
      const plan = await judgingService.generateCategoryAssignmentPlan(
        testCategory.id,
        12345, // Fixed seed for reproducibility
      );

      expect(plan.categoryId).toBe(testCategory.id);
      expect(plan.categoryName).toBe('Brisket');
      expect(plan.totalSubmissions).toBe(9);
      expect(plan.totalTables).toBe(1);
      expect(plan.tablePlans).toHaveLength(1);

      const tablePlan = plan.tablePlans[0];
      expect(tablePlan.tableId).toBe(testTable.id);
      expect(tablePlan.submissionIds).toHaveLength(9);
      expect(tablePlan.seatSequences).toHaveLength(6);

      // Each seat should see all 9 submissions
      for (const seatSeq of tablePlan.seatSequences) {
        expect(seatSeq.sequence).toHaveLength(9);
        expect(new Set(seatSeq.sequence).size).toBe(9);
      }
    });

    it('generates deterministic sequences with same seed', async () => {
      const plan1 = await judgingService.generateCategoryAssignmentPlan(
        testCategory.id,
        99999,
      );
      const plan2 = await judgingService.generateCategoryAssignmentPlan(
        testCategory.id,
        99999,
      );

      expect(plan1.tablePlans[0].seatSequences).toEqual(
        plan2.tablePlans[0].seatSequences,
      );
    });

    it('generates different sequences with different seeds', async () => {
      const plan1 = await judgingService.generateCategoryAssignmentPlan(
        testCategory.id,
        11111,
      );
      const plan2 = await judgingService.generateCategoryAssignmentPlan(
        testCategory.id,
        22222,
      );

      // The shuffled submission order should be different
      expect(plan1.tablePlans[0].submissionIds).not.toEqual(
        plan2.tablePlans[0].submissionIds,
      );
    });

    it('returns seat-specific sequences for taste/texture phase', async () => {
      const seq1 = await judgingService.getSeatSequence(
        testCategory.id,
        testTable.id,
        1,
        'taste_texture',
      );
      const seq6 = await judgingService.getSeatSequence(
        testCategory.id,
        testTable.id,
        6,
        'taste_texture',
      );

      // Both should have all submissions
      expect(seq1).toHaveLength(9);
      expect(seq6).toHaveLength(9);

      // But in different orders (seat 1 vs seat 6 have opposite directions)
      expect(seq1).not.toEqual(seq6);
    });

    it('returns same sequence for appearance phase', async () => {
      const seq1 = await judgingService.getSeatSequence(
        testCategory.id,
        testTable.id,
        1,
        'appearance',
      );
      const seq6 = await judgingService.getSeatSequence(
        testCategory.id,
        testTable.id,
        6,
        'appearance',
      );

      // Appearance phase uses same order for all seats
      expect(seq1).toEqual(seq6);
    });

    it('gets next submission for a seat', async () => {
      const next = await judgingService.getNextSubmission(
        testCategory.id,
        testTable.id,
        testSeats[0].id,
        'appearance',
      );

      expect(next).not.toBeNull();
      expect(next!.submissionNumber).toBe(1);
      expect(next!.totalSubmissions).toBe(9);
      expect(next!.phase).toBe('appearance');
    });

    it('skips already scored submissions', async () => {
      // Score the first submission
      await scoreRepo.save({
        submissionId: testSubmissions[0].id,
        seatId: testSeats[0].id,
        criterionId: testCriteria[0].id,
        phase: 'appearance',
        scoreValue: 8.0,
      });

      const next = await judgingService.getNextSubmission(
        testCategory.id,
        testTable.id,
        testSeats[0].id,
        'appearance',
      );

      // Should return the second submission
      expect(next).not.toBeNull();
      expect(next!.submissionNumber).toBe(2);
    });

    it('returns null when all submissions scored', async () => {
      // Score all submissions for seat 1
      for (const submission of testSubmissions) {
        await scoreRepo.save({
          submissionId: submission.id,
          seatId: testSeats[0].id,
          criterionId: testCriteria[0].id,
          phase: 'appearance',
          scoreValue: 8.0,
        });
      }

      const next = await judgingService.getNextSubmission(
        testCategory.id,
        testTable.id,
        testSeats[0].id,
        'appearance',
      );

      expect(next).toBeNull();
    });
  });

  describe('Results Calculation Workflow', () => {
    beforeEach(async () => {
      // Create teams and submissions
      testTeams = await teamsService.createBulk(testEvent.id, [
        { name: 'Alpha Team', teamNumber: 1 },
        { name: 'Beta Team', teamNumber: 2 },
      ]);

      testSubmissions = await submissionRepo.save([
        {
          categoryId: testCategory.id,
          teamId: testTeams[0].id,
          submissionNumber: 1,
          status: SubmissionStatus.CHECKED_IN,
        },
        {
          categoryId: testCategory.id,
          teamId: testTeams[1].id,
          submissionNumber: 2,
          status: SubmissionStatus.CHECKED_IN,
        },
      ]);
    });

    it('calculates submission result with weighted scores', async () => {
      // Add scores from all 6 judges for submission 1
      // Criteria weights: Appearance=1.0, Taste=2.0, Tenderness=1.5
      for (let judgeIdx = 0; judgeIdx < 6; judgeIdx++) {
        for (const criterion of testCriteria) {
          await scoreRepo.save({
            submissionId: testSubmissions[0].id,
            seatId: testSeats[judgeIdx].id,
            criterionId: criterion.id,
            phase: 'taste_texture',
            scoreValue: 8.0, // All 8s for simplicity
          });
        }
      }

      const result = await resultsService.getSubmissionResult(testSubmissions[0].id);

      expect(result.submissionId).toBe(testSubmissions[0].id);
      expect(result.completionStatus).toBe('complete');
      expect(result.finalScore).toBeCloseTo(8.0, 2);
    });

    it('uses trimmed mean for 4+ judges', async () => {
      // Add scores from 4 judges with different values
      // Values: 6, 7, 8, 9 -> trimmed mean removes 6 and 9, averages 7 and 8 = 7.5
      const judgeScores = [6, 7, 8, 9];

      for (let judgeIdx = 0; judgeIdx < 4; judgeIdx++) {
        await scoreRepo.save({
          submissionId: testSubmissions[0].id,
          seatId: testSeats[judgeIdx].id,
          criterionId: testCriteria[0].id, // Just Appearance
          phase: 'taste_texture',
          scoreValue: judgeScores[judgeIdx],
        });
      }

      const result = await resultsService.getSubmissionResult(testSubmissions[0].id);

      // With trimmed mean: (7 + 8) / 2 = 7.5
      expect(result.criterionScores[0].aggregatedScore).toBeCloseTo(7.5, 2);
    });

    it('calculates category results with rankings', async () => {
      // Score both submissions with different values
      // Submission 1: all 9s, Submission 2: all 7s
      for (const submission of testSubmissions) {
        const score = submission.id === testSubmissions[0].id ? 9.0 : 7.0;
        for (let judgeIdx = 0; judgeIdx < 4; judgeIdx++) {
          for (const criterion of testCriteria) {
            await scoreRepo.save({
              submissionId: submission.id,
              seatId: testSeats[judgeIdx].id,
              criterionId: criterion.id,
              phase: 'taste_texture',
              scoreValue: score,
            });
          }
        }
      }

      const results = await resultsService.getCategoryResults(testCategory.id);

      expect(results.categoryId).toBe(testCategory.id);
      expect(results.results).toHaveLength(2);

      // Higher score should be rank 1
      const rank1 = results.results.find((s) => s.rank === 1);
      const rank2 = results.results.find((s) => s.rank === 2);

      expect(rank1).toBeDefined();
      expect(rank2).toBeDefined();
      expect(rank1!.finalScore).toBeCloseTo(9.0, 2);
      expect(rank2!.finalScore).toBeCloseTo(7.0, 2);
    });

    it('handles ties correctly in rankings', async () => {
      // Score both submissions with same values
      for (const submission of testSubmissions) {
        for (let judgeIdx = 0; judgeIdx < 4; judgeIdx++) {
          for (const criterion of testCriteria) {
            await scoreRepo.save({
              submissionId: submission.id,
              seatId: testSeats[judgeIdx].id,
              criterionId: criterion.id,
              phase: 'taste_texture',
              scoreValue: 8.0,
            });
          }
        }
      }

      const results = await resultsService.getCategoryResults(testCategory.id);

      // Both should have rank 1 (tied)
      expect(results.results[0].rank).toBe(1);
      expect(results.results[1].rank).toBe(1);
    });

    it('calculates event results with overall team rankings', async () => {
      // Create a second category
      const category2 = await categoryRepo.save({
        eventId: testEvent.id,
        name: 'Ribs',
        sortOrder: 2,
      });

      // Create submissions for category 2
      const submissions2 = await submissionRepo.save([
        {
          categoryId: category2.id,
          teamId: testTeams[0].id,
          submissionNumber: 1,
          status: SubmissionStatus.CHECKED_IN,
        },
        {
          categoryId: category2.id,
          teamId: testTeams[1].id,
          submissionNumber: 2,
          status: SubmissionStatus.CHECKED_IN,
        },
      ]);

      // Team 1: Brisket 9.0 (rank 1), Ribs 7.0 (rank 2) = total rank 3
      // Team 2: Brisket 7.0 (rank 2), Ribs 9.0 (rank 1) = total rank 3 (tie)
      const scoreMap = [
        { submissions: testSubmissions, scores: [9.0, 7.0] },
        { submissions: submissions2, scores: [7.0, 9.0] },
      ];

      for (const { submissions, scores } of scoreMap) {
        for (let subIdx = 0; subIdx < submissions.length; subIdx++) {
          for (let judgeIdx = 0; judgeIdx < 4; judgeIdx++) {
            for (const criterion of testCriteria) {
              await scoreRepo.save({
                submissionId: submissions[subIdx].id,
                seatId: testSeats[judgeIdx].id,
                criterionId: criterion.id,
                phase: 'taste_texture',
                scoreValue: scores[subIdx],
              });
            }
          }
        }
      }

      const results = await resultsService.getEventResults(testEvent.id);

      expect(results.eventId).toBe(testEvent.id);
      expect(results.categoryResults).toHaveLength(2);
      expect(results.overallRankings).toHaveLength(2);

      // Both teams should have same rank sum (3)
      // Tie broken by total score: Team 1 has 9+7=16, Team 2 has 7+9=16
      // Still tied, so both should be rank 1
      expect(results.overallRankings[0].rank).toBe(1);
      expect(results.overallRankings[1].rank).toBe(1);
    });

    it('reports partial completion status when scores missing', async () => {
      // Only add scores for one criterion
      for (let judgeIdx = 0; judgeIdx < 4; judgeIdx++) {
        await scoreRepo.save({
          submissionId: testSubmissions[0].id,
          seatId: testSeats[judgeIdx].id,
          criterionId: testCriteria[0].id, // Only Appearance
          phase: 'taste_texture',
          scoreValue: 8.0,
        });
      }

      const result = await resultsService.getSubmissionResult(testSubmissions[0].id);

      expect(result.completionStatus).toBe('partial');
    });
  });

  describe('Full Competition Workflow', () => {
    it('simulates complete mini-competition', async () => {
      // 1. Create teams with HMAC barcodes
      const teams = await teamsService.createBulk(testEvent.id, [
        { name: 'Pitmaster Pro', teamNumber: 101 },
        { name: 'Smoke Signal', teamNumber: 102 },
        { name: 'Holy Smokes', teamNumber: 103 },
      ]);

      // Verify all barcodes
      for (const team of teams) {
        const verification = await teamsService.verifyBarcode(
          team.barcodePayload,
          testEvent.id,
        );
        expect(verification.valid).toBe(true);
      }

      // 2. Create submissions (turn-in)
      const submissions = await submissionRepo.save(
        teams.map((team, i) => ({
          categoryId: testCategory.id,
          teamId: team.id,
          submissionNumber: i + 1,
          status: SubmissionStatus.CHECKED_IN,
        })),
      );

      // 3. Generate assignment plan
      const plan = await judgingService.generateCategoryAssignmentPlan(
        testCategory.id,
        42,
      );

      expect(plan.totalSubmissions).toBe(3);
      expect(plan.tablePlans[0].seatSequences).toHaveLength(6);

      // 4. Judges score submissions
      // Each of 6 judges scores all 3 submissions on all 3 criteria
      for (let judgeIdx = 0; judgeIdx < 6; judgeIdx++) {
        for (const submission of submissions) {
          for (const criterion of testCriteria) {
            // Vary scores by team for different rankings
            const baseScore = 7 + (submission.submissionNumber - 1) * 0.5;
            const variation = (judgeIdx % 3) * 0.2;

            await scoreRepo.save({
              submissionId: submission.id,
              seatId: testSeats[judgeIdx].id,
              criterionId: criterion.id,
              phase: 'taste_texture',
              scoreValue: Math.min(10, baseScore + variation),
            });
          }
        }
      }

      // 5. Calculate results
      const categoryResults = await resultsService.getCategoryResults(testCategory.id);

      expect(categoryResults.results).toHaveLength(3);
      expect(categoryResults.results.every((s) => s.completionStatus === 'complete')).toBe(true);

      // Team with highest submission number should have highest score (based on our scoring)
      const ranked = [...categoryResults.results].sort((a, b) => a.rank - b.rank);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].finalScore).toBeGreaterThan(ranked[2].finalScore);

      // 6. Get event results
      const eventResults = await resultsService.getEventResults(testEvent.id);

      expect(eventResults.categoryResults).toHaveLength(1);
      expect(eventResults.overallRankings).toHaveLength(3);
    });
  });
});
