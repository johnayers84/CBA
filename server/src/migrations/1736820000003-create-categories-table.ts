import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create the categories table.
 * Categories represent competition categories within an event (e.g., Brisket, Ribs).
 */
export class CreateCategoriesTable1736820000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categories',
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
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'integer',
            isNullable: false,
            default: 0,
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
      'categories',
      new TableForeignKey({
        name: 'fk_categories_event',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on event_id
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'idx_categories_event_id',
        columnNames: ['event_id'],
      }),
    );

    // Create unique partial index on (event_id, name)
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'idx_categories_event_name',
        columnNames: ['event_id', 'name'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('categories', true, true, true);
  }
}
