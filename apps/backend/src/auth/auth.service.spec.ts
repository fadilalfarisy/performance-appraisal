import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';

const REFRESH_TOKEN = 'refresh-token';
const ACCESS_TOKEN = 'new-access-token';

const hash = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

describe('AuthService.refresh', () => {
  let authRepository: {
    findById: jest.Mock;
    create: jest.Mock;
    revoke: jest.Mock;
  };
  let usersRepository: { findById: jest.Mock };
  let jwtService: {
    verifyAsync: jest.Mock;
    signAsync: jest.Mock;
    decode: jest.Mock;
  };
  let service: AuthService;

  const storedToken = {
    id: 'jti-1',
    userId: 'user-1',
    tokenHash: hash(REFRESH_TOKEN),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null as Date | null,
  };

  beforeEach(() => {
    authRepository = {
      findById: jest.fn().mockResolvedValue({ ...storedToken }),
      create: jest.fn(),
      revoke: jest.fn(),
    };
    usersRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ username: 'budi', role: 'HR', isActive: true }),
    };
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        jti: storedToken.id,
        sub: storedToken.userId,
        username: 'budi',
        typ: 'refresh',
      }),
      signAsync: jest.fn().mockResolvedValue(ACCESS_TOKEN),
      decode: jest.fn(),
    };

    const configService = {
      get: jest.fn((key: string) =>
        key === 'JWT_SECRET' ? 'access-secret' : undefined,
      ),
    };

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      authRepository as unknown as AuthRepository,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  const codesOf = async (
    promise: Promise<unknown>,
  ): Promise<Record<string, unknown>> => {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      return (error as UnauthorizedException).getResponse() as Record<
        string,
        unknown
      >;
    }
    throw new Error('Expected the promise to reject');
  };

  it('issues only a new access token and does not rotate the refresh token', async () => {
    const result = await service.refresh(REFRESH_TOKEN);

    expect(result.data).toEqual({ accessToken: ACCESS_TOKEN });
    expect(authRepository.create).not.toHaveBeenCalled();
    expect(authRepository.revoke).not.toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
  });

  it('lets concurrent refreshes of the same token both succeed', async () => {
    const results = await Promise.all([
      service.refresh(REFRESH_TOKEN),
      service.refresh(REFRESH_TOKEN),
    ]);

    expect(results.map((result) => result.data.accessToken)).toEqual([
      ACCESS_TOKEN,
      ACCESS_TOKEN,
    ]);
    expect(authRepository.revoke).not.toHaveBeenCalled();
  });

  it('rejects a revoked token without touching the stored session', async () => {
    authRepository.findById.mockResolvedValue({
      ...storedToken,
      revokedAt: new Date(),
    });

    const response = await codesOf(service.refresh(REFRESH_TOKEN));

    expect(response).toMatchObject({
      errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
    });
    expect(authRepository.revoke).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    authRepository.findById.mockResolvedValue({
      ...storedToken,
      expiresAt: new Date(Date.now() - 1_000),
    });

    const response = await codesOf(service.refresh(REFRESH_TOKEN));

    expect(response).toMatchObject({
      errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects a token whose stored hash does not match', async () => {
    authRepository.findById.mockResolvedValue({
      ...storedToken,
      tokenHash: hash('a-different-token'),
    });

    const response = await codesOf(service.refresh(REFRESH_TOKEN));

    expect(response).toMatchObject({
      errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects a token whose jti is not stored', async () => {
    authRepository.findById.mockResolvedValue(null);

    const response = await codesOf(service.refresh(REFRESH_TOKEN));

    expect(response).toMatchObject({
      errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects a token that is not a refresh JWT', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      jti: storedToken.id,
      sub: storedToken.userId,
      username: 'budi',
      typ: 'access',
    });

    const response = await codesOf(service.refresh(REFRESH_TOKEN));

    expect(response).toMatchObject({
      errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
    });
    expect(authRepository.findById).not.toHaveBeenCalled();
  });
});
