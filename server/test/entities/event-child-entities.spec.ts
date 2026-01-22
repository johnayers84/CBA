import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { Event, EventStatus } from '../../src/entities/event.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { entities } from '../../src/entities';

/**
 * Test DataSource for event child entities.
 * Uses full entities array to satisfy TypeORM relationship requirements.
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

describe('Event Child Entities', () => {
  let eventRepo: Repository<Event>;
  let tableRepo: Repository<Table>;
  let seatRepo: Repository<Seat>;
  let categoryRepo: Repository<Category>;
  let criterionRepo: Repository<Criterion>;
  let teamRepo: Repository<Team>;

  let testEvent: Event;

  beforeAll(async () => {
    await testDataSource.initialize();
    eventRepo = testDataSource.getRepository(Event);
    tableRepo = testDataSource.getRepository(Table);
    seatRepo = testDataSource.getRepository(Seat);
    categoryRepo = testDataSource.getRepository(Category);
    criterionRepo = testDataSource.getRepository(Criterion);
    teamRepo = testDataSource.getRepository(Team);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);
    // Create a test event for child entity tests
    testEvent = await eventRepo.save({
      name: 'Test BBQ Event',
      date: new Date('2026-06-15'),
      status: EventStatus.DRAFT,
    });
  });

  describe('Table Entity', () => {
    it('creates a table with event relationship', async () => {
      const table = await tableRepo.save({
        eventId: testEvent.id,
        tableNumber: 1,
        qrToken: 'unique-qr-token-123',
      });

      expect(table.id).toBeDefined();
      expect(table.eventId).toBe(testEvent.id);
      expect(table.tableNumber).toBe(1);
      expect(table.qrToken).toBe('unique-qr-token-123');
      expect(table.createdAt).toBeInstanceOf(Date);

      // Verify relationship loading
      const loadedTable = await tableRepo.findOne({
        where: { id: table.id },
        relations: ['event'],
      });
      expect(loadedTable?.event).toBeDefined();
      expect(loadedTable?.event.id).toBe(testEvent.id);
    });

    it('enforces unique constraint on (event_id, table_number)', async () => {
      await tableRepo.save({
        eventId: testEvent.id,
        tableNumber: 1,
        qrToken: 'qr-token-1',
      });

      await expect(
        tableRepo.save({
          eventId: testEvent.id,
          tableNumber: 1,
          qrToken: 'qr-token-2',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Seat Entity', () => {
    it('creates a seat with table relationship', async () => {
      const table = await tableRepo.save({
        eventId: testEvent.id,
        tableNumber: 1,
        qrToken: 'qr-token-for-seat-test',
      });

      const seat = await seatRepo.save({
        tableId: table.id,
        seatNumber: 1,
      });

      expect(seat.id).toBeDefined();
      expect(seat.tableId).toBe(table.id);
      expect(seat.seatNumber).toBe(1);
      expect(seat.createdAt).toBeInstanceOf(Date);

      // Verify relationship loading
      const loadedSeat = await seatRepo.findOne({
        where: { id: seat.id },
        relations: ['table'],
      });
      expect(loadedSeat?.table).toBeDefined();
      expect(loadedSeat?.table.id).toBe(table.id);
    });

    it('enforces unique constraint on (table_id, seat_number)', async () => {
      const table = await tableRepo.save({
        eventId: testEvent.id,
        tableNumber: 1,
        qrToken: 'qr-token-seat-unique',
      });

      await seatRepo.save({
        tableId: table.id,
        seatNumber: 1,
      });

      await expect(
        seatRepo.save({
          tableId: table.id,
          seatNumber: 1,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Category Entity', () => {
    it('creates a category with event relationship', async () => {
      const category = await categoryRepo.save({
        eventId: testEvent.id,
        name: 'Brisket',
        sortOrder: 1,
      });

      expect(category.id).toBeDefined();
      expect(category.eventId).toBe(testEvent.id);
      expect(category.name).toBe('Brisket');
      expect(category.sortOrder).toBe(1);
      expect(category.createdAt).toBeInstanceOf(Date);

      // Verify relationship loading
      const loadedCategory = await categoryRepo.findOne({
        where: { id: category.id },
        relations: ['event'],
      });
      expect(loadedCategory?.event).toBeDefined();
      expect(loadedCategory?.event.id).toBe(testEvent.id);
    });

    it('enforces unique constraint on (event_id, name)', async () => {
      await categoryRepo.save({
        eventId: testEvent.id,
        name: 'Brisket',
      });

      await expect(
        categoryRepo.save({
          eventId: testEvent.id,
          name: 'Brisket',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Criterion Entity', () => {
    it('creates a criterion with weight default value', async () => {
      const criterion = await criterionRepo.save({
        eventId: testEvent.id,
        name: 'Appearance',
      });

      expect(criterion.id).toBeDefined();
      expect(criterion.eventId).toBe(testEvent.id);
      expect(criterion.name).toBe('Appearance');
      expect(Number(criterion.weight)).toBe(1);
      expect(criterion.sortOrder).toBe(0);
      expect(criterion.createdAt).toBeInstanceOf(Date);

      // Verify relationship loading
      const loadedCriterion = await criterionRepo.findOne({
        where: { id: criterion.id },
        relations: ['event'],
      });
      expect(loadedCriterion?.event).toBeDefined();
      expect(loadedCriterion?.event.id).toBe(testEvent.id);
    });
  });

  describe('Team Entity', () => {
    it('stores barcode_payload and code_invalidated_at correctly', async () => {
      const team: Team = await teamRepo.save({
        eventId: testEvent.id,
        name: 'Smokin Hot BBQ',
        teamNumber: 1,
        barcodePayload: 'AZTEC-PAYLOAD-DATA-12345',
        codeInvalidatedAt: null,
      });

      expect(team.id).toBeDefined();
      expect(team.eventId).toBe(testEvent.id);
      expect(team.name).toBe('Smokin Hot BBQ');
      expect(team.teamNumber).toBe(1);
      expect(team.barcodePayload).toBe('AZTEC-PAYLOAD-DATA-12345');
      expect(team.codeInvalidatedAt).toBeNull();
      expect(team.createdAt).toBeInstanceOf(Date);

      // Test updating code_invalidated_at
      const invalidationTime = new Date();
      team.codeInvalidatedAt = invalidationTime;
      const updatedTeam = await teamRepo.save(team);
      expect(updatedTeam.codeInvalidatedAt).toBeInstanceOf(Date);

      // Verify relationship loading
      const loadedTeam = await teamRepo.findOne({
        where: { id: team.id },
        relations: ['event'],
      });
      expect(loadedTeam?.event).toBeDefined();
      expect(loadedTeam?.event.id).toBe(testEvent.id);
    });
  });
});
