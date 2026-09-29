import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomResponse } from '../utils/response.util';
import { Reflector } from '@nestjs/core';
import { MESSAGE_KEY } from '../decorators/response.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  CustomResponse<T>
> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<CustomResponse<T>> {
    const response = context.switchToHttp().getResponse();

    const statusCode =
      this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler()) ??
      response.statusCode ??
      HttpStatus.OK;

    const message =
      this.reflector.get<string>(MESSAGE_KEY, context.getHandler()) ||
      'Action completed succesfully';

    return next.handle().pipe(
      map((data) => ({
        status: statusCode,
        message: message,
        data: data?.data !== undefined ? data.data : null,
        meta: data?.meta !== undefined ? data.meta : null,
      })),
    );
  }
}
