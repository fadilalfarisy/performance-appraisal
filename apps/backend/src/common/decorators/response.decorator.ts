import {
  HttpCode,
  HttpStatus,
  applyDecorators,
  SetMetadata,
} from '@nestjs/common';

export const MESSAGE_KEY = 'response_message';

export const ResponseMessage = (message: string) =>
  SetMetadata(MESSAGE_KEY, message);

export function ApiSuccess(message: string, status = HttpStatus.OK) {
  return applyDecorators(HttpCode(status), SetMetadata(MESSAGE_KEY, message));
}
