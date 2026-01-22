import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource } from 'typeorm';
import { AuditLog, ActorType, AuditAction } from '../../src/entities/audit-log.entity';
import { Event, EventStatus, AggregationMethod } from '../../src/entities/event.entity';
import { entities } from '../../src/entities';
import { randomUUID } from 'crypto';

/**
 * Test-specific DataSource for audit log entity tests.
 * Uses full entities array to satisfy TypeORM relationship requirements.
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

describe('AuditLog Entity', () => {
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
  });

  afterAll(async () => {
    if (auditLogTestDataSource.isInitialized) {
      await auditLogTestDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await auditLogTestDataSource.synchronize(true);
  });

  it('creates audit log with all required fields', async () => {
    const repo = auditLogTestDataSource.getRepository(AuditLog);
    const entityId = randomUUID();

    const auditLog = await repo.save({
      actorType: ActorType.USER,
      actorId: 'user-123',
      action: AuditAction.CREATED,
      entityType: 'events',
      entityId: entityId,
      newValue: { name: 'Test Event', status: 'draft' },
      ipAddress: '192.168.1.1',
      deviceFingerprint: 'test-device-fingerprint',
    });

    expect(auditLog.id).toBeDefined();
    expect(auditLog.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(auditLog.timestamp).toBeInstanceOf(Date);
    expect(auditLog.actorType).toBe(ActorType.USER);
    expect(auditLog.actorId).toBe('user-123');
    expect(auditLog.action).toBe(AuditAction.CREATED);
    expect(auditLog.entityType).toBe('events');
    expect(auditLog.entityId).toBe(entityId);
    expect(auditLog.newValue).toEqual({ name: 'Test Event', status: 'draft' });
    expect(auditLog.oldValue).toBeNull();
    expect(auditLog.ipAddress).toBe('192.168.1.1');
    expect(auditLog.deviceFingerprint).toBe('test-device-fingerprint');
  });

  it('validates actor_type enum values (user, judge, system)', async () => {
    const repo = auditLogTestDataSource.getRepository(AuditLog);
    const entityId = randomUUID();

    const userLog = await repo.save({
      actorType: ActorType.USER,
      action: AuditAction.CREATED,
      entityType: 'users',
      entityId: entityId,
    });
    expect(userLog.actorType).toBe('user');

    const judgeLog = await repo.save({
      actorType: ActorType.JUDGE,
      action: AuditAction.CREATED,
      entityType: 'scores',
      entityId: randomUUID(),
    });
    expect(judgeLog.actorType).toBe('judge');

    const systemLog = await repo.save({
      actorType: ActorType.SYSTEM,
      action: AuditAction.UPDATED,
      entityType: 'events',
      entityId: randomUUID(),
    });
    expect(systemLog.actorType).toBe('system');

    // Verify all enum values are valid
    expect(Object.values(ActorType)).toEqual(['user', 'judge', 'system']);
  });

  it('validates action enum values (created, updated, soft_deleted, status_changed)', async () => {
    const repo = auditLogTestDataSource.getRepository(AuditLog);

    const createdLog = await repo.save({
      actorType: ActorType.USER,
      action: AuditAction.CREATED,
      entityType: 'events',
      entityId: randomUUID(),
      newValue: { name: 'New Event' },
    });
    expect(createdLog.action).toBe('created');

    const updatedLog = await repo.save({
      actorType: ActorType.USER,
      action: AuditAction.UPDATED,
      entityType: 'events',
      entityId: randomUUID(),
      oldValue: { name: 'Old Name' },
      newValue: { name: 'New Name' },
    });
    expect(updatedLog.action).toBe('updated');

    const softDeletedLog = await repo.save({
      actorType: ActorType.USER,
      action: AuditAction.SOFT_DELETED,
      entityType: 'teams',
      entityId: randomUUID(),
      oldValue: { deleted_at: null },
      newValue: { deleted_at: new Date().toISOString() },
    });
    expect(softDeletedLog.action).toBe('soft_deleted');

    const statusChangedLog = await repo.save({
      actorType: ActorType.SYSTEM,
      action: AuditAction.STATUS_CHANGED,
      entityType: 'submissions',
      entityId: randomUUID(),
      oldValue: { status: 'pending' },
      newValue: { status: 'turned_in' },
    });
    expect(statusChangedLog.action).toBe('status_changed');

    // Verify all enum values are valid
    expect(Object.values(AuditAction)).toEqual([
      'created',
      'updated',
      'soft_deleted',
      'status_changed',
    ]);
  });

  it('enforces idempotency_key unique constraint when not null', async () => {
    const repo = auditLogTestDataSource.getRepository(AuditLog);
    const idempotencyKey = `create-event-${randomUUID()}`;

    const firstLog = await repo.save({
      actorType: ActorType.USER,
      action: AuditAction.CREATED,
      entityType: 'events',
      entityId: randomUUID(),
      idempotencyKey: idempotencyKey,
    });
    expect(firstLog.idempotencyKey).toBe(idempotencyKey);

    await expect(
      repo.save({
        actorType: ActorType.USER,
        action: AuditAction.CREATED,
        entityType: 'events',
        entityId: randomUUID(),
        idempotencyKey: idempotencyKey,
      }),
    ).rejects.toThrow();

    // Multiple null idempotency keys should be allowed
    const nullKey1 = await repo.save({
      actorType: ActorType.SYSTEM,
      action: AuditAction.UPDATED,
      entityType: 'events',
      entityId: randomUUID(),
      idempotencyKey: null,
    });
    expect(nullKey1.idempotencyKey).toBeNull();

    const nullKey2 = await repo.save({
      actorType: ActorType.SYSTEM,
      action: AuditAction.UPDATED,
      entityType: 'events',
      entityId: randomUUID(),
      idempotencyKey: null,
    });
    expect(nullKey2.idempotencyKey).toBeNull();

    // Both should be saved successfully
    expect(nullKey1.id).not.toBe(nullKey2.id);
  });
});
