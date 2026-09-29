import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;
    let errorCode: string | null = null;

    // Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        errorCode = (exceptionResponse as any).errorCode || null;
        // If it's a validation error, 'message' is often an array
        if (Array.isArray((exceptionResponse as any).message)) {
          errors = (exceptionResponse as any).message;
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }
    }
    // Handle Database Errors (Postgres/Drizzle)
    else if (exception.code) {
      errorCode = exception.code;
      switch (exception.code) {
        case '23505': // unique_violation
          status = HttpStatus.CONFLICT;
          message =
            this.extractDatabaseErrorMessage(exception.detail) ||
            'Duplicate entry found';
          break;
        case '23503': // foreign_key_violation
          status = HttpStatus.BAD_REQUEST;
          message = 'Referenced record not found';
          break;
        case '23502': // not_null_violation
          status = HttpStatus.BAD_REQUEST;
          message = `Missing required field: ${exception.column}`;
          break;
        default:
          this.logger.error(
            `Database Error [${exception.code}]: ${exception.message}`,
            exception.stack,
          );
          message = 'Database operation failed';
      }
    }
    // Handle other errors
    else {
      // this.logger.error(
      //   `Unhandled Exception: ${exception.message}`,
      //   exception.stack,
      // );
      this.logger.error(exception);
    }

    response.status(status).json({
      status,
      message,
      errorCode,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  private extractDatabaseErrorMessage(detail: string): string | null {
    if (!detail) return null;
    // Example detail: "Key (email)=(admin@example.com) already exists."
    const match = detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
    if (match && match.length > 2) {
      return `${match[1]} '${match[2]}' already exists`;
    }
    return detail;
  }
}
