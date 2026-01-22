import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create the teams table.
 * Teams represent competing teams registered for an event.
 */
export class CreateTeamsTable1736820000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'teams',
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
            length: '200',
            isNullable: false,
          },
          {
            name: 'team_number',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'barcode_payload',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'code_invalidated_at',
            type: 'timestamptz',
            isNullable: true,
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
      'teams',
      new TableForeignKey({
        name: 'fk_teams_event',
        columnNames: ['event_id'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on event_id
    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'idx_teams_event_id',
        columnNames: ['event_id'],
      }),
    );

    // Create unique partial index on (event_id, team_number)
    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'idx_teams_event_team_number',
        columnNames: ['event_id', 'team_number'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    // Create conditional index on barcode_payload
    // Only indexes active, non-invalidated barcodes
    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'idx_teams_barcode_payload',
        columnNames: ['barcode_payload'],
        where: '"deleted_at" IS NULL AND "code_invalidated_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('teams', true, true, true);
  }
}
