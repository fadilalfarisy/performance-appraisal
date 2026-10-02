import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { AuthenticatedUser } from '@appraisal/types';

const USER_KEY = 'user';
const IP_KEY = 'ip';

/** Reads and writes request-scoped data (current user, IP, request id). */
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  setUser(user: AuthenticatedUser): void {
    this.cls.set(USER_KEY, user);
  }

  getUser(): AuthenticatedUser | undefined {
    return this.cls.get(USER_KEY);
  }

  getIp(): string | undefined {
    return this.cls.get(IP_KEY);
  }

  getRequestId(): string | undefined {
    return this.cls.getId() || undefined;
  }
}
