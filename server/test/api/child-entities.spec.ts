import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { Event, EventStatus } from '../../src/entities/event.entity';
import { Table } from '../../src/entities/table.entity';
import { Seat } from '../../src/entities/seat.entity';
import { Category } from '../../src/entities/category.entity';
import { Criterion } from '../../src/entities/criterion.entity';
import { Team } from '../../src/entities/team.entity';
import { entities } from '../../src/entities';
import { TablesService } from '../../src/tables/tables.service';
import { SeatsService } from '../../src/seats/seats.service';
import { CategoriesService } from '../../src/categories/categories.service';
import { CriteriaService } from '../../src/criteria/criteria.service';
import { TeamsService } from '../../src/teams/teams.service';
import { ConfigService } from '@nestjs/config';

/**
 * Mock ConfigService for tests.
 */
const mockConfigService = {
  get: (key: string) => {
    if (key === 'BARCODE_SECRET') return 'test-barcode-secret';
    return undefined;
  },
} as ConfigService;

/**
 * Test DataSource for child entity service tests.
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

describe('Child Entity Service Tests (Task 6.1)', () => {
  let eventRepo: Repository<Event>;
  let tableRepo: Repository<Table>;
  let seatRepo: Repository<Seat>;
  let categoryRepo: Repository<Category>;
  let criterionRepo: Repository<Criterion>;
  let teamRepo: Repository<Team>;

  let tablesService: TablesService;
  let seatsService: SeatsService;
  let categoriesService: CategoriesService;
  let criteriaService: CriteriaService;
  let teamsService: TeamsService;

  let testEvent: Event;

  beforeAll(async () => {
    await testDataSource.initialize();
    eventRepo = testDataSource.getRepository(Event);
    tableRepo = testDataSource.getRepository(Table);
    seatRepo = testDataSource.getRepository(Seat);
    categoryRepo = testDataSource.getRepository(Category);
    criterionRepo = testDataSource.getRepository(Criterion);
    teamRepo = testDataSource.getRepository(Team);

    tablesService = new TablesService(tableRepo, eventRepo);
    seatsService = new SeatsService(seatRepo, tableRepo);
    categoriesService = new CategoriesService(categoryRepo, eventRepo);
    criteriaService = new CriteriaService(criterionRepo, eventRepo);
    teamsService = new TeamsService(teamRepo, eventRepo, mockConfigService);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);

    testEvent = await eventRepo.save({
      name: 'Test Event',
      date: new Date('2026-06-15'),
      status: EventStatus.DRAFT,
    });
  });

  describe('TablesService', () => {
    it('bulk creates tables for an event', async () => {
      const tables = await tablesService.createBulk(testEvent.id, [
        { tableNumber: 1 },
        { tableNumber: 2 },
        { tableNumber: 3 },
      ]);

      expect(tables).toHaveLength(3);
      expect(tables.map((t) => t.tableNumber)).toEqual([1, 2, 3]);
      tables.forEach((table) => {
        expect(table.qrToken).toHaveLength(64);
        expect(table.eventId).toBe(testEvent.id);
      });
    });

    it('regenerates token for a table', async () => {
      const table = await tablesService.create(testEvent.id, { tableNumber: 1 });
      const originalToken = table.qrToken;

      const updated = await tablesService.regenerateToken(table.id);

      expect(updated.qrToken).not.toBe(originalToken);
      expect(updated.qrToken).toHaveLength(64);
    });

    it('prevents duplicate table numbers per event', async () => {
      await tablesService.create(testEvent.id, { tableNumber: 1 });

      await expect(tablesService.create(testEvent.id, { tableNumber: 1 })).rejects.toThrow();
    });
  });

  describe('SeatsService', () => {
    let testTable: Table;

    beforeEach(async () => {
      testTable = await tablesService.create(testEvent.id, { tableNumber: 1 });
    });

    it('bulk creates seats for a table', async () => {
      const seats = await seatsService.createBulk(testTable.id, [
        { seatNumber: 1 },
        { seatNumber: 2 },
        { seatNumber: 3 },
      ]);

      expect(seats).toHaveLength(3);
      expect(seats.map((s) => s.seatNumber)).toEqual([1, 2, 3]);
      seats.forEach((seat) => {
        expect(seat.tableId).toBe(testTable.id);
      });
    });
  });

  describe('CategoriesService', () => {
    it('bulk creates categories with sortOrder', async () => {
      const categories = await categoriesService.createBulk(testEvent.id, [
        { name: 'Brisket', sortOrder: 1 },
        { name: 'Ribs', sortOrder: 2 },
        { name: 'Chicken', sortOrder: 3 },
      ]);

      expect(categories).toHaveLength(3);
      expect(categories.map((c) => c.name)).toEqual(['Brisket', 'Ribs', 'Chicken']);
      expect(categories.map((c) => c.sortOrder)).toEqual([1, 2, 3]);
    });

    it('prevents duplicate category names per event', async () => {
      await categoriesService.create(testEvent.id, { name: 'Brisket' });

      await expect(categoriesService.create(testEvent.id, { name: 'Brisket' })).rejects.toThrow();
    });
  });

  describe('CriteriaService', () => {
    it('bulk creates criteria with weights', async () => {
      const criteria = await criteriaService.createBulk(testEvent.id, [
        { name: 'Appearance', weight: 1.0, sortOrder: 1 },
        { name: 'Taste', weight: 2.0, sortOrder: 2 },
        { name: 'Texture', weight: 1.5, sortOrder: 3 },
      ]);

      expect(criteria).toHaveLength(3);
      expect(criteria.map((c) => c.name)).toEqual(['Appearance', 'Taste', 'Texture']);
      expect(criteria.map((c) => Number(c.weight))).toEqual([1.0, 2.0, 1.5]);
    });
  });

  describe('TeamsService', () => {
    it('bulk creates teams', async () => {
      const teams = await teamsService.createBulk(testEvent.id, [
        { name: 'Smoke Masters', teamNumber: 1 },
        { name: 'BBQ Kings', teamNumber: 2 },
        { name: 'Grill Wizards', teamNumber: 3 },
      ]);

      expect(teams).toHaveLength(3);
      expect(teams.map((t) => t.name)).toEqual(['Smoke Masters', 'BBQ Kings', 'Grill Wizards']);
      teams.forEach((team) => {
        // New HMAC format: {eventId}:{teamId}:{timestamp}:{signature}
        expect(team.barcodePayload).toMatch(
          /^[0-9a-f-]{36}:[0-9a-f-]{36}:\d+:[0-9a-f]{16}$/,
        );
        expect(team.codeInvalidatedAt).toBeNull();
      });
    });

    it('invalidates code for a team', async () => {
      const team = await teamsService.create(testEvent.id, { name: 'Test Team', teamNumber: 1 });
      const originalBarcode = team.barcodePayload;

      const updated = await teamsService.invalidateCode(team.id);

      expect(updated.codeInvalidatedAt).not.toBeNull();
      expect(updated.barcodePayload).not.toBe(originalBarcode);
    });

    it('prevents duplicate team numbers per event', async () => {
      await teamsService.create(testEvent.id, { name: 'Team 1', teamNumber: 1 });

      await expect(
        teamsService.create(testEvent.id, { name: 'Team 1 Duplicate', teamNumber: 1 }),
      ).rejects.toThrow();
    });
  });

  describe('Shallow nesting routes', () => {
    it('lists child entities by parent (tables by event)', async () => {
      await tablesService.createBulk(testEvent.id, [{ tableNumber: 1 }, { tableNumber: 2 }]);

      const tables = await tablesService.findAllByEvent(testEvent.id);

      expect(tables).toHaveLength(2);
      tables.forEach((table) => {
        expect(table.eventId).toBe(testEvent.id);
      });
    });

    it('gets single entity by ID (direct access)', async () => {
      const table = await tablesService.create(testEvent.id, { tableNumber: 1 });

      const found = await tablesService.findOne(table.id);

      expect(found.id).toBe(table.id);
      expect(found.tableNumber).toBe(1);
    });
  });
});
