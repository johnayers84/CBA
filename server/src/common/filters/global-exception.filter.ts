import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * Error detail for field-specific validation errors.
 */
export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * Standard error response envelope.
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * Error codes mapping for consistent API error responses.
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_QR_TOKEN: 'INVALID_QR_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Global exception filter that catches all exceptions and formats them
 * into the standard error envelope format.
 *
 * Maps NestJS exceptions to appropriate error codes and ensures
 * no sensitive data is leaked in error responses.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCodes.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';
    let details: ErrorDetail[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle validation errors from class-validator
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;

        if (Array.isArray(responseObj.message)) {
          errorCode = ErrorCodes.VALIDATION_ERROR;
          message = 'Validation failed';
          details = this.formatValidationErrors(responseObj.message);
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }

      // Map HTTP status to error code
      errorCode = this.mapStatusToErrorCode(status, errorCode);
    } else if (exception instanceof Error) {
      // Log unexpected errors but don't expose details to client
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
      );
      message = 'An unexpected error occurred';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
    };

    // Log the error with request context (no sensitive data)
    this.logger.warn(
      `${request.method} ${request.url} - ${status} ${errorCode}: ${message}`,
    );

    response.status(status).json(errorResponse);
  }

  /**
   * Maps HTTP status codes to appropriate error codes.
   */
  private mapStatusToErrorCode(status: number, defaultCode: string): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return defaultCode === ErrorCodes.VALIDATION_ERROR
          ? ErrorCodes.VALIDATION_ERROR
          : ErrorCodes.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCodes.INVALID_STATUS_TRANSITION;
      default:
        return defaultCode;
    }
  }

  /**
   * Formats class-validator error messages into field-specific details.
   */
  private formatValidationErrors(messages: unknown[]): ErrorDetail[] {
    return messages.map((msg) => {
      if (typeof msg === 'string') {
        // Try to extract field name from message format "field constraint"
        const parts = msg.split(' ');
        if (parts.length > 1) {
          return {
            field: parts[0],
            message: msg,
          };
        }
        return { message: msg };
      }
      return { message: String(msg) };
    });
  }
}

export { GlobalExceptionFilter as default };
