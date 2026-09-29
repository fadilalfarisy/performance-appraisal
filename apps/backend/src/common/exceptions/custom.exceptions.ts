import { HttpException, HttpStatus } from '@nestjs/common';

export class DatabaseException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR, errorCode?: string) {
    super({ message, errorCode }, statusCode);
  }
}

export class ValidationException extends HttpException {
  constructor(errors: string[], errorCode: string = 'VALIDATION_ERROR') {
    super({ message: 'Validation failed', errors, errorCode }, HttpStatus.BAD_REQUEST);
  }
}

export class BusinessLogicException extends HttpException {
  constructor(message: string, errorCode?: string) {
    super({ message, errorCode }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
