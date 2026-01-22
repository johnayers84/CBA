import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Health check response structure.
 */
export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  database?: 'connected' | 'disconnected';
  error?: string;
}

/**
 * Health service providing health check functionality for load balancer integration.
 * Supports basic liveness checks and readiness checks with database connectivity verification.
 */
@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Basic health check - indicates the service is running.
   * Used for liveness probes.
   */
  check(): HealthCheckResult {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness check - verifies the service can handle requests.
   * Checks database connectivity.
   */
  async checkReady(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    };

    try {
      // Verify database connection with a simple query
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        result.database = 'connected';
      } else {
        result.status = 'error';
        result.error = 'Database not initialized';
      }
    } catch (error) {
      result.status = 'error';
      result.database = 'disconnected';
      result.error = 'Database connection failed';
    }

    return result;
  }
}
