import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create the criteria table.
 * Criteria represent scoring criteria for an event (e.g., Appearance, Taste, Texture).
 */
export class CreateCriteriaTable1736820000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'criteria',
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
            name: 'weight',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
            default: 1.0,
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
      'criteria',
      new TableForeignKey({
        name: 'fk_criteria_event',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on event_id
    await queryRunner.createIndex(
      'criteria',
      new TableIndex({
        name: 'idx_criteria_event_id',
        columnNames: ['event_id'],
      }),
    );

    // Create unique partial index on (event_id, name)
    await queryRunner.createIndex(
      'criteria',
      new TableIndex({
        name: 'idx_criteria_event_name',
        columnNames: ['event_id', 'name'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('criteria', true, true, true);
  }
}
