import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create the users table.
 * Users are admin and operator accounts for authenticated access.
 */
export class CreateUsersTable1736820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
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

    // Add CHECK constraint for role values
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT chk_users_role
      CHECK (role IN ('admin', 'operator'))
    `);

    // Create partial unique index on username (only for non-deleted records)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_username',
        columnNames: ['username'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    // Create partial index on role for filtering queries
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_role',
        columnNames: ['role'],
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users', true, true, true);
  }
}
