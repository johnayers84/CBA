import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  testDataSource,
  initializeTestDatabase,
  destroyTestDatabase,
  resetTestDatabase,
  TestEntity,
  TestSoftDeletableEntity,
} from '../setup/database';

describe('Base Entity Configuration', () => {
  beforeAll(async () => {
    await initializeTestDatabase();
  });

  afterAll(async () => {
    await destroyTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('establishes database connection successfully', async () => {
    expect(testDataSource.isInitialized).toBe(true);

    const result = await testDataSource.query('SELECT 1 as value');
    expect(result).toBeDefined();
    expect(result[0].value).toBe(1);
  });

  it('generates UUID for base entity id', async () => {
    const repo = testDataSource.getRepository(TestEntity);
    const entity = await repo.save({ name: 'Test UUID Generation' });

    expect(entity.id).toBeDefined();
    expect(entity.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('filters soft deleted entities by default', async () => {
    const repo = testDataSource.getRepository(TestSoftDeletableEntity);

    const entity = await repo.save({ name: 'Soft Delete Test' });
    expect(entity.deletedAt).toBeNull();

    await repo.softDelete(entity.id);

    const found = await repo.findOne({ where: { id: entity.id } });
    expect(found).toBeNull();

    const withDeleted = await repo.findOne({
      where: { id: entity.id },
      withDeleted: true,
    });
    expect(withDeleted).toBeDefined();
    expect(withDeleted?.deletedAt).toBeInstanceOf(Date);
  });

  it('auto-populates created_at and updated_at timestamps', async () => {
    const repo = testDataSource.getRepository(TestEntity);

    const beforeCreate = new Date();
    const entity = await repo.save({ name: 'Timestamp Test' });
    const afterCreate = new Date();

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
    expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
    expect(entity.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const beforeUpdate = new Date();
    entity.name = 'Updated Name';
    const updated = await repo.save(entity);
    const afterUpdate = new Date();

    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000);
    expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime() + 1000);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(updated.createdAt.getTime());
  });
});
