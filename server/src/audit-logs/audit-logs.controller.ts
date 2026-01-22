import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto, PaginatedAuditLogResponse } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

/**
 * Controller for audit log endpoints.
 * Provides read-only access to audit logs.
 *
 * Authorization notes (to be enforced when auth guards are available):
 * - GET /audit-logs - ADMIN only
 * - GET /events/:eventId/audit-logs - Any authenticated user
 * - GET /audit-logs/:id - Any authenticated user
 *
 * No POST/PATCH/DELETE endpoints - audit logs are created automatically
 * by the AuditLogInterceptor and are immutable.
 */
@Controller()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * List all audit logs.
   * Restricted to ADMIN users only.
   *
   * @route GET /audit-logs
   * @param query - Filtering and pagination options
   */
  // TODO: Add @UseGuards(JwtAuthGuard, RolesGuard) and @Roles('admin') when auth module is ready
  @Get('audit-logs')
  async findAll(@Query() query: AuditLogQueryDto): Promise<PaginatedAuditLogResponse> {
    return this.auditLogsService.findAll(this.parseQueryParams(query));
  }

  /**
   * List audit logs for a specific event.
   * Accessible to any authenticated user.
   *
   * @route GET /events/:eventId/audit-logs
   * @param eventId - UUID of the event
   * @param query - Filtering and pagination options
   */
  // TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
  @Get('events/:eventId/audit-logs')
  async findByEventId(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedAuditLogResponse> {
    return this.auditLogsService.findByEventId(eventId, this.parseQueryParams(query));
  }

  /**
   * Get a single audit log by ID.
   * Accessible to any authenticated user.
   *
   * @route GET /audit-logs/:id
   * @param id - UUID of the audit log
   */
  // TODO: Add @UseGuards(JwtAuthGuard) when auth module is ready
  @Get('audit-logs/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLogResponseDto> {
    const auditLog = await this.auditLogsService.findOne(id);
    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
    return auditLog;
  }

  /**
   * Parse and validate query parameters.
   * Ensures numeric values are properly converted.
   */
  private parseQueryParams(query: AuditLogQueryDto): AuditLogQueryDto {
    return {
      ...query,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Math.min(Number(query.pageSize), 100) : 20,
    };
  }
}
