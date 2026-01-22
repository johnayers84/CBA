import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AuditLog, ActorType, AuditAction } from '../entities/audit-log.entity';
import {
  AuditLogQueryDto,
  PaginatedAuditLogResponse,
  PaginationMeta,
} from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

/**
 * Service for read-only audit log operations.
 * The audit log is append-only; no create/update/delete operations are exposed via API.
 * Audit entries are created automatically by the AuditLogInterceptor.
 */
@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Find all audit logs with optional filtering and pagination.
   * This endpoint is restricted to ADMIN users only.
   */
  async findAll(query: AuditLogQueryDto): Promise<PaginatedAuditLogResponse> {
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where = this.buildWhereClause(query);

    const [data, totalItems] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip,
      take: pageSize,
    });

    const meta: PaginationMeta = {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };

    return {
      data: data.map((log) => this.toResponseDto(log)),
      meta,
    };
  }

  /**
   * Find audit logs for a specific event.
   * This endpoint is accessible to any authenticated user.
   */
  async findByEventId(
    eventId: string,
    query: AuditLogQueryDto,
  ): Promise<PaginatedAuditLogResponse> {
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: FindOptionsWhere<AuditLog> = {
      eventId,
      ...this.buildWhereClause(query),
    };

    const [data, totalItems] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip,
      take: pageSize,
    });

    const meta: PaginationMeta = {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };

    return {
      data: data.map((log) => this.toResponseDto(log)),
      meta,
    };
  }

  /**
   * Find a single audit log by ID.
   */
  async findOne(id: string): Promise<AuditLogResponseDto | null> {
    const log = await this.auditLogRepository.findOne({ where: { id } });
    return log ? this.toResponseDto(log) : null;
  }

  /**
   * Build TypeORM where clause from query parameters.
   */
  private buildWhereClause(query: AuditLogQueryDto): FindOptionsWhere<AuditLog> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (query.action) {
      where.action = query.action as AuditAction;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.actorType) {
      where.actorType = query.actorType as ActorType;
    }

    if (query.startDate && query.endDate) {
      where.timestamp = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.timestamp = MoreThanOrEqual(new Date(query.startDate));
    } else if (query.endDate) {
      where.timestamp = LessThanOrEqual(new Date(query.endDate));
    }

    return where;
  }

  /**
   * Convert AuditLog entity to response DTO.
   */
  private toResponseDto(log: AuditLog): AuditLogResponseDto {
    return {
      id: log.id,
      timestamp: log.timestamp,
      actorType: log.actorType,
      actorId: log.actorId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      eventId: log.eventId,
      ipAddress: log.ipAddress,
      deviceFingerprint: log.deviceFingerprint,
    };
  }

  /**
   * Internal method to create an audit log entry.
   * Used by the AuditLogInterceptor - not exposed via API.
   */
  async createAuditEntry(data: {
    actorType: ActorType;
    actorId: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    eventId?: string | null;
    ipAddress?: string | null;
    deviceFingerprint?: string | null;
    idempotencyKey?: string | null;
  }): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      actorType: data.actorType,
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue ?? null,
      eventId: data.eventId ?? null,
      ipAddress: data.ipAddress ?? null,
      deviceFingerprint: data.deviceFingerprint ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
    });

    return this.auditLogRepository.save(auditLog);
  }
}
