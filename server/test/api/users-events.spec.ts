import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../src/entities/user.entity';
import { Event, EventStatus, AggregationMethod } from '../../src/entities/event.entity';
import { entities } from '../../src/entities';
import { UsersService } from '../../src/users/users.service';
import { EventsService } from '../../src/events/events.service';

/**
 * Test DataSource for user and event service tests.
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

describe('User and Event Service Tests (Task 5.1)', () => {
  let userRepo: Repository<User>;
  let eventRepo: Repository<Event>;
  let usersService: UsersService;
  let eventsService: EventsService;

  beforeAll(async () => {
    await testDataSource.initialize();
    userRepo = testDataSource.getRepository(User);
    eventRepo = testDataSource.getRepository(Event);

    // Create service instances with injected repositories
    usersService = new UsersService(userRepo);
    eventsService = new EventsService(eventRepo);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);
  });

  describe('UsersService', () => {
    it('creates a user with password hashing', async () => {
      const user = await usersService.create({
        username: 'testadmin',
        password: 'securepassword123',
        role: UserRole.ADMIN,
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testadmin');
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.passwordHash).not.toBe('securepassword123');
      expect(user.passwordHash.startsWith('$2')).toBe(true);

      const isValid = await bcrypt.compare('securepassword123', user.passwordHash);
      expect(isValid).toBe(true);
    });

    it('lists all users (ADMIN only functionality)', async () => {
      await usersService.create({
        username: 'user1',
        password: 'password123',
        role: UserRole.ADMIN,
      });
      await usersService.create({
        username: 'user2',
        password: 'password456',
        role: UserRole.OPERATOR,
      });

      const users = await usersService.findAll();

      expect(users).toHaveLength(2);
      expect(users.map((u) => u.username)).toContain('user1');
      expect(users.map((u) => u.username)).toContain('user2');
    });

    it('updates a user', async () => {
      const user = await usersService.create({
        username: 'originalname',
        password: 'password123',
        role: UserRole.OPERATOR,
      });

      const updated = await usersService.update(user.id, {
        username: 'newname',
        role: UserRole.ADMIN,
      });

      expect(updated.username).toBe('newname');
      expect(updated.role).toBe(UserRole.ADMIN);
    });

    it('soft deletes a user', async () => {
      const user = await usersService.create({
        username: 'todelete',
        password: 'password123',
        role: UserRole.OPERATOR,
      });

      await usersService.remove(user.id);

      const found = await usersService.findAll();
      expect(found).toHaveLength(0);

      const withDeleted = await usersService.findAll(true);
      expect(withDeleted).toHaveLength(1);
      expect(withDeleted[0].deletedAt).not.toBeNull();
    });

    it('prevents duplicate usernames', async () => {
      await usersService.create({
        username: 'uniquename',
        password: 'password123',
        role: UserRole.ADMIN,
      });

      await expect(
        usersService.create({
          username: 'uniquename',
          password: 'password456',
          role: UserRole.OPERATOR,
        }),
      ).rejects.toThrow();
    });
  });

  describe('EventsService', () => {
    it('creates an event with default values', async () => {
      const event = await eventsService.create({
        name: 'BBQ Championship 2026',
        date: '2026-06-15',
      });

      expect(event.id).toBeDefined();
      expect(event.name).toBe('BBQ Championship 2026');
      expect(event.status).toBe(EventStatus.DRAFT);
      expect(Number(event.scoringScaleMin)).toBe(1);
      expect(Number(event.scoringScaleMax)).toBe(9);
      expect(Number(event.scoringScaleStep)).toBe(1);
      expect(event.aggregationMethod).toBe(AggregationMethod.MEAN);
    });

    it('lists events (any authenticated user)', async () => {
      await eventsService.create({ name: 'Event 1', date: '2026-06-15' });
      await eventsService.create({ name: 'Event 2', date: '2026-07-15' });

      const events = await eventsService.findAll();

      expect(events).toHaveLength(2);
    });

    it('updates event status (OPERATOR status-only restriction tested at controller level)', async () => {
      const event = await eventsService.create({
        name: 'Status Test Event',
        date: '2026-06-15',
        status: EventStatus.DRAFT,
      });

      const updated = await eventsService.updateStatus(event.id, EventStatus.ACTIVE);

      expect(updated.status).toBe(EventStatus.ACTIVE);
    });

    it('excludes soft-deleted by default, includeDeleted works', async () => {
      const event = await eventsService.create({
        name: 'Delete Test Event',
        date: '2026-06-15',
      });

      await eventsService.remove(event.id);

      const found = await eventsService.findAll();
      expect(found).toHaveLength(0);

      const withDeleted = await eventsService.findAll(true);
      expect(withDeleted).toHaveLength(1);
      expect(withDeleted[0].deletedAt).not.toBeNull();
    });

    it('validates scoringScaleMin < scoringScaleMax', async () => {
      await expect(
        eventsService.create({
          name: 'Invalid Scale Event',
          date: '2026-06-15',
          scoringScaleMin: 9,
          scoringScaleMax: 1,
        }),
      ).rejects.toThrow();
    });

    it('validates status transitions', async () => {
      const event = await eventsService.create({
        name: 'Transition Test Event',
        date: '2026-06-15',
        status: EventStatus.DRAFT,
      });

      // Valid transition: DRAFT -> ACTIVE
      await eventsService.updateStatus(event.id, EventStatus.ACTIVE);

      // Invalid transition: ACTIVE -> DRAFT (not allowed)
      await expect(eventsService.updateStatus(event.id, EventStatus.DRAFT)).rejects.toThrow();
    });
  });
});
