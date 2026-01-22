import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create the submissions table.
 * Submissions represent team entries for each category.
 * One submission per team per category is enforced via unique constraint.
 */
export class CreateSubmissionsTable1736820000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'submissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'team_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'turned_in_at',
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

    // Add CHECK constraint for status values
    await queryRunner.query(`
      ALTER TABLE "submissions"
      ADD CONSTRAINT "chk_submissions_status"
      CHECK ("status" IN ('pending', 'turned_in', 'being_judged', 'scored', 'finalized'))
    `);

    // Create foreign key to teams
    await queryRunner.createForeignKey(
      'submissions',
      new TableForeignKey({
        name: 'fk_submissions_team',
        columnNames: ['team_id'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create foreign key to categories
    await queryRunner.createForeignKey(
      'submissions',
      new TableForeignKey({
        name: 'fk_submissions_category',
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on team_id
    await queryRunner.createIndex(
      'submissions',
      new TableIndex({
        name: 'idx_submissions_team_id',
        columnNames: ['team_id'],
      }),
    );

    // Create index on category_id
    await queryRunner.createIndex(
      'submissions',
      new TableIndex({
        name: 'idx_submissions_category_id',
        columnNames: ['category_id'],
      }),
    );

    // Create unique partial index on (team_id, category_id)
    // One submission per team per category (for non-deleted records)
    await queryRunner.createIndex(
      'submissions',
      new TableIndex({
        name: 'idx_submissions_team_category',
        columnNames: ['team_id', 'category_id'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    // Create composite index for dashboard queries (category + status)
    await queryRunner.createIndex(
      'submissions',
      new TableIndex({
        name: 'idx_submissions_category_status',
        columnNames: ['category_id', 'status'],
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('submissions', true, true, true);
  }
}
