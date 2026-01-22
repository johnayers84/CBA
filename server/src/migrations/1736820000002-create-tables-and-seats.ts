import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create the tables and seats tables.
 * Tables represent physical judging tables at events.
 * Seats represent individual judge positions at tables.
 */
export class CreateTablesAndSeats1736820000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tables table
    await queryRunner.createTable(
      new Table({
        name: 'tables',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'event_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'table_number',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'qr_token',
            type: 'varchar',
            length: '64',
            isNullable: false,
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

    // Create foreign key to events
    await queryRunner.createForeignKey(
      'tables',
      new TableForeignKey({
        name: 'fk_tables_event',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on event_id
    await queryRunner.createIndex(
      'tables',
      new TableIndex({
        name: 'idx_tables_event_id',
        columnNames: ['event_id'],
      }),
    );

    // Create unique partial index on qr_token
    await queryRunner.createIndex(
      'tables',
      new TableIndex({
        name: 'idx_tables_qr_token',
        columnNames: ['qr_token'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    // Create unique partial index on (event_id, table_number)
    await queryRunner.createIndex(
      'tables',
      new TableIndex({
        name: 'idx_tables_event_table_number',
        columnNames: ['event_id', 'table_number'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    // Create seats table
    await queryRunner.createTable(
      new Table({
        name: 'seats',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'table_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'seat_number',
            type: 'integer',
            isNullable: false,
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

    // Create foreign key to tables
    await queryRunner.createForeignKey(
      'seats',
      new TableForeignKey({
        name: 'fk_seats_table',
        columnNames: ['table_id'],
        referencedTableName: 'tables',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on table_id
    await queryRunner.createIndex(
      'seats',
      new TableIndex({
        name: 'idx_seats_table_id',
        columnNames: ['table_id'],
      }),
    );

    // Create unique partial index on (table_id, seat_number)
    await queryRunner.createIndex(
      'seats',
      new TableIndex({
        name: 'idx_seats_table_seat_number',
        columnNames: ['table_id', 'seat_number'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop seats table first (depends on tables)
    await queryRunner.dropTable('seats', true, true, true);
    // Drop tables table
    await queryRunner.dropTable('tables', true, true, true);
  }
}
