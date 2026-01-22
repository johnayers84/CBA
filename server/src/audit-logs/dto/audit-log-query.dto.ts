/**
 * Query DTO for filtering and paginating audit log requests.
 * Used as query parameters for list endpoints.
 */
export class AuditLogQueryDto {
  /**
   * Page number for pagination (1-indexed).
   * @default 1
   */
  page?: number;

  /**
   * Number of items per page.
   * @default 20
   * @minimum 1
   * @maximum 100
   */
  pageSize?: number;

  /**
   * Filter by action type.
   * Values: 'created', 'updated', 'soft_deleted', 'status_changed'
   */
  action?: string;

  /**
   * Filter by entity type.
   * Examples: 'events', 'tables', 'teams', 'submissions'
   */
  entityType?: string;

  /**
   * Filter by actor type.
   * Values: 'user', 'judge', 'system'
   */
  actorType?: string;

  /**
   * Filter by start date (inclusive).
   * ISO 8601 format.
   */
  startDate?: string;

  /**
   * Filter by end date (inclusive).
   * ISO 8601 format.
   */
  endDate?: string;
}

/**
 * Pagination metadata for paginated responses.
 */
export class PaginationMeta {
  /**
   * Current page number.
   */
  page: number;

  /**
   * Number of items per page.
   */
  pageSize: number;

  /**
   * Total number of items across all pages.
   */
  totalItems: number;

  /**
   * Total number of pages.
   */
  totalPages: number;
}

/**
 * Paginated response wrapper for audit logs.
 */
export class PaginatedAuditLogResponse {
  /**
   * Array of audit log entries for the current page.
   */
  data: import('./audit-log-response.dto').AuditLogResponseDto[];

  /**
   * Pagination metadata.
   */
  meta: PaginationMeta;
}
