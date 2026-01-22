/**
 * Database seeding utility for creating realistic test data.
 * This utility creates a complete competition scenario with:
 * - 1 event
 * - 3 tables with 6 seats each (18 total seats)
 * - 4 categories
 * - 3 criteria
 * - 10 teams
 * - Submissions for each team/category combination (40 submissions)
 * - Sample scores demonstrating all phases
 */

import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

import { Event, EventStatus, AggregationMethod } from '../../src/entities/event.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { Submission, SubmissionStatus } from '../../src/entities/submission.entity';
import { Score, ScoringPhase } from '../../src/entities/score.entity';
import { AuditLog, ActorType, AuditAction } from '../../src/entities/audit-log.entity';
import { User, UserRole } from '../../src/entities/user.entity';

/**
 * Seeded data result containing references to all created entities.
 */
export interface SeededData {
  event: Event;
  tables: Table[];
  seats: Seat[];
  categories: Category[];
  criteria: Criterion[];
  teams: Team[];
  submissions: Submission[];
  scores: Score[];
  users: User[];
}

/**
 * Seed configuration options.
 */
export interface SeedOptions {
  tableCount?: number;
  seatsPerTable?: number;
  categoryCount?: number;
  criterionCount?: number;
  teamCount?: number;
  createScores?: boolean;
  eventStatus?: EventStatus;
}

const defaultOptions: Required<SeedOptions> = {
  tableCount: 3,
  seatsPerTable: 6,
  categoryCount: 4,
  criterionCount: 3,
  teamCount: 10,
  createScores: true,
  eventStatus: EventStatus.ACTIVE,
};

/**
 * Generate a unique QR token for a table.
 */
function generateQrToken(): string {
  return `QR-${randomUUID().slice(0, 32)}`;
}

/**
 * Generate a barcode payload for a team.
 */
function generateBarcodePayload(teamNumber: number): string {
  return `AZTEC-BBQ-TEAM-${teamNumber}-${randomUUID().slice(0, 16)}`;
}

/**
 * Generate a random score value within the standard range.
 */
function randomScore(): number {
  const baseScores = [5, 6, 7, 7.5, 8, 8.5, 9];
  return baseScores[Math.floor(Math.random() * baseScores.length)];
}

/**
 * Seed the database with realistic competition data.
 */
export async function seedDatabase(
  dataSource: DataSource,
  options: SeedOptions = {},
): Promise<SeededData> {
  const opts = { ...defaultOptions, ...options };

  const eventRepo = dataSource.getRepository(Event);
  const tableRepo = dataSource.getRepository(Table);
  const seatRepo = dataSource.getRepository(Seat);
  const categoryRepo = dataSource.getRepository(Category);
  const criterionRepo = dataSource.getRepository(Criterion);
  const teamRepo = dataSource.getRepository(Team);
  const submissionRepo = dataSource.getRepository(Submission);
  const scoreRepo = dataSource.getRepository(Score);
  const userRepo = dataSource.getRepository(User);

  const result: SeededData = {
    event: {} as Event,
    tables: [],
    seats: [],
    categories: [],
    criteria: [],
    teams: [],
    submissions: [],
    scores: [],
    users: [],
  };

  // Create users
  const admin = await userRepo.save({
    username: 'admin',
    passwordHash: '$2b$10$seedadminhash',
    role: UserRole.ADMIN,
  });

  const operator = await userRepo.save({
    username: 'operator',
    passwordHash: '$2b$10$seedoperatorhash',
    role: UserRole.OPERATOR,
  });

  result.users = [admin, operator];

  // Create event
  result.event = await eventRepo.save({
    name: 'BBQ Championship 2026',
    date: new Date('2026-06-15'),
    location: 'Kansas City Convention Center',
    status: opts.eventStatus,
    scoringScaleMin: 1,
    scoringScaleMax: 9,
    scoringScaleStep: 0.5,
    aggregationMethod: AggregationMethod.TRIMMED_MEAN,
  });

  // Create tables and seats
  for (let t = 1; t <= opts.tableCount; t++) {
    const table = await tableRepo.save({
      eventId: result.event.id,
      tableNumber: t,
      qrToken: generateQrToken(),
    });
    result.tables.push(table);

    for (let s = 1; s <= opts.seatsPerTable; s++) {
      const seat = await seatRepo.save({
        tableId: table.id,
        seatNumber: s,
      });
      result.seats.push(seat);
    }
  }

  // Create categories
  const categoryNames = ['Brisket', 'Pork Ribs', 'Chicken', 'Pork Shoulder'];
  for (let c = 0; c < opts.categoryCount; c++) {
    const category = await categoryRepo.save({
      eventId: result.event.id,
      name: categoryNames[c % categoryNames.length],
      sortOrder: c + 1,
    });
    result.categories.push(category);
  }

  // Create criteria
  const criterionDefinitions = [
    { name: 'Appearance', weight: 0.1667 },
    { name: 'Taste', weight: 0.5 },
    { name: 'Tenderness', weight: 0.3333 },
  ];
  for (let cr = 0; cr < opts.criterionCount; cr++) {
    const def = criterionDefinitions[cr % criterionDefinitions.length];
    const criterion = await criterionRepo.save({
      eventId: result.event.id,
      name: def.name,
      weight: def.weight,
      sortOrder: cr + 1,
    });
    result.criteria.push(criterion);
  }

  // Create teams
  const teamNamePrefixes = [
    'Smokin',
    'BBQ',
    'Grill',
    'Pit',
    'Smoke',
    'Fire',
    'Hot',
    'Flame',
    'Char',
    'Burnt',
  ];
  const teamNameSuffixes = [
    'Masters',
    'Kings',
    'Champions',
    'Crew',
    'Team',
    'Squad',
    'Legends',
    'Pros',
    'Stars',
    'Elite',
  ];

  for (let tm = 1; tm <= opts.teamCount; tm++) {
    const prefix = teamNamePrefixes[(tm - 1) % teamNamePrefixes.length];
    const suffix = teamNameSuffixes[(tm - 1) % teamNameSuffixes.length];

    const team = await teamRepo.save({
      eventId: result.event.id,
      name: `${prefix} ${suffix}`,
      teamNumber: tm,
      barcodePayload: generateBarcodePayload(tm),
      codeInvalidatedAt: null,
    });
    result.teams.push(team);
  }

  // Create submissions for each team/category combination
  const submissionStatuses = [
    SubmissionStatus.PENDING,
    SubmissionStatus.TURNED_IN,
    SubmissionStatus.BEING_JUDGED,
    SubmissionStatus.SCORED,
  ];

  for (const team of result.teams) {
    for (const category of result.categories) {
      const statusIndex = (result.submissions.length % submissionStatuses.length);
      const status = submissionStatuses[statusIndex];

      const submission = await submissionRepo.save({
        teamId: team.id,
        categoryId: category.id,
        status,
        turnedInAt: status !== SubmissionStatus.PENDING ? new Date() : null,
      });
      result.submissions.push(submission);
    }
  }

  // Create sample scores if requested
  if (opts.createScores) {
    // Only create scores for submissions that are being judged or scored
    const scorableSubmissions = result.submissions.filter(
      (s) => s.status === SubmissionStatus.BEING_JUDGED || s.status === SubmissionStatus.SCORED,
    );

    for (const submission of scorableSubmissions) {
      // Get a subset of seats to create scores for (simulate judges scoring)
      const judgingSeats = result.seats.slice(0, 6); // First 6 seats (1 table)

      for (const seat of judgingSeats) {
        for (const criterion of result.criteria) {
          // Determine phase based on criterion
          const phase =
            criterion.name === 'Appearance'
              ? ScoringPhase.APPEARANCE
              : ScoringPhase.TASTE_TEXTURE;

          const score = await scoreRepo.save({
            submissionId: submission.id,
            seatId: seat.id,
            criterionId: criterion.id,
            scoreValue: randomScore(),
            comment: Math.random() > 0.7 ? 'Great entry!' : null,
            phase,
          });
          result.scores.push(score);
        }
      }
    }
  }

  return result;
}

/**
 * Clear all data from the database.
 * Useful for resetting between test runs.
 */
export async function clearDatabase(dataSource: DataSource): Promise<void> {
  const entities = [
    'scores',
    'submissions',
    'seats',
    'tables',
    'teams',
    'criteria',
    'categories',
    'audit_log',
    'events',
    'users',
  ];

  for (const entity of entities) {
    await dataSource.query(`TRUNCATE TABLE "${entity}" CASCADE`);
  }
}
