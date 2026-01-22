import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create the audit_log table.
 * Audit logs track all data changes for complete audit trail.
 * This table is append-only - no updates or deletes are allowed.
 * Note: Does NOT have soft delete or updated_at columns.
 */
export class CreateAuditLogTable1736820000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_log',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'timestamp',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
          {
            name: 'actor_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'actor_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'entity_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'old_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'new_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'device_fingerprint',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'event_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add CHECK constraint for actor_type values
    await queryRunner.query(`
      ALTER TABLE "audit_log"
      ADD CONSTRAINT "chk_audit_log_actor_type"
      CHECK ("actor_type" IN ('user', 'judge', 'system'))
    `);

    // Add CHECK constraint for action values
    await queryRunner.query(`
      ALTER TABLE "audit_log"
      ADD CONSTRAINT "chk_audit_log_action"
      CHECK ("action" IN ('created', 'updated', 'soft_deleted', 'status_changed'))
    `);

    // Create nullable foreign key to events
    await queryRunner.createForeignKey(
      'audit_log',
      new TableForeignKey({
        name: 'fk_audit_log_event',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create composite index for entity history queries
    await queryRunner.createIndex(
      'audit_log',
      new TableIndex({
        name: 'idx_audit_log_entity',
        columnNames: ['entity_type', 'entity_id', 'timestamp'],
      }),
    );

    // Create conditional index on event_id (WHERE event_id IS NOT NULL)
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_event_id"
      ON "audit_log" ("event_id")
      WHERE "event_id" IS NOT NULL
    `);

    // Create index on timestamp for ordering queries
    await queryRunner.createIndex(
      'audit_log',
      new TableIndex({
        name: 'idx_audit_log_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    // Create conditional unique index on idempotency_key (WHERE idempotency_key IS NOT NULL)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_audit_log_idempotency"
      ON "audit_log" ("idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_log', true, true, true);
  }
}
