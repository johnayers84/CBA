import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ActorType, AuditAction } from '../../entities/audit-log.entity';
import { Request } from 'express';

/**
 * Metadata key for audit log configuration on controller methods.
 */
export const AUDIT_LOG_KEY = 'auditLog';

/**
 * Configuration options for the @Auditable decorator.
 */
export interface AuditableOptions {
  /**
   * The type of entity being modified.
   * Examples: 'events', 'tables', 'teams', 'submissions'
   */
  entityType: string;

  /**
   * The action being performed.
   * Will be auto-detected from HTTP method if not provided.
   */
  action?: AuditAction;

  /**
   * Function to extract the entity ID from the request.
   * Defaults to looking for 'id' in params.
   */
  getEntityId?: (req: Request) => string | null;

  /**
   * Function to extract the event ID from the request.
   * Used for associating audit logs with events.
   */
  getEventId?: (req: Request, responseData: unknown) => string | null;

  /**
   * Whether to capture the old value before modification.
   * Only applicable for UPDATE and DELETE operations.
   * @default true for UPDATE/DELETE, false for CREATE
   */
  captureOldValue?: boolean;
}

/**
 * Decorator to mark a controller method for audit logging.
 *
 * Usage:
 * @Auditable({ entityType: 'events' })
 * @Post()
 * async create(@Body() dto: CreateEventDto) { ... }
 *
 * @Auditable({ entityType: 'events', action: AuditAction.STATUS_CHANGED })
 * @Patch(':id/status')
 * async updateStatus(@Param('id') id: string) { ... }
 */
export const Auditable = (options: AuditableOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);

/**
 * Interceptor that automatically creates audit log entries for entity changes.
 *
 * This interceptor:
 * 1. Detects the action type from HTTP method (or uses explicit action)
 * 2. Captures request context (IP, user info)
 * 3. After successful response, creates an audit log entry
 *
 * Apply globally or to specific controllers/routes:
 *
 * Global application in module:
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: AuditLogInterceptor,
 *     },
 *   ],
 * })
 *
 * Or per-route:
 * @UseInterceptors(AuditLogInterceptor)
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditableOptions | undefined>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // If no @Auditable decorator, skip audit logging
    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const action = options.action || this.detectAction(request.method);

    // Extract request context
    const actorInfo = this.extractActorInfo(request);
    const ipAddress = this.extractIpAddress(request);
    const entityId = options.getEntityId
      ? options.getEntityId(request)
      : this.extractEntityIdFromRequest(request);

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          // Extract entity ID from response if not available from request
          const finalEntityId = entityId || this.extractEntityIdFromResponse(responseData);

          if (!finalEntityId) {
            // Cannot create audit log without entity ID
            return;
          }

          // Extract event ID
          const eventId = options.getEventId
            ? options.getEventId(request, responseData)
            : this.extractEventIdFromResponse(responseData);

          // Determine old/new values based on action
          const { oldValue, newValue } = this.extractValues(action, request, responseData);

          await this.auditLogsService.createAuditEntry({
            actorType: actorInfo.actorType,
            actorId: actorInfo.actorId,
            action,
            entityType: options.entityType,
            entityId: finalEntityId,
            oldValue,
            newValue,
            eventId,
            ipAddress,
            deviceFingerprint: null,
          });
        } catch (error) {
          // Log error but don't fail the request
          console.error('Failed to create audit log:', error);
        }
      }),
    );
  }

  /**
   * Detect audit action from HTTP method.
   */
  private detectAction(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'POST':
        return AuditAction.CREATED;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATED;
      case 'DELETE':
        return AuditAction.SOFT_DELETED;
      default:
        return AuditAction.UPDATED;
    }
  }

  /**
   * Extract actor information from request.
   * Looks for JWT payload attached by auth guards.
   */
  private extractActorInfo(request: Request): { actorType: ActorType; actorId: string | null } {
    // Check for user JWT (attached by JwtAuthGuard)
    const user = (request as RequestWithUser).user;
    if (user?.sub) {
      return {
        actorType: ActorType.USER,
        actorId: user.sub,
      };
    }

    // Check for seat token (attached by SeatJwtGuard)
    const seat = (request as RequestWithSeat).seat;
    if (seat?.seatNumber !== undefined) {
      return {
        actorType: ActorType.JUDGE,
        actorId: `table:${seat.tableId}:seat:${seat.seatNumber}`,
      };
    }

    // Default to system if no auth context
    return {
      actorType: ActorType.SYSTEM,
      actorId: null,
    };
  }

  /**
   * Extract IP address from request.
   */
  private extractIpAddress(request: Request): string | null {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || null;
  }

  /**
   * Extract entity ID from request params.
   */
  private extractEntityIdFromRequest(request: Request): string | null {
    const params = request.params as Record<string, string>;
    return params.id || params.eventId || params.tableId || params.submissionId || null;
  }

  /**
   * Extract entity ID from response data.
   */
  private extractEntityIdFromResponse(responseData: unknown): string | null {
    if (!responseData || typeof responseData !== 'object') {
      return null;
    }

    const data = responseData as Record<string, unknown>;

    // Check for 'data' wrapper (envelope format)
    if (data.data && typeof data.data === 'object') {
      const innerData = data.data as Record<string, unknown>;
      if (typeof innerData.id === 'string') {
        return innerData.id;
      }
    }

    // Direct response
    if (typeof data.id === 'string') {
      return data.id;
    }

    return null;
  }

  /**
   * Extract event ID from response data.
   */
  private extractEventIdFromResponse(responseData: unknown): string | null {
    if (!responseData || typeof responseData !== 'object') {
      return null;
    }

    const data = responseData as Record<string, unknown>;

    // Check for 'data' wrapper (envelope format)
    if (data.data && typeof data.data === 'object') {
      const innerData = data.data as Record<string, unknown>;
      if (typeof innerData.eventId === 'string') {
        return innerData.eventId;
      }
    }

    // Direct response
    if (typeof data.eventId === 'string') {
      return data.eventId;
    }

    return null;
  }

  /**
   * Extract old/new values based on action type.
   */
  private extractValues(
    action: AuditAction,
    request: Request,
    responseData: unknown,
  ): { oldValue: Record<string, unknown> | null; newValue: Record<string, unknown> | null } {
    const body = request.body as Record<string, unknown>;

    switch (action) {
      case AuditAction.CREATED:
        return {
          oldValue: null,
          newValue: this.sanitizeForAudit(responseData),
        };

      case AuditAction.UPDATED:
      case AuditAction.STATUS_CHANGED:
        // Note: For updates, ideally we'd capture the old value before the change.
        // This requires either:
        // 1. Pre-fetching the entity in a "before" interceptor
        // 2. Having the service pass old value through response
        // For now, we capture the request body as changes made
        return {
          oldValue: null, // Would need pre-fetch to capture
          newValue: this.sanitizeForAudit(body),
        };

      case AuditAction.SOFT_DELETED:
        return {
          oldValue: this.sanitizeForAudit(responseData),
          newValue: null,
        };

      default:
        return {
          oldValue: null,
          newValue: null,
        };
    }
  }

  /**
   * Sanitize data for audit logging.
   * Removes sensitive fields and converts to plain object.
   */
  private sanitizeForAudit(data: unknown): Record<string, unknown> | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    // Fields to exclude from audit logs
    const excludeFields = ['password', 'passwordHash', 'qrToken', 'accessToken'];

    for (const [key, value] of Object.entries(obj)) {
      if (!excludeFields.includes(key)) {
        // Handle nested 'data' from envelope format
        if (key === 'data' && typeof value === 'object' && value !== null) {
          return this.sanitizeForAudit(value);
        }
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }
}

/**
 * Extended request types for auth context.
 */
interface RequestWithUser extends Request {
  user?: {
    sub: string;
    role: string;
  };
}

interface RequestWithSeat extends Request {
  seat?: {
    eventId: string;
    tableId: string;
    seatNumber: number;
  };
}
