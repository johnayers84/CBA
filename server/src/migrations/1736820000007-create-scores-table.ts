import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create the scores table.
 * Scores represent individual judge evaluations for submission criteria.
 * One score per judge (seat) per criterion per submission is enforced via unique constraint.
 * Note: Scores do NOT have soft delete (no deleted_at column).
 */
export class CreateScoresTable1736820000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'scores',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'submission_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'seat_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'criterion_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'score_value',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'phase',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'submitted_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
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
        ],
      }),
      true,
    );

    // Add CHECK constraint for phase values
    await queryRunner.query(`
      ALTER TABLE "scores"
      ADD CONSTRAINT "chk_scores_phase"
      CHECK ("phase" IN ('appearance', 'taste_texture'))
    `);

    // Create foreign key to submissions
    await queryRunner.createForeignKey(
      'scores',
      new TableForeignKey({
        name: 'fk_scores_submission',
        columnNames: ['submission_id'],
        referencedTableName: 'submissions',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create foreign key to seats
    await queryRunner.createForeignKey(
      'scores',
      new TableForeignKey({
        name: 'fk_scores_seat',
        columnNames: ['seat_id'],
        referencedTableName: 'seats',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create foreign key to criteria
    await queryRunner.createForeignKey(
      'scores',
      new TableForeignKey({
        name: 'fk_scores_criterion',
        columnNames: ['criterion_id'],
        referencedTableName: 'criteria',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on submission_id
    await queryRunner.createIndex(
      'scores',
      new TableIndex({
        name: 'idx_scores_submission_id',
        columnNames: ['submission_id'],
      }),
    );

    // Create index on seat_id
    await queryRunner.createIndex(
      'scores',
      new TableIndex({
        name: 'idx_scores_seat_id',
        columnNames: ['seat_id'],
      }),
    );

    // Create index on criterion_id
    await queryRunner.createIndex(
      'scores',
      new TableIndex({
        name: 'idx_scores_criterion_id',
        columnNames: ['criterion_id'],
      }),
    );

    // Create composite index for score lookups by submission and seat
    await queryRunner.createIndex(
      'scores',
      new TableIndex({
        name: 'idx_scores_submission_seat',
        columnNames: ['submission_id', 'seat_id'],
      }),
    );

    // Create unique constraint: one score per judge per criterion per submission
    await queryRunner.createIndex(
      'scores',
      new TableIndex({
        name: 'idx_scores_submission_seat_criterion',
        columnNames: ['submission_id', 'seat_id', 'criterion_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('scores', true, true, true);
  }
}
