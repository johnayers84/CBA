import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

/**
 * Actor type enum representing who performed the action.
 */
export enum ActorType {
  USER = 'user',
  JUDGE = 'judge',
  SYSTEM = 'system',
}

/**
 * Audit action enum representing the type of action performed.
 */
export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  SOFT_DELETED = 'soft_deleted',
  STATUS_CHANGED = 'status_changed',
}

/**
 * AuditLog entity for tracking all data changes.
 * This is an append-only table - no updates or deletes allowed.
 * Does NOT extend BaseEntity (custom structure - no soft delete, no updatedAt).
 */
@Entity('audit_log')
@Index('idx_audit_log_entity', ['entityType', 'entityId', 'timestamp'])
@Index('idx_audit_log_event_id', ['eventId'], { where: '"event_id" IS NOT NULL' })
@Index('idx_audit_log_timestamp', ['timestamp'])
@Index('idx_audit_log_idempotency', ['idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ name: 'actor_type', type: 'varchar', length: 20 })
  actorType: ActorType;

  @Column({ name: 'actor_id', type: 'varchar', length: 100, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 30 })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'device_fingerprint', type: 'varchar', length: 255, nullable: true })
  deviceFingerprint: string | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;
}
