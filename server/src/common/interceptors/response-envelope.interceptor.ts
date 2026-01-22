import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Pagination metadata for list responses.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Standard success response envelope.
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}

/**
 * Response envelope interceptor that transforms all successful responses
 * into the standard envelope format: { success: true, data: ... }
 *
 * Pagination metadata is included when the response contains pagination info.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in envelope format, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Check if response contains pagination metadata
        if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
          return {
            success: true as const,
            data: data.items,
            meta: data.meta,
          };
        }

        // Standard envelope wrapping
        return {
          success: true as const,
          data,
        };
      }),
    );
  }
}

/**
 * Index export for interceptors module.
 */
export { ResponseEnvelopeInterceptor as default };
