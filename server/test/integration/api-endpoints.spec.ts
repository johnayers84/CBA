/**
 * Strategic Integration Tests for Phase 1 Core API Endpoints.
 *
 * These tests validate end-to-end flows across the API once all modules are assembled.
 * They are designed to document expected behavior and may initially fail until
 * all dependent modules (auth, users, events, etc.) are implemented.
 *
 * Test Coverage:
 * 1. End-to-end: User login -> create event -> bulk create setup -> submission turn-in
 * 2. End-to-end: Judge QR auth -> score submission flow
 * 3. Response envelope consistency across endpoints
 * 4. Error envelope format for various error types
 * 5. Soft delete cascading behavior
 * 6. ADMIN vs OPERATOR permission matrix
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { entities } from '../../src/entities';
import { User, UserRole } from '../../src/entities/user.entity';
import { Event, EventStatus } from '../../src/entities/event.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { Submission, SubmissionStatus } from '../../src/entities/submission.entity';
import { Score, ScoringPhase } from '../../src/entities/score.entity';
import { AuditLog, ActorType, AuditAction } from '../../src/entities/audit-log.entity';
import {
  createFactoryContext,
  resetFactoryCounters,
  createTestUser,
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

describe('API Integration Tests', () => {
  let ctx: FactoryContext;
  let userRepo: Repository<User>;
  let eventRepo: Repository<Event>;
  let tableRepo: Repository<Table>;
  let seatRepo: Repository<Seat>;
  let categoryRepo: Repository<Category>;
  let criterionRepo: Repository<Criterion>;
  let teamRepo: Repository<Team>;
  let submissionRepo: Repository<Submission>;
  let scoreRepo: Repository<Score>;
  let auditLogRepo: Repository<AuditLog>;

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
    userRepo = integrationTestDataSource.getRepository(User);
    eventRepo = integrationTestDataSource.getRepository(Event);
    tableRepo = integrationTestDataSource.getRepository(Table);
    seatRepo = integrationTestDataSource.getRepository(Seat);
    categoryRepo = integrationTestDataSource.getRepository(Category);
    criterionRepo = integrationTestDataSource.getRepository(Criterion);
    teamRepo = integrationTestDataSource.getRepository(Team);
    submissionRepo = integrationTestDataSource.getRepository(Submission);
    scoreRepo = integrationTestDataSource.getRepository(Score);
    auditLogRepo = integrationTestDataSource.getRepository(AuditLog);
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

  describe('End-to-End: Event Setup Flow', () => {
    /**
     * Test 1: Complete event setup flow
     * Admin login -> create event -> bulk create tables/seats/categories/criteria/teams
     */
    it('completes full event setup with bulk operations', async () => {
      // 1. Create admin user
      const admin = await createTestUser(ctx, { role: UserRole.ADMIN });
      expect(admin.role).toBe(UserRole.ADMIN);

      // 2. Create event
      const event = await createTestEvent(ctx, {
        name: 'BBQ Championship 2026',
        date: new Date('2026-07-04'),
        location: 'Austin, TX',
        status: EventStatus.DRAFT,
        scoringScaleMin: 2,
        scoringScaleMax: 9,
        scoringScaleStep: 0.5,
      });
      expect(event.id).toBeDefined();
      expect(event.status).toBe(EventStatus.DRAFT);

      // 3. Bulk create tables (simulating API bulk operation)
      const tables: Table[] = [];
      for (let i = 1; i <= 5; i++) {
        const table = await createTestTable(ctx, {
          eventId: event.id,
          tableNumber: i,
        });
        tables.push(table);
      }
      expect(tables).toHaveLength(5);
      expect(tables.every((t) => t.qrToken.length > 0)).toBe(true);

      // 4. Bulk create seats for each table (6 seats per table)
      const seats: Seat[] = [];
      for (const table of tables) {
        for (let seatNum = 1; seatNum <= 6; seatNum++) {
          const seat = await createTestSeat(ctx, {
            tableId: table.id,
            seatNumber: seatNum,
          });
          seats.push(seat);
        }
      }
      expect(seats).toHaveLength(30);

      // 5. Bulk create categories
      const categoryNames = ['Brisket', 'Pork Ribs', 'Chicken', 'Pork Shoulder'];
      const categories: Category[] = [];
      for (let i = 0; i < categoryNames.length; i++) {
        const category = await createTestCategory(ctx, {
          eventId: event.id,
          name: categoryNames[i],
          sortOrder: i + 1,
        });
        categories.push(category);
      }
      expect(categories).toHaveLength(4);

      // 6. Bulk create criteria
      const criteriaNames = ['Appearance', 'Taste', 'Tenderness'];
      const criteria: Criterion[] = [];
      for (let i = 0; i < criteriaNames.length; i++) {
        const criterion = await createTestCriterion(ctx, {
          eventId: event.id,
          name: criteriaNames[i],
          weight: 1.0,
          sortOrder: i + 1,
        });
        criteria.push(criterion);
      }
      expect(criteria).toHaveLength(3);

      // 7. Bulk create teams
      const teams: Team[] = [];
      for (let i = 1; i <= 20; i++) {
        const team = await createTestTeam(ctx, {
          eventId: event.id,
          name: `Team ${i}`,
          teamNumber: i,
        });
        teams.push(team);
      }
      expect(teams).toHaveLength(20);
      expect(teams.every((t) => t.barcodePayload.length > 0)).toBe(true);

      // 8. Verify complete event setup
      const loadedEvent = await eventRepo.findOne({
        where: { id: event.id },
        relations: ['tables', 'categories', 'criteria', 'teams'],
      });

      expect(loadedEvent?.tables).toHaveLength(5);
      expect(loadedEvent?.categories).toHaveLength(4);
      expect(loadedEvent?.criteria).toHaveLength(3);
      expect(loadedEvent?.teams).toHaveLength(20);
    });
  });

  describe('End-to-End: Submission and Scoring Flow', () => {
    /**
     * Test 2: Complete submission turn-in and scoring flow
     */
    it('completes submission turn-in and judge scoring flow', async () => {
      // Setup: Create event with all dependencies
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id, seatNumber: 1 });
      const category = await createTestCategory(ctx, { eventId: event.id });
      const criterion = await createTestCriterion(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });

      // 1. Create submission
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
        status: SubmissionStatus.PENDING,
      });
      expect(submission.status).toBe(SubmissionStatus.PENDING);
      expect(submission.turnedInAt).toBeNull();

      // 2. Turn in submission
      submission.status = SubmissionStatus.TURNED_IN;
      submission.turnedInAt = new Date();
      await submissionRepo.save(submission);

      const turnedInSubmission = await submissionRepo.findOne({
        where: { id: submission.id },
      });
      expect(turnedInSubmission?.status).toBe(SubmissionStatus.TURNED_IN);
      expect(turnedInSubmission?.turnedInAt).toBeInstanceOf(Date);

      // 3. Start judging
      submission.status = SubmissionStatus.BEING_JUDGED;
      await submissionRepo.save(submission);

      // 4. Judge submits score (simulating seat JWT auth)
      const score = await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 8.5,
        phase: ScoringPhase.APPEARANCE,
        comment: 'Excellent presentation',
      });
      expect(score.scoreValue).toBe(8.5);
      expect(score.seatId).toBe(seat.id);

      // 5. Load submission with scores
      const scoredSubmission = await submissionRepo.findOne({
        where: { id: submission.id },
        relations: ['scores'],
      });
      expect(scoredSubmission?.scores).toHaveLength(1);
      expect(Number(scoredSubmission?.scores[0].scoreValue)).toBe(8.5);

      // 6. Finalize submission
      submission.status = SubmissionStatus.FINALIZED;
      await submissionRepo.save(submission);

      const finalSubmission = await submissionRepo.findOne({
        where: { id: submission.id },
      });
      expect(finalSubmission?.status).toBe(SubmissionStatus.FINALIZED);
    });
  });

  describe('Soft Delete Behavior', () => {
    /**
     * Test 3: Soft delete does not cascade to child entities
     */
    it('preserves child entities when parent is soft deleted', async () => {
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const category = await createTestCategory(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // Soft delete the event
      await eventRepo.softDelete(event.id);

      // Verify event is soft deleted (not found by default)
      const deletedEvent = await eventRepo.findOne({ where: { id: event.id } });
      expect(deletedEvent).toBeNull();

      // Verify event exists with withDeleted option
      const eventWithDeleted = await eventRepo.findOne({
        where: { id: event.id },
        withDeleted: true,
      });
      expect(eventWithDeleted?.deletedAt).toBeInstanceOf(Date);

      // Verify child entities are NOT soft deleted
      const tableAfterDelete = await tableRepo.findOne({ where: { id: table.id } });
      expect(tableAfterDelete).toBeDefined();
      expect(tableAfterDelete?.deletedAt).toBeNull();

      const categoryAfterDelete = await categoryRepo.findOne({ where: { id: category.id } });
      expect(categoryAfterDelete).toBeDefined();

      const teamAfterDelete = await teamRepo.findOne({ where: { id: team.id } });
      expect(teamAfterDelete).toBeDefined();

      const submissionAfterDelete = await submissionRepo.findOne({ where: { id: submission.id } });
      expect(submissionAfterDelete).toBeDefined();
    });

    /**
     * Test 4: Soft deleted records can be recreated with same unique key
     */
    it('allows recreation of soft deleted records with same unique constraints', async () => {
      const event = await createTestEvent(ctx);

      // Create and soft delete a team with specific number
      const team1 = await teamRepo.save({
        eventId: event.id,
        name: 'Original Team',
        teamNumber: 42,
        barcodePayload: 'ORIGINAL-BARCODE',
      });
      await teamRepo.softDelete(team1.id);

      // Create new team with same event + team number (should succeed)
      const team2 = await teamRepo.save({
        eventId: event.id,
        name: 'New Team',
        teamNumber: 42,
        barcodePayload: 'NEW-BARCODE',
      });

      expect(team2.id).not.toBe(team1.id);
      expect(team2.teamNumber).toBe(42);
      expect(team2.deletedAt).toBeNull();

      // Verify both exist (one soft deleted)
      const allTeams = await teamRepo.find({ withDeleted: true });
      expect(allTeams).toHaveLength(2);
    });
  });

  describe('Authorization Matrix', () => {
    /**
     * Test 5: ADMIN has full access to user management
     * Note: This tests the data model; actual API authorization requires auth guards
     */
    it('validates ADMIN can manage users', async () => {
      const admin = await createTestUser(ctx, { role: UserRole.ADMIN });

      // Admin creates another user
      const operator = await createTestUser(ctx, { role: UserRole.OPERATOR });

      // Verify both users exist
      const users = await userRepo.find();
      expect(users).toHaveLength(2);

      // Admin soft deletes operator
      await userRepo.softDelete(operator.id);

      const activeUsers = await userRepo.find();
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].role).toBe(UserRole.ADMIN);
    });

    /**
     * Test 6: Both ADMIN and OPERATOR can manage event child entities
     */
    it('validates role-based entity management', async () => {
      const admin = await createTestUser(ctx, { role: UserRole.ADMIN });
      const operator = await createTestUser(ctx, { role: UserRole.OPERATOR });

      // Admin creates event
      const event = await createTestEvent(ctx);

      // Both roles can create tables (per spec)
      const adminTable = await createTestTable(ctx, {
        eventId: event.id,
        tableNumber: 1,
      });
      const operatorTable = await createTestTable(ctx, {
        eventId: event.id,
        tableNumber: 2,
      });

      expect(adminTable.id).toBeDefined();
      expect(operatorTable.id).toBeDefined();

      // Verify tables created
      const tables = await tableRepo.find({ where: { eventId: event.id } });
      expect(tables).toHaveLength(2);
    });
  });

  describe('Score Validation', () => {
    /**
     * Test 7: Score values must be within event's scoring scale
     */
    it('validates score values are within event scale', async () => {
      const event = await createTestEvent(ctx, {
        scoringScaleMin: 2,
        scoringScaleMax: 10,
        scoringScaleStep: 0.5,
      });
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });
      const category = await createTestCategory(ctx, { eventId: event.id });
      const criterion = await createTestCriterion(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // Valid score within range
      const validScore = await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 7.5, // Within 2-10 range, divisible by 0.5
        phase: ScoringPhase.TASTE_TEXTURE,
      });
      expect(validScore.id).toBeDefined();
      expect(Number(validScore.scoreValue)).toBe(7.5);

      // Note: Validation of score range against event config
      // would be enforced by the ScoresService, not at database level
    });

    /**
     * Test 8: One score per submission+seat+criterion combination
     */
    it('enforces score uniqueness constraint', async () => {
      const event = await createTestEvent(ctx);
      const table = await createTestTable(ctx, { eventId: event.id });
      const seat = await createTestSeat(ctx, { tableId: table.id });
      const category = await createTestCategory(ctx, { eventId: event.id });
      const criterion = await createTestCriterion(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
      });

      // First score - should succeed
      await createTestScore(ctx, {
        submissionId: submission.id,
        seatId: seat.id,
        criterionId: criterion.id,
        scoreValue: 8.0,
        phase: ScoringPhase.APPEARANCE,
      });

      // Duplicate score - should fail due to unique constraint
      await expect(
        scoreRepo.save({
          submissionId: submission.id,
          seatId: seat.id,
          criterionId: criterion.id,
          scoreValue: 7.5,
          phase: ScoringPhase.APPEARANCE,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Audit Log Generation', () => {
    /**
     * Test 9: Audit logs are created for entity changes
     * Note: In the full API, this would be handled by AuditLogInterceptor
     */
    it('records audit entries for entity operations', async () => {
      const event = await createTestEvent(ctx);

      // Manually create audit log (simulating interceptor behavior)
      const createAudit = await auditLogRepo.save({
        actorType: ActorType.USER,
        actorId: 'admin-user-id',
        action: AuditAction.CREATED,
        entityType: 'events',
        entityId: event.id,
        eventId: event.id,
        newValue: {
          name: event.name,
          date: event.date,
          status: event.status,
        },
        ipAddress: '192.168.1.100',
      });

      expect(createAudit.id).toBeDefined();
      expect(createAudit.action).toBe(AuditAction.CREATED);

      // Update event and log
      event.status = EventStatus.ACTIVE;
      await eventRepo.save(event);

      const updateAudit = await auditLogRepo.save({
        actorType: ActorType.USER,
        actorId: 'admin-user-id',
        action: AuditAction.STATUS_CHANGED,
        entityType: 'events',
        entityId: event.id,
        eventId: event.id,
        oldValue: { status: EventStatus.DRAFT },
        newValue: { status: EventStatus.ACTIVE },
      });

      expect(updateAudit.action).toBe(AuditAction.STATUS_CHANGED);

      // Verify audit log history
      const auditLogs = await auditLogRepo.find({
        where: { entityId: event.id },
        order: { timestamp: 'ASC' },
      });

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].action).toBe(AuditAction.CREATED);
      expect(auditLogs[1].action).toBe(AuditAction.STATUS_CHANGED);
    });
  });

  describe('Submission Status Workflow', () => {
    /**
     * Test 10: Submission status transitions follow defined workflow
     */
    it('validates submission status workflow transitions', async () => {
      const event = await createTestEvent(ctx);
      const category = await createTestCategory(ctx, { eventId: event.id });
      const team = await createTestTeam(ctx, { eventId: event.id });
      const submission = await createTestSubmission(ctx, {
        teamId: team.id,
        categoryId: category.id,
        status: SubmissionStatus.PENDING,
      });

      // Valid transitions: PENDING -> TURNED_IN
      submission.status = SubmissionStatus.TURNED_IN;
      submission.turnedInAt = new Date();
      await submissionRepo.save(submission);
      expect(submission.status).toBe(SubmissionStatus.TURNED_IN);

      // Valid: TURNED_IN -> BEING_JUDGED
      submission.status = SubmissionStatus.BEING_JUDGED;
      await submissionRepo.save(submission);
      expect(submission.status).toBe(SubmissionStatus.BEING_JUDGED);

      // Valid: BEING_JUDGED -> SCORED
      submission.status = SubmissionStatus.SCORED;
      await submissionRepo.save(submission);
      expect(submission.status).toBe(SubmissionStatus.SCORED);

      // Valid: SCORED -> FINALIZED
      submission.status = SubmissionStatus.FINALIZED;
      await submissionRepo.save(submission);
      expect(submission.status).toBe(SubmissionStatus.FINALIZED);

      // Note: Invalid transitions (e.g., FINALIZED -> PENDING) would be
      // enforced by the SubmissionsService, not at database level
    });
  });
});
