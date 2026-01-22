/**
 * Test factory utilities for creating entities with sensible defaults.
 * These factories simplify test setup by providing consistent entity creation.
 */

import { DataSource, Repository, DeepPartial } from 'typeorm';
import { User, UserRole } from '../../src/entities/user.entity';
import { Event, EventStatus, AggregationMethod } from '../../src/entities/event.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { Submission, SubmissionStatus } from '../../src/entities/submission.entity';
import { Score, ScoringPhase } from '../../src/entities/score.entity';
import { AuditLog, ActorType, AuditAction } from '../../src/entities/audit-log.entity';
import { randomUUID } from 'crypto';

/**
 * Factory context containing the DataSource and counters for unique values.
 */
export interface FactoryContext {
  dataSource: DataSource;
  counters: {
    user: number;
    event: number;
    table: number;
    seat: number;
    category: number;
    criterion: number;
    team: number;
    submission: number;
    score: number;
    auditLog: number;
  };
}

/**
 * Create a new factory context for test entity creation.
 */
export function createFactoryContext(dataSource: DataSource): FactoryContext {
  return {
    dataSource,
    counters: {
      user: 0,
      event: 0,
      table: 0,
      seat: 0,
      category: 0,
      criterion: 0,
      team: 0,
      submission: 0,
      score: 0,
      auditLog: 0,
    },
  };
}

/**
 * Reset all counters in the factory context.
 * Call this in beforeEach to ensure unique values across tests.
 */
export function resetFactoryCounters(ctx: FactoryContext): void {
  ctx.counters = {
    user: 0,
    event: 0,
    table: 0,
    seat: 0,
    category: 0,
    criterion: 0,
    team: 0,
    submission: 0,
    score: 0,
    auditLog: 0,
  };
}

/**
 * Create a test user with sensible defaults.
 */
export async function createTestUser(
  ctx: FactoryContext,
  overrides: DeepPartial<User> = {},
): Promise<User> {
  ctx.counters.user++;
  const repo: Repository<User> = ctx.dataSource.getRepository(User);

  const defaults: DeepPartial<User> = {
    username: `testuser${ctx.counters.user}`,
    passwordHash: '$2b$10$examplehashforuser' + ctx.counters.user,
    role: UserRole.OPERATOR,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test event with sensible defaults.
 */
export async function createTestEvent(
  ctx: FactoryContext,
  overrides: DeepPartial<Event> = {},
): Promise<Event> {
  ctx.counters.event++;
  const repo: Repository<Event> = ctx.dataSource.getRepository(Event);

  const defaults: DeepPartial<Event> = {
    name: `Test Event ${ctx.counters.event}`,
    date: new Date('2026-06-15'),
    location: 'Test Venue',
    status: EventStatus.DRAFT,
    scoringScaleMin: 1,
    scoringScaleMax: 9,
    scoringScaleStep: 1,
    aggregationMethod: AggregationMethod.MEAN,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test table linked to an event.
 * If eventId is not provided, creates a new event first.
 */
export async function createTestTable(
  ctx: FactoryContext,
  overrides: DeepPartial<Table> & { eventId?: string } = {},
): Promise<Table> {
  ctx.counters.table++;
  const repo: Repository<Table> = ctx.dataSource.getRepository(Table);

  let eventId = overrides.eventId;
  if (!eventId) {
    const event = await createTestEvent(ctx);
    eventId = event.id;
  }

  const defaults: DeepPartial<Table> = {
    eventId,
    tableNumber: ctx.counters.table,
    qrToken: `qr-token-${randomUUID().slice(0, 8)}`,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test seat linked to a table.
 * If tableId is not provided, creates a new table first.
 */
export async function createTestSeat(
  ctx: FactoryContext,
  overrides: DeepPartial<Seat> & { tableId?: string } = {},
): Promise<Seat> {
  ctx.counters.seat++;
  const repo: Repository<Seat> = ctx.dataSource.getRepository(Seat);

  let tableId = overrides.tableId;
  if (!tableId) {
    const table = await createTestTable(ctx);
    tableId = table.id;
  }

  const defaults: DeepPartial<Seat> = {
    tableId,
    seatNumber: ctx.counters.seat,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test category linked to an event.
 * If eventId is not provided, creates a new event first.
 */
export async function createTestCategory(
  ctx: FactoryContext,
  overrides: DeepPartial<Category> & { eventId?: string } = {},
): Promise<Category> {
  ctx.counters.category++;
  const repo: Repository<Category> = ctx.dataSource.getRepository(Category);

  let eventId = overrides.eventId;
  if (!eventId) {
    const event = await createTestEvent(ctx);
    eventId = event.id;
  }

  const categoryNames = ['Brisket', 'Ribs', 'Chicken', 'Pork'];
  const defaultName = categoryNames[(ctx.counters.category - 1) % categoryNames.length];

  const defaults: DeepPartial<Category> = {
    eventId,
    name: overrides.name || `${defaultName} ${ctx.counters.category}`,
    sortOrder: ctx.counters.category,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test criterion linked to an event.
 * If eventId is not provided, creates a new event first.
 */
export async function createTestCriterion(
  ctx: FactoryContext,
  overrides: DeepPartial<Criterion> & { eventId?: string } = {},
): Promise<Criterion> {
  ctx.counters.criterion++;
  const repo: Repository<Criterion> = ctx.dataSource.getRepository(Criterion);

  let eventId = overrides.eventId;
  if (!eventId) {
    const event = await createTestEvent(ctx);
    eventId = event.id;
  }

  const criterionNames = ['Appearance', 'Taste', 'Texture'];
  const defaultName = criterionNames[(ctx.counters.criterion - 1) % criterionNames.length];

  const defaults: DeepPartial<Criterion> = {
    eventId,
    name: overrides.name || `${defaultName} ${ctx.counters.criterion}`,
    weight: 1.0,
    sortOrder: ctx.counters.criterion,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test team linked to an event.
 * If eventId is not provided, creates a new event first.
 */
export async function createTestTeam(
  ctx: FactoryContext,
  overrides: DeepPartial<Team> & { eventId?: string } = {},
): Promise<Team> {
  ctx.counters.team++;
  const repo: Repository<Team> = ctx.dataSource.getRepository(Team);

  let eventId = overrides.eventId;
  if (!eventId) {
    const event = await createTestEvent(ctx);
    eventId = event.id;
  }

  const defaults: DeepPartial<Team> = {
    eventId,
    name: `Team ${ctx.counters.team}`,
    teamNumber: ctx.counters.team,
    barcodePayload: `AZTEC-PAYLOAD-${ctx.counters.team}-${randomUUID().slice(0, 8)}`,
    codeInvalidatedAt: null,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test submission linked to a team and category.
 * If teamId or categoryId are not provided, creates new entities first.
 */
export async function createTestSubmission(
  ctx: FactoryContext,
  overrides: DeepPartial<Submission> & { teamId?: string; categoryId?: string } = {},
): Promise<Submission> {
  ctx.counters.submission++;
  const repo: Repository<Submission> = ctx.dataSource.getRepository(Submission);

  let teamId = overrides.teamId;
  let categoryId = overrides.categoryId;

  if (!teamId) {
    const team = await createTestTeam(ctx);
    teamId = team.id;
  }

  if (!categoryId) {
    const category = await createTestCategory(ctx);
    categoryId = category.id;
  }

  const defaults: DeepPartial<Submission> = {
    teamId,
    categoryId,
    status: SubmissionStatus.PENDING,
    turnedInAt: null,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test score linked to a submission, seat, and criterion.
 * If submissionId, seatId, or criterionId are not provided, creates new entities first.
 */
export async function createTestScore(
  ctx: FactoryContext,
  overrides: DeepPartial<Score> & {
    submissionId?: string;
    seatId?: string;
    criterionId?: string;
  } = {},
): Promise<Score> {
  ctx.counters.score++;
  const repo: Repository<Score> = ctx.dataSource.getRepository(Score);

  let submissionId = overrides.submissionId;
  let seatId = overrides.seatId;
  let criterionId = overrides.criterionId;

  if (!submissionId) {
    const submission = await createTestSubmission(ctx);
    submissionId = submission.id;
  }

  if (!seatId) {
    const seat = await createTestSeat(ctx);
    seatId = seat.id;
  }

  if (!criterionId) {
    const criterion = await createTestCriterion(ctx);
    criterionId = criterion.id;
  }

  const defaults: DeepPartial<Score> = {
    submissionId,
    seatId,
    criterionId,
    scoreValue: 7.5,
    comment: null,
    phase: ScoringPhase.APPEARANCE,
  };

  return repo.save({ ...defaults, ...overrides });
}

/**
 * Create a test audit log entry.
 */
export async function createTestAuditLog(
  ctx: FactoryContext,
  overrides: DeepPartial<AuditLog> = {},
): Promise<AuditLog> {
  ctx.counters.auditLog++;
  const repo: Repository<AuditLog> = ctx.dataSource.getRepository(AuditLog);

  const defaults: DeepPartial<AuditLog> = {
    actorType: ActorType.SYSTEM,
    actorId: 'system',
    action: AuditAction.CREATED,
    entityType: 'test_entity',
    entityId: randomUUID(),
    oldValue: null,
    newValue: { test: 'data' },
    idempotencyKey: null,
    ipAddress: null,
    deviceFingerprint: null,
    eventId: null,
  };

  return repo.save({ ...defaults, ...overrides });
}
