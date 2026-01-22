/**
 * Integration tests for database schema.
 * These tests verify cross-entity relationships, cascade behaviors,
 * and constraint enforcement across the complete schema.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { entities } from '../../src/entities';
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

describe('Integration Tests', () => {
  let ctx: FactoryContext;
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

  it('loads full event hierarchy (event -> tables -> seats)', async () => {
    const event = await createTestEvent(ctx);

    const table1 = await createTestTable(ctx, { eventId: event.id, tableNumber: 1 });
    const table2 = await createTestTable(ctx, { eventId: event.id, tableNumber: 2 });

    await createTestSeat(ctx, { tableId: table1.id, seatNumber: 1 });
    await createTestSeat(ctx, { tableId: table1.id, seatNumber: 2 });
    await createTestSeat(ctx, { tableId: table2.id, seatNumber: 1 });

    const loadedEvent = await eventRepo.findOne({
      where: { id: event.id },
      relations: ['tables', 'tables.seats'],
    });

    expect(loadedEvent).toBeDefined();
    expect(loadedEvent?.tables).toHaveLength(2);

    const loadedTable1 = loadedEvent?.tables.find((t) => t.tableNumber === 1);
    const loadedTable2 = loadedEvent?.tables.find((t) => t.tableNumber === 2);

    expect(loadedTable1?.seats).toHaveLength(2);
    expect(loadedTable2?.seats).toHaveLength(1);
  });

  it('loads full scoring chain (event -> team -> submission -> scores)', async () => {
    const event = await createTestEvent(ctx);
    const team = await createTestTeam(ctx, { eventId: event.id });
    const category = await createTestCategory(ctx, { eventId: event.id });
    const criterion = await createTestCriterion(ctx, { eventId: event.id });

    const table = await createTestTable(ctx, { eventId: event.id });
    const seat1 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 1 });
    const seat2 = await createTestSeat(ctx, { tableId: table.id, seatNumber: 2 });

    const submission = await createTestSubmission(ctx, {
      teamId: team.id,
      categoryId: category.id,
      status: SubmissionStatus.BEING_JUDGED,
    });

    await createTestScore(ctx, {
      submissionId: submission.id,
      seatId: seat1.id,
      criterionId: criterion.id,
      scoreValue: 8.5,
      phase: ScoringPhase.APPEARANCE,
    });

    await createTestScore(ctx, {
      submissionId: submission.id,
      seatId: seat2.id,
      criterionId: criterion.id,
      scoreValue: 7.0,
      phase: ScoringPhase.APPEARANCE,
    });

    const loadedEvent = await eventRepo.findOne({
      where: { id: event.id },
      relations: ['teams', 'teams.submissions', 'teams.submissions.scores'],
    });

    expect(loadedEvent).toBeDefined();
    expect(loadedEvent?.teams).toHaveLength(1);
    expect(loadedEvent?.teams[0].submissions).toHaveLength(1);
    expect(loadedEvent?.teams[0].submissions[0].scores).toHaveLength(2);
  });

  it('does not cascade soft delete from event to children', async () => {
    const event = await createTestEvent(ctx);
    const table = await createTestTable(ctx, { eventId: event.id });
    const seat = await createTestSeat(ctx, { tableId: table.id });
    const category = await createTestCategory(ctx, { eventId: event.id });
    const team = await createTestTeam(ctx, { eventId: event.id });

    await eventRepo.softDelete(event.id);

    // Verify event is soft deleted
    const deletedEvent = await eventRepo.findOne({ where: { id: event.id } });
    expect(deletedEvent).toBeNull();

    // Verify children are NOT soft deleted
    const foundTable = await tableRepo.findOne({ where: { id: table.id } });
    expect(foundTable).toBeDefined();
    expect(foundTable?.deletedAt).toBeNull();

    const foundSeat = await seatRepo.findOne({ where: { id: seat.id } });
    expect(foundSeat).toBeDefined();
    expect(foundSeat?.deletedAt).toBeNull();

    const foundCategory = await categoryRepo.findOne({ where: { id: category.id } });
    expect(foundCategory).toBeDefined();
    expect(foundCategory?.deletedAt).toBeNull();

    const foundTeam = await teamRepo.findOne({ where: { id: team.id } });
    expect(foundTeam).toBeDefined();
    expect(foundTeam?.deletedAt).toBeNull();
  });

  it('allows re-creation of soft-deleted records with same unique key', async () => {
    const event = await createTestEvent(ctx);

    const category1 = await categoryRepo.save({
      eventId: event.id,
      name: 'Brisket',
      sortOrder: 1,
    });

    await categoryRepo.softDelete(category1.id);

    // Should be able to create another category with the same name
    const category2 = await categoryRepo.save({
      eventId: event.id,
      name: 'Brisket',
      sortOrder: 1,
    });

    expect(category2).toBeDefined();
    expect(category2.id).not.toBe(category1.id);
    expect(category2.name).toBe('Brisket');
    expect(category2.deletedAt).toBeNull();

    // Verify original is still soft deleted
    const original = await categoryRepo.findOne({
      where: { id: category1.id },
      withDeleted: true,
    });
    expect(original?.deletedAt).toBeInstanceOf(Date);
  });

  it('completes schema synchronization cycle without errors', async () => {
    // This test verifies that the complete schema can be dropped and recreated
    // This is equivalent to running migrations up and down
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
    const score = await createTestScore(ctx, {
      submissionId: submission.id,
      seatId: seat.id,
      criterionId: criterion.id,
    });

    // Verify all entities were created
    expect(event.id).toBeDefined();
    expect(table.id).toBeDefined();
    expect(seat.id).toBeDefined();
    expect(category.id).toBeDefined();
    expect(criterion.id).toBeDefined();
    expect(team.id).toBeDefined();
    expect(submission.id).toBeDefined();
    expect(score.id).toBeDefined();

    // Drop and recreate schema (simulates migration down/up)
    await integrationTestDataSource.synchronize(true);

    // Verify all tables exist and are empty
    const events = await eventRepo.find();
    const tables = await tableRepo.find();
    const seats = await seatRepo.find();
    const categories = await categoryRepo.find();
    const criteria = await criterionRepo.find();
    const teams = await teamRepo.find();
    const submissions = await submissionRepo.find();
    const scores = await scoreRepo.find();

    expect(events).toHaveLength(0);
    expect(tables).toHaveLength(0);
    expect(seats).toHaveLength(0);
    expect(categories).toHaveLength(0);
    expect(criteria).toHaveLength(0);
    expect(teams).toHaveLength(0);
    expect(submissions).toHaveLength(0);
    expect(scores).toHaveLength(0);

    // Verify we can create new entities after schema reset
    const newEvent = await createTestEvent(ctx);
    expect(newEvent.id).toBeDefined();
  });

  it('prevents creation of orphan records via foreign key constraints', async () => {
    const nonExistentEventId = randomUUID();

    // Attempting to create a table with non-existent event_id should fail
    await expect(
      tableRepo.save({
        eventId: nonExistentEventId,
        tableNumber: 1,
        qrToken: 'test-qr-token',
      }),
    ).rejects.toThrow();

    // Attempting to create a team with non-existent event_id should fail
    await expect(
      teamRepo.save({
        eventId: nonExistentEventId,
        name: 'Orphan Team',
        teamNumber: 1,
        barcodePayload: 'ORPHAN-BARCODE',
      }),
    ).rejects.toThrow();

    // Verify no orphan records were created
    const tables = await tableRepo.find();
    expect(tables).toHaveLength(0);

    const teams = await teamRepo.find();
    expect(teams).toHaveLength(0);
  });

  it('stores and retrieves JSONB data correctly in audit_log', async () => {
    const complexOldValue = {
      name: 'Original Name',
      settings: {
        nested: {
          value: 123,
          array: [1, 2, 3],
        },
      },
      date: '2026-01-01T00:00:00.000Z',
    };

    const complexNewValue = {
      name: 'Updated Name',
      settings: {
        nested: {
          value: 456,
          array: [4, 5, 6],
        },
      },
      date: '2026-06-15T00:00:00.000Z',
    };

    const auditLog = await auditLogRepo.save({
      actorType: ActorType.USER,
      actorId: 'user-123',
      action: AuditAction.UPDATED,
      entityType: 'events',
      entityId: randomUUID(),
      oldValue: complexOldValue,
      newValue: complexNewValue,
    });

    const loaded = await auditLogRepo.findOne({ where: { id: auditLog.id } });

    expect(loaded).toBeDefined();
    expect(loaded?.oldValue).toEqual(complexOldValue);
    expect(loaded?.newValue).toEqual(complexNewValue);
    expect((loaded?.oldValue as typeof complexOldValue)?.settings?.nested?.value).toBe(123);
    expect((loaded?.newValue as typeof complexNewValue)?.settings?.nested?.array).toEqual([4, 5, 6]);
  });

  it('stores score value with decimal precision', async () => {
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

    // Test various decimal precision values
    const testValues = [7.5, 8.25, 6.75, 9.0, 1.01];

    for (let i = 0; i < testValues.length; i++) {
      const newSeat = await createTestSeat(ctx, { tableId: table.id });
      const score = await scoreRepo.save({
        submissionId: submission.id,
        seatId: newSeat.id,
        criterionId: criterion.id,
        scoreValue: testValues[i],
        phase: ScoringPhase.TASTE_TEXTURE,
      });

      const loaded = await scoreRepo.findOne({ where: { id: score.id } });
      expect(Number(loaded?.scoreValue)).toBe(testValues[i]);
    }
  });
});
