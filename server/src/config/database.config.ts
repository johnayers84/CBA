import { registerAs } from '@nestjs/config';

/**
 * Database configuration using NestJS ConfigModule.
 * Environment-based settings for PostgreSQL with TypeORM.
 */
export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cba',

  // Entity and migration paths
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],

  // Schema synchronization - use DB_SYNCHRONIZE=true for initial setup
  // Production safety: defaults to false in production unless explicitly enabled
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || process.env.NODE_ENV === 'development',

  // Connection pool settings for optimal performance
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  },

  // Logging configuration
  logging: process.env.DB_LOGGING === 'true',

  // SSL configuration for production
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
}));
