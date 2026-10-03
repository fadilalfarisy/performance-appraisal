import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

const DEFAULT_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, code, message, details } = this.resolve(exception);

    response.status(status).json({ statusCode: status, code, message, details });
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let message = exception.message;
      let code: string | undefined;
      let details: unknown = {};

      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        if (Array.isArray(record.message)) {
          details = { errors: record.message };
          message = 'Validation failed';
        } else if (typeof record.message === 'string') {
          message = record.message;
        }
        if (typeof record.errorCode === 'string') {
          code = record.errorCode;
        }
      }

      return {
        status,
        code: code ?? DEFAULT_CODES[status] ?? 'ERROR',
        message,
        details,
      };
    }

    const dbError = exception as { code?: string; detail?: string; column?: string };
    if (dbError?.code) {
      switch (dbError.code) {
        case '23505':
          return {
            status: HttpStatus.CONFLICT,
            code: 'UNIQUE_VIOLATION',
            message:
              this.extractDatabaseErrorMessage(dbError.detail) ??
              'Duplicate entry found',
            details: {},
          };
        case '23503':
          return {
            status: HttpStatus.BAD_REQUEST,
            code: 'FOREIGN_KEY_VIOLATION',
            message: 'Referenced record not found',
            details: {},
          };
        case '23502':
          return {
            status: HttpStatus.BAD_REQUEST,
            code: 'NOT_NULL_VIOLATION',
            message: `Missing required field: ${dbError.column ?? 'unknown'}`,
            details: {},
          };
        case '23P01': // exclusion_violation (overlapping active contracts)
          return {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            code: 'CONTRACT_OVERLAP',
            message:
              'This contract overlaps another active contract for the employee',
            details: {},
          };
        default:
          this.logger.error(`Database error [${dbError.code}]`, exception as Error);
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: {},
          };
      }
    }

    this.logger.error(exception as Error);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: {},
    };
  }

  private extractDatabaseErrorMessage(detail?: string): string | null {
    if (!detail) return null;
    const match = detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
    if (match && match.length > 2) {
      return `${match[1]} '${match[2]}' already exists`;
    }
    return detail;
  }
}
