import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { SignInDto } from './dto/signin.dto';
import { DbService } from '../db/db.service';
import type { DbExecutor } from '../db/db.type';
import { AuditService } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { auditActor } from '../common/utils/audit-actor.util';
import type { AuthUser } from './interfaces/auth-user.interface';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
  ) {}

  async login(signIn: SignInDto, meta: RequestMeta = {}) {
    const user = await this.usersRepository.findByUsernameForAuth(
      signIn.username,
    );

    if (!user || !(await bcrypt.compare(signIn.password, user.password))) {
      await this.recordFailedLogin(signIn.username, user?.id ?? null);
      throw new UnauthorizedException({
        message: 'Please check your login credentials',
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      await this.recordFailedLogin(user.username, user.id);
      throw new UnauthorizedException({
        message: 'This account is inactive',
        errorCode: 'AUTH_USER_INACTIVE',
      });
    }

    const tokens = await this.db.transaction(async (tx) => {
      await this.usersRepository.updateLastLogin(user.id, tx);
      const issued = await this.issueTokens(
        user.id,
        user.username,
        user.role,
        meta,
        tx,
      );
      await this.audit.record(tx, {
        action: 'AUTH_LOGIN',
        entity: 'user',
        entityId: user.id,
        ...this.actorFor(user),
      });
      return issued;
    });

    return {
      message: 'Login successful',
      data: {
        username: user.username,
        role: user.role || null,
        ...tokens,
      },
    };
  }

  /**
   * Exchanges a refresh token for a new access token. The refresh token itself
   * is not rotated: it stays valid (and identical) until it expires or is
   * revoked, so concurrent refreshes from one tab or several tabs all succeed
   * instead of invalidating each other.
   */
  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const stored = await this.authRepository.findById(payload.jti);

    // Revoked means revoked: logout, deactivation, and admin actions must not
    // be undone by refreshing.
    if (!stored || stored.revokedAt) {
      throw this.invalidRefreshToken();
    }

    if (
      stored.expiresAt.getTime() < Date.now() ||
      stored.tokenHash !== this.hash(refreshToken)
    ) {
      throw this.invalidRefreshToken();
    }

    const user = await this.usersRepository.findById(stored.userId);
    const accessToken = await this.signAccessToken(
      stored.userId,
      user?.username ?? payload.username,
      user?.role ?? null,
    );

    return { message: 'Token refreshed', data: { accessToken } };
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        jti?: string;
        sub?: string;
        username?: string;
      }>(refreshToken, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
      });

      const jti = payload.jti;
      if (jti) {
        const stored = await this.authRepository.findById(jti);

        // Already revoked means already logged out: do not audit it twice.
        if (!stored?.revokedAt) {
          const user = stored
            ? await this.usersRepository.findById(stored.userId)
            : null;
          const userId = stored?.userId ?? payload.sub ?? null;

          await this.db.transaction(async (tx) => {
            if (stored) {
              await this.authRepository.revoke(jti, tx);
            }
            await this.audit.record(tx, {
              ...auditActor(this.requestContext),
              action: 'AUTH_LOGOUT',
              entity: 'user',
              entityId: userId,
              userId,
              username: user?.username ?? payload.username ?? null,
              role: user?.role ?? null,
              employeeNumber: user?.employee?.employeeNumber ?? null,
            });
          });
        }
      }
    } catch {
      // Logout stays best-effort: it always reports success, as before.
    }

    return { message: 'Logout successful', data: null };
  }

  private async recordFailedLogin(
    username: string,
    userId: string | null,
  ): Promise<void> {
    try {
      await this.db.transaction((tx) =>
        this.audit.record(tx, {
          ...auditActor(this.requestContext),
          action: 'AUTH_LOGIN_FAILED',
          entity: 'user',
          entityId: userId,
          userId,
          username,
        }),
      );
    } catch {
      // Audit must never change the response of a failed login.
    }
  }

  private actorFor(user: AuthUser) {
    return {
      ...auditActor(this.requestContext),
      userId: user.id,
      username: user.username,
      role: user.role ?? null,
      employeeNumber: user.employee?.employeeNumber ?? null,
    };
  }

  private async issueTokens(
    userId: string,
    username: string,
    role: string | null,
    meta: RequestMeta,
    executor: DbExecutor,
  ): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(userId, username, role);

    const jti = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, username, jti, typ: 'refresh' },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
        algorithm: 'HS256',
      },
    );

    const decoded = this.jwtService.decode(refreshToken) as { exp: number };

    await this.authRepository.create(
      {
        id: jti,
        userId,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
      executor,
    );

    return { accessToken, refreshToken };
  }

  private async signAccessToken(
    userId: string,
    username: string,
    role: string | null,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, username, role, typ: 'access' },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
        algorithm: 'HS256',
      },
    );
  }

  private async verifyRefreshToken(refreshToken: string) {
    let payload: { jti: string; sub: string; username: string; typ: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw this.invalidRefreshToken();
    }

    if (payload.typ !== 'refresh' || !payload.jti) {
      throw this.invalidRefreshToken();
    }

    return payload;
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Invalid refresh token',
      errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
    });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private get accessSecret(): string {
    return this.configService.get<string>('JWT_SECRET')!;
  }

  private get refreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? this.accessSecret
    );
  }

  private get accessExpiresIn(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      '15m') as JwtSignOptions['expiresIn'];
  }

  private get refreshExpiresIn(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      '7d') as JwtSignOptions['expiresIn'];
  }
}
