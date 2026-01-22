import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create the events table.
 * Events represent BBQ competition events with scoring configuration.
 */
export class CreateEventsTable1736820000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'draft'",
          },
          {
            name: 'scoring_scale_min',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 1,
          },
          {
            name: 'scoring_scale_max',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 9,
          },
          {
            name: 'scoring_scale_step',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 1,
          },
          {
            name: 'aggregation_method',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'mean'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add CHECK constraint for status values
    await queryRunner.query(`
      ALTER TABLE events
      ADD CONSTRAINT chk_events_status
      CHECK (status IN ('draft', 'active', 'finalized', 'archived'))
    `);

    // Add CHECK constraint for aggregation_method values
    await queryRunner.query(`
      ALTER TABLE events
      ADD CONSTRAINT chk_events_aggregation_method
      CHECK (aggregation_method IN ('mean', 'trimmed_mean'))
    `);

    // Create partial index on status for filtering queries
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'idx_events_status',
        columnNames: ['status'],
        where: '"deleted_at" IS NULL',
      }),
    );

    // Create partial index on date for date-based queries
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'idx_events_date',
        columnNames: ['date'],
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('events', true, true, true);
  }
}
