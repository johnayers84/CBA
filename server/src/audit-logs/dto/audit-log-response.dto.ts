/**
 * Response DTO for audit log data.
 * Represents an audit log entry returned from the API.
 */
export class AuditLogResponseDto {
  /**
   * Unique identifier of the audit log entry.
   */
  id: string;

  /**
   * Timestamp when the action occurred.
   */
  timestamp: Date;

  /**
   * Type of actor who performed the action.
   * Values: 'user', 'judge', 'system'
   */
  actorType: string;

  /**
   * Identifier of the actor (user ID, seat info, or 'system').
   */
  actorId: string | null;

  /**
   * The action that was performed.
   * Values: 'created', 'updated', 'soft_deleted', 'status_changed'
   */
  action: string;

  /**
   * Type of entity that was affected.
   */
  entityType: string;

  /**
   * UUID of the affected entity.
   */
  entityId: string;

  /**
   * Previous state of the entity (for updates and deletes).
   */
  oldValue: Record<string, unknown> | null;

  /**
   * New state of the entity (for creates and updates).
   */
  newValue: Record<string, unknown> | null;

  /**
   * Event ID this audit log is associated with (if applicable).
   */
  eventId: string | null;

  /**
   * IP address of the client that made the request.
   */
  ipAddress: string | null;

  /**
   * Device fingerprint for the request.
   */
  deviceFingerprint: string | null;
}
