import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../../src/entities/user.entity';
import { Event, EventStatus, AggregationMethod } from '../../src/entities/event.entity';
import { entities } from '../../src/entities';

/**
 * Test DataSource for independent entities (users, events).
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

describe('Independent Entities', () => {
  let userRepo: Repository<User>;
  let eventRepo: Repository<Event>;

  beforeAll(async () => {
    await testDataSource.initialize();
    userRepo = testDataSource.getRepository(User);
    eventRepo = testDataSource.getRepository(Event);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);
  });

  describe('User Entity', () => {
    it('creates a user with required fields', async () => {
      const user = await userRepo.save({
        username: 'testadmin',
        passwordHash: '$2b$10$examplehash',
        role: UserRole.ADMIN,
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testadmin');
      expect(user.passwordHash).toBe('$2b$10$examplehash');
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('validates user role enum values', async () => {
      const admin = await userRepo.save({
        username: 'admin1',
        passwordHash: '$2b$10$hash1',
        role: UserRole.ADMIN,
      });
      expect(admin.role).toBe('admin');

      const operator = await userRepo.save({
        username: 'operator1',
        passwordHash: '$2b$10$hash2',
        role: UserRole.OPERATOR,
      });
      expect(operator.role).toBe('operator');
    });

    it('soft deletes a user correctly', async () => {
      const user = await userRepo.save({
        username: 'deletetest',
        passwordHash: '$2b$10$hash',
        role: UserRole.OPERATOR,
      });
      expect(user.deletedAt).toBeNull();

      await userRepo.softDelete(user.id);

      const found = await userRepo.findOne({ where: { id: user.id } });
      expect(found).toBeNull();

      const withDeleted = await userRepo.findOne({
        where: { id: user.id },
        withDeleted: true,
      });
      expect(withDeleted).toBeDefined();
      expect(withDeleted?.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('Event Entity', () => {
    it('creates an event with default values', async () => {
      const event = await eventRepo.save({
        name: 'BBQ Championship 2026',
        date: new Date('2026-06-15'),
      });

      expect(event.id).toBeDefined();
      expect(event.name).toBe('BBQ Championship 2026');
      expect(event.status).toBe(EventStatus.DRAFT);
      expect(Number(event.scoringScaleMin)).toBe(1);
      expect(Number(event.scoringScaleMax)).toBe(9);
      expect(Number(event.scoringScaleStep)).toBe(1);
      expect(event.aggregationMethod).toBe(AggregationMethod.MEAN);
      expect(event.location).toBeNull();
      expect(event.createdAt).toBeInstanceOf(Date);
    });

    it('validates event status enum values', async () => {
      const statuses = [
        EventStatus.DRAFT,
        EventStatus.ACTIVE,
        EventStatus.FINALIZED,
        EventStatus.ARCHIVED,
      ];

      for (const status of statuses) {
        const event = await eventRepo.save({
          name: `Event ${status}`,
          date: new Date(),
          status,
        });
        expect(event.status).toBe(status);
      }

      const events = await eventRepo.find();
      expect(events).toHaveLength(4);
    });

    it('soft deletes an event correctly', async () => {
      const event = await eventRepo.save({
        name: 'Delete Test Event',
        date: new Date('2026-07-20'),
        location: 'Test Venue',
      });
      expect(event.deletedAt).toBeNull();

      await eventRepo.softDelete(event.id);

      const found = await eventRepo.findOne({ where: { id: event.id } });
      expect(found).toBeNull();

      const withDeleted = await eventRepo.findOne({
        where: { id: event.id },
        withDeleted: true,
      });
      expect(withDeleted).toBeDefined();
      expect(withDeleted?.deletedAt).toBeInstanceOf(Date);
    });
  });
});
