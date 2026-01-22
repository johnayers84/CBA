/**
 * Tests for Audit Log endpoints.
 * These tests verify the read-only audit log API functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { entities } from '../../src/entities';
import { AuditLog, ActorType, AuditAction } from '../../src/entities/audit-log.entity';
import { Event, EventStatus } from '../../src/entities/event.entity';
import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import {
  createFactoryContext,
  resetFactoryCounters,
  createTestEvent,
  createTestAuditLog,
  FactoryContext,
} from '../factories';

/**
 * Test DataSource for audit log tests with all entities.
 */
const auditLogTestDataSource = new DataSource({
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

describe('AuditLogsService', () => {
  let ctx: FactoryContext;
  let auditLogRepo: Repository<AuditLog>;
  let eventRepo: Repository<Event>;
  let auditLogsService: AuditLogsService;

  beforeAll(async () => {
    if (!auditLogTestDataSource.isInitialized) {
      try {
        await auditLogTestDataSource.initialize();
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

    ctx = createFactoryContext(auditLogTestDataSource);
    auditLogRepo = auditLogTestDataSource.getRepository(AuditLog);
    eventRepo = auditLogTestDataSource.getRepository(Event);
    auditLogsService = new AuditLogsService(auditLogRepo);
  });

  afterAll(async () => {
    if (auditLogTestDataSource.isInitialized) {
      await auditLogTestDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await auditLogTestDataSource.synchronize(true);
    resetFactoryCounters(ctx);
  });

  describe('findByEventId', () => {
    it('lists audit logs filtered by event ID', async () => {
      const event1 = await createTestEvent(ctx);
      const event2 = await createTestEvent(ctx);

      // Create audit logs for event1
      await createTestAuditLog(ctx, {
        eventId: event1.id,
        entityType: 'events',
        entityId: event1.id,
        action: AuditAction.CREATED,
        actorType: ActorType.USER,
        actorId: 'user-1',
      });
      await createTestAuditLog(ctx, {
        eventId: event1.id,
        entityType: 'tables',
        entityId: randomUUID(),
        action: AuditAction.CREATED,
        actorType: ActorType.USER,
        actorId: 'user-1',
      });

      // Create audit log for event2
      await createTestAuditLog(ctx, {
        eventId: event2.id,
        entityType: 'events',
        entityId: event2.id,
        action: AuditAction.CREATED,
        actorType: ActorType.USER,
        actorId: 'user-2',
      });

      const result = await auditLogsService.findByEventId(event1.id, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((log) => log.eventId === event1.id)).toBe(true);
      expect(result.meta.totalItems).toBe(2);
    });
  });

  describe('findAll', () => {
    it('lists all audit logs with pagination', async () => {
      // Create 5 audit logs
      for (let i = 0; i < 5; i++) {
        await createTestAuditLog(ctx, {
          entityType: 'events',
          entityId: randomUUID(),
          action: AuditAction.CREATED,
          actorType: ActorType.SYSTEM,
        });
      }

      // Get first page with pageSize of 2
      const page1 = await auditLogsService.findAll({ page: 1, pageSize: 2 });

      expect(page1.data).toHaveLength(2);
      expect(page1.meta.totalItems).toBe(5);
      expect(page1.meta.totalPages).toBe(3);
      expect(page1.meta.page).toBe(1);

      // Get second page
      const page2 = await auditLogsService.findAll({ page: 2, pageSize: 2 });

      expect(page2.data).toHaveLength(2);
      expect(page2.meta.page).toBe(2);

      // Verify different logs on each page
      const page1Ids = page1.data.map((log) => log.id);
      const page2Ids = page2.data.map((log) => log.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });
  });

  describe('findOne', () => {
    it('retrieves a single audit log by ID', async () => {
      const event = await createTestEvent(ctx);
      const auditLog = await createTestAuditLog(ctx, {
        eventId: event.id,
        entityType: 'events',
        entityId: event.id,
        action: AuditAction.UPDATED,
        actorType: ActorType.USER,
        actorId: 'user-123',
        oldValue: { name: 'Old Name' },
        newValue: { name: 'New Name' },
      });

      const result = await auditLogsService.findOne(auditLog.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(auditLog.id);
      expect(result?.eventId).toBe(event.id);
      expect(result?.entityType).toBe('events');
      expect(result?.action).toBe(AuditAction.UPDATED);
      expect(result?.oldValue).toEqual({ name: 'Old Name' });
      expect(result?.newValue).toEqual({ name: 'New Name' });
    });

    it('returns null for non-existent audit log ID', async () => {
      const result = await auditLogsService.findOne(randomUUID());

      expect(result).toBeNull();
    });
  });

  describe('filtering', () => {
    it('filters audit logs by action type', async () => {
      await createTestAuditLog(ctx, {
        action: AuditAction.CREATED,
        entityType: 'events',
      });
      await createTestAuditLog(ctx, {
        action: AuditAction.UPDATED,
        entityType: 'events',
      });
      await createTestAuditLog(ctx, {
        action: AuditAction.SOFT_DELETED,
        entityType: 'events',
      });

      const result = await auditLogsService.findAll({
        page: 1,
        pageSize: 20,
        action: AuditAction.CREATED,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe(AuditAction.CREATED);
    });
  });
});
