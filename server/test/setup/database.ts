import { DataSource, EntityTarget, ObjectLiteral, Repository, Entity, Column } from 'typeorm';
import { BaseEntity, SoftDeletableEntity } from '../../src/entities/base.entity';

/**
 * Test entity class extending BaseEntity for testing base behaviors.
 * This is used only in tests to verify base entity functionality.
 */
@Entity('test_entities')
export class TestEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;
}

@Entity('test_soft_deletable_entities')
export class TestSoftDeletableEntity extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;
}

/**
 * Test-specific DataSource configuration.
 * Uses synchronize: true and dropSchema: true for test isolation.
 */
export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  username: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'cba_test',
  entities: [TestEntity, TestSoftDeletableEntity],
  synchronize: true,
  dropSchema: true,
  logging: process.env.TEST_DB_LOGGING === 'true',
});

/**
 * Initialize the test database connection.
 * Should be called in beforeAll hooks.
 */
export async function initializeTestDatabase(): Promise<DataSource> {
  if (!testDataSource.isInitialized) {
    try {
      await testDataSource.initialize();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ECONNREFUSED')) {
        throw new Error(
          'Database connection refused. Ensure PostgreSQL is running.\n' +
            'Run: docker-compose up -d postgres-test\n' +
            `Connection details: ${process.env.TEST_DB_HOST || 'localhost'}:${process.env.TEST_DB_PORT || '5432'}`,
        );
      }
      throw error;
    }
  }
  return testDataSource;
}

/**
 * Destroy the test database connection.
 * Should be called in afterAll hooks.
 */
export async function destroyTestDatabase(): Promise<void> {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
}

/**
 * Reset the test database by synchronizing schema.
 * Should be called in beforeEach hooks for test isolation.
 */
export async function resetTestDatabase(): Promise<void> {
  if (testDataSource.isInitialized) {
    await testDataSource.synchronize(true);
  }
}

/**
 * Get a repository for the specified entity from the test DataSource.
 */
export function getTestRepository<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
): Repository<T> {
  return testDataSource.getRepository(entity);
}
