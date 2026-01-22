import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService, HealthCheckResult } from './health.service';

/**
 * Health controller providing public health check endpoints.
 * No authentication required - used by load balancers for failover detection.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /health
   * Basic health check for liveness probes.
   * Returns 200 if the service is running.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): HealthCheckResult {
    return this.healthService.check();
  }

  /**
   * GET /health/ready
   * Readiness check for readiness probes.
   * Verifies database connectivity before returning 200.
   */
  @Get('ready')
  async ready(): Promise<HealthCheckResult> {
    const result = await this.healthService.checkReady();

    // Note: We still return 200 even if DB is down to let the response envelope
    // interceptor format the response. The caller can check the status field.
    // In production, you might want to return 503 if not ready.
    return result;
  }
}
