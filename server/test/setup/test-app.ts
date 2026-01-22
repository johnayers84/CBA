/**
 * Test application helper for integration tests.
 * Provides utilities to bootstrap a full NestJS application with test database.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';
import { entities } from '../../src/entities';

/**
 * Test application context containing the app instance and data source.
 */
export interface TestAppContext {
  /**
   * The NestJS application instance.
   */
  app: INestApplication;

  /**
   * The TypeORM DataSource for direct database access.
   */
  dataSource: DataSource;

  /**
   * The NestJS testing module.
   */
  module: TestingModule;
}

/**
 * Configuration options for creating a test application.
 */
export interface TestAppOptions {
  /**
   * Additional modules to import.
   */
  imports?: any[];

  /**
   * Additional providers to register.
   */
  providers?: any[];

  /**
   * Additional controllers to register.
   */
  controllers?: any[];
}

/**
 * Create a test application with full NestJS context and test database.
 *
 * Usage:
 * ```typescript
 * const ctx = await createTestApp({ imports: [AuditLogsModule] });
 * // ... run tests ...
 * await destroyTestApp(ctx);
 * ```
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<TestAppContext> {
  const testDatabaseConfig = {
    type: 'postgres' as const,
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_NAME || 'cba_test',
    entities,
    synchronize: true,
    dropSchema: true,
    logging: process.env.TEST_DB_LOGGING === 'true',
  };

  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
      }),
      TypeOrmModule.forRoot(testDatabaseConfig),
      TypeOrmModule.forFeature(entities),
      ...(options.imports || []),
    ],
    providers: options.providers || [],
    controllers: options.controllers || [],
  });

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();

  // Configure global pipes, interceptors, filters as needed
  // app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.init();

  const dataSource = module.get(DataSource);

  return { app, dataSource, module };
}

/**
 * Destroy the test application and clean up resources.
 */
export async function destroyTestApp(ctx: TestAppContext): Promise<void> {
  if (ctx.app) {
    await ctx.app.close();
  }
}

/**
 * Reset the test database by dropping and recreating all tables.
 * Call this in beforeEach to ensure test isolation.
 */
export async function resetTestAppDatabase(ctx: TestAppContext): Promise<void> {
  if (ctx.dataSource?.isInitialized) {
    await ctx.dataSource.synchronize(true);
  }
}

/**
 * Get a repository for the specified entity from the test application context.
 */
export function getRepository<T extends ObjectLiteral>(ctx: TestAppContext, entity: new () => T): Repository<T> {
  return ctx.dataSource.getRepository(entity);
}

/**
 * Helper to make HTTP requests to the test application.
 * Returns a supertest-like interface.
 */
export function getTestRequest(ctx: TestAppContext): {
  get: (url: string) => Promise<TestResponse>;
  post: (url: string, body?: unknown) => Promise<TestResponse>;
  patch: (url: string, body?: unknown) => Promise<TestResponse>;
  delete: (url: string) => Promise<TestResponse>;
} {
  const httpServer = ctx.app.getHttpServer();

  // Note: This is a simplified implementation.
  // For full functionality, consider using @nestjs/testing with supertest.
  return {
    async get(url: string): Promise<TestResponse> {
      return makeRequest(httpServer, 'GET', url);
    },
    async post(url: string, body?: unknown): Promise<TestResponse> {
      return makeRequest(httpServer, 'POST', url, body);
    },
    async patch(url: string, body?: unknown): Promise<TestResponse> {
      return makeRequest(httpServer, 'PATCH', url, body);
    },
    async delete(url: string): Promise<TestResponse> {
      return makeRequest(httpServer, 'DELETE', url);
    },
  };
}

/**
 * Test response interface.
 */
export interface TestResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Make an HTTP request to the test server.
 */
async function makeRequest(
  server: unknown,
  method: string,
  url: string,
  body?: unknown,
): Promise<TestResponse> {
  // This is a placeholder implementation.
  // In practice, you would use supertest or a similar library.
  // For now, we return a mock response structure.
  return {
    status: 200,
    body: {},
    headers: {},
  };
}

/**
 * Authentication helper to generate test JWT tokens.
 */
export interface TestAuthHelper {
  /**
   * Generate a user JWT token for testing.
   */
  generateUserToken(userId: string, role: 'admin' | 'operator'): string;

  /**
   * Generate a seat JWT token for testing.
   */
  generateSeatToken(eventId: string, tableId: string, seatNumber: number): string;
}

/**
 * Create an authentication helper for the test application.
 * Note: This requires the auth module to be properly configured.
 */
export function createTestAuthHelper(): TestAuthHelper {
  // Placeholder implementation - actual implementation depends on auth module
  return {
    generateUserToken(userId: string, role: 'admin' | 'operator'): string {
      // In practice, this would use JWT signing
      return `test-user-token-${userId}-${role}`;
    },
    generateSeatToken(eventId: string, tableId: string, seatNumber: number): string {
      // In practice, this would use JWT signing
      return `test-seat-token-${eventId}-${tableId}-${seatNumber}`;
    },
  };
}

/**
 * Convenience function to create a complete test setup with factories.
 */
export async function createFullTestSetup(options: TestAppOptions = {}): Promise<{
  ctx: TestAppContext;
  auth: TestAuthHelper;
}> {
  const ctx = await createTestApp(options);
  const auth = createTestAuthHelper();
  return { ctx, auth };
}
