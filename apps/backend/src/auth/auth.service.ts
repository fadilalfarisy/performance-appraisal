import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { SignInDto } from './dto/signin.dto';

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
  ) {}

  async login(signIn: SignInDto, meta: RequestMeta = {}) {
    const user = await this.usersRepository.findByUsernameForAuth(
      signIn.username,
    );

    if (!user || !(await bcrypt.compare(signIn.password, user.password))) {
      throw new UnauthorizedException({
        message: 'Please check your login credentials',
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'This account is inactive',
        errorCode: 'AUTH_USER_INACTIVE',
      });
    }

    await this.usersRepository.updateLastLogin(user.id);

    const tokens = await this.issueTokens(
      user.id,
      user.username,
      user.role,
      meta,
    );

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
      }>(refreshToken, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
      });
      if (payload.jti) {
        await this.authRepository.revoke(payload.jti);
      }
    } catch {
      // An invalid or expired token is already effectively logged out.
    }
    return { message: 'Logout successful', data: null };
  }

  private async issueTokens(
    userId: string,
    username: string,
    role: string | null,
    meta: RequestMeta,
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

    await this.authRepository.create({
      id: jti,
      userId,
      tokenHash: this.hash(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    });

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
