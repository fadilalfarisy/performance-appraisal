import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { SignUpDto } from './dto/signup.dto';
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

  async register(signUp: SignUpDto) {
    if (await this.usersRepository.existsByUsername(signUp.username)) {
      throw new ConflictException({
        message: 'Username already exists',
        errorCode: 'AUTH_USERNAME_ALREADY_EXISTS',
      });
    }

    const hashedPassword = await bcrypt.hash(signUp.password, 10);
    const user = await this.usersRepository.createAndSave({
      username: signUp.username,
      password: hashedPassword,
      fullName: signUp.fullName,
      role: signUp.role,
      employeeId: signUp.employeeId,
    });

    if (!user) {
      throw new ConflictException({
        message: 'User registration failed',
        errorCode: 'AUTH_USER_REGISTRATION_FAILED',
      });
    }

    return {
      message: 'User registered successfully',
      data: { id: user.id, username: signUp.username },
    };
  }

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

  async refresh(refreshToken: string, meta: RequestMeta = {}) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const stored = await this.authRepository.findById(payload.jti);

    if (!stored) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    // Reuse detection: a revoked token presented again means the token leaked.
    if (stored.revokedAt) {
      await this.authRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedException({
        message: 'Refresh token reuse detected',
        errorCode: 'AUTH_REFRESH_REUSE_DETECTED',
      });
    }

    if (
      stored.expiresAt.getTime() < Date.now() ||
      stored.tokenHash !== this.hash(refreshToken)
    ) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    const user = await this.usersRepository.findById(stored.userId);
    const tokens = await this.issueTokens(
      stored.userId,
      user?.username ?? payload.username,
      user?.role ?? null,
      meta,
      stored.id,
    );

    return { message: 'Token refreshed', data: tokens };
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
    replacesId?: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, username, role, typ: 'access' },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
        algorithm: 'HS256',
      },
    );

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

    if (replacesId) {
      await this.authRepository.revoke(replacesId, jti);
    }

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(refreshToken: string) {
    let payload: { jti: string; sub: string; username: string; typ: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    if (payload.typ !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    return payload;
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
