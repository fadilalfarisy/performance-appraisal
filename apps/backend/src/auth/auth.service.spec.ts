import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';

const REFRESH_TOKEN = 'refresh-token';
const ACCESS_TOKEN = 'new-access-token';
const PASSWORD = 'secret';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const hash = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

describe('AuthService', () => {
  let authRepository: {
    findById: jest.Mock;
    create: jest.Mock;
    revoke: jest.Mock;
  };
  let usersRepository: {
    findById: jest.Mock;
    findByUsernameForAuth: jest.Mock;
    updateLastLogin: jest.Mock;
  };
  let jwtService: {
    verifyAsync: jest.Mock;
    signAsync: jest.Mock;
    decode: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: AuthService;

  const authUser = {
    id: 'user-1',
    username: 'budi',
    password: PASSWORD_HASH,
    role: 'HR',
    isActive: true,
    employee: { employeeNumber: 'E-001' },
  };

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
      findByUsernameForAuth: jest.fn().mockResolvedValue({ ...authUser }),
      updateLastLogin: jest.fn(),
    };
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        jti: storedToken.id,
        sub: storedToken.userId,
        username: 'budi',
        typ: 'refresh',
      }),
      signAsync: jest.fn().mockResolvedValue(ACCESS_TOKEN),
      decode: jest
        .fn()
        .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const configService = {
      get: jest.fn((key: string) =>
        key === 'JWT_SECRET' ? 'access-secret' : undefined,
      ),
    };
    const db = {
      transaction: jest.fn(
        (callback: (tx: string) => Promise<unknown>) => callback('tx'),
      ),
    };
    const requestContext = {
      getUser: jest.fn(() => null),
      getIp: jest.fn(() => '10.0.0.1'),
      getRequestId: jest.fn(() => 'req-1'),
    };

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      authRepository as unknown as AuthRepository,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      db as unknown as DbService,
      audit as unknown as AuditService,
      requestContext as unknown as RequestContextService,
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

  describe('login', () => {
    it('records AUTH_LOGIN in the same transaction as the token write', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce(ACCESS_TOKEN)
        .mockResolvedValueOnce(REFRESH_TOKEN);

      const result = await service.login({
        username: 'budi',
        password: PASSWORD,
      });

      expect(result.data.username).toBe('budi');
      expect(usersRepository.updateLastLogin).toHaveBeenCalledWith(
        'user-1',
        'tx',
      );
      expect(authRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', id: expect.any(String) }),
        'tx',
      );
      expect(audit.record).toHaveBeenCalledWith(
        'tx',
        expect.objectContaining({
          action: 'AUTH_LOGIN',
          entity: 'user',
          entityId: 'user-1',
          userId: 'user-1',
          username: 'budi',
          role: 'HR',
          employeeNumber: 'E-001',
          ipAddress: '10.0.0.1',
          requestId: 'req-1',
        }),
      );
    });

    it('never stores the password or refresh token in the entry', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce(ACCESS_TOKEN)
        .mockResolvedValueOnce(REFRESH_TOKEN);

      await service.login({ username: 'budi', password: PASSWORD });

      const entry = JSON.stringify(audit.record.mock.calls[0][1]);
      expect(entry).not.toContain(PASSWORD);
      expect(entry).not.toContain(REFRESH_TOKEN);
      expect(entry).not.toContain(PASSWORD_HASH);
    });

    it('records AUTH_LOGIN_FAILED for an unknown user and still returns 401', async () => {
      usersRepository.findByUsernameForAuth.mockResolvedValue(null);

      const response = await codesOf(
        service.login({ username: 'nobody', password: 'guess' }),
      );

      expect(response).toMatchObject({
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
      expect(usersRepository.updateLastLogin).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        'tx',
        expect.objectContaining({
          action: 'AUTH_LOGIN_FAILED',
          username: 'nobody',
          userId: null,
        }),
      );
    });

    it('records AUTH_LOGIN_FAILED for a wrong password with the known user id', async () => {
      const response = await codesOf(
        service.login({ username: 'budi', password: 'wrong' }),
      );

      expect(response).toMatchObject({
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
      expect(audit.record).toHaveBeenCalledWith(
        'tx',
        expect.objectContaining({
          action: 'AUTH_LOGIN_FAILED',
          username: 'budi',
          userId: 'user-1',
        }),
      );
    });

    it('records the user id when the account is inactive', async () => {
      usersRepository.findByUsernameForAuth.mockResolvedValue({
        ...authUser,
        isActive: false,
      });

      const response = await codesOf(
        service.login({ username: 'budi', password: PASSWORD }),
      );

      expect(response).toMatchObject({ errorCode: 'AUTH_USER_INACTIVE' });
      expect(audit.record).toHaveBeenCalledWith(
        'tx',
        expect.objectContaining({
          action: 'AUTH_LOGIN_FAILED',
          userId: 'user-1',
          username: 'budi',
        }),
      );
    });

    it('keeps the 401 response when the audit write fails', async () => {
      usersRepository.findByUsernameForAuth.mockResolvedValue(null);
      audit.record.mockRejectedValue(new Error('audit unavailable'));

      const response = await codesOf(
        service.login({ username: 'nobody', password: 'guess' }),
      );

      expect(response).toMatchObject({
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
    });
  });

  describe('logout', () => {
    it('revokes the token and records AUTH_LOGOUT', async () => {
      usersRepository.findById.mockResolvedValue({
        id: 'user-1',
        username: 'budi',
        role: 'HR',
        employee: { employeeNumber: 'E-001' },
      });

      await service.logout(REFRESH_TOKEN);

      expect(authRepository.revoke).toHaveBeenCalledWith('jti-1', 'tx');
      expect(audit.record).toHaveBeenCalledWith(
        'tx',
        expect.objectContaining({
          action: 'AUTH_LOGOUT',
          entityId: 'user-1',
          username: 'budi',
          employeeNumber: 'E-001',
        }),
      );
    });

    it('does not revoke or record for an invalid token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

      await service.logout('not-a-token');

      expect(authRepository.revoke).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('does not audit an already-revoked token twice', async () => {
      authRepository.findById.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
      });

      await service.logout(REFRESH_TOKEN);

      expect(authRepository.revoke).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('still audits when the user row is gone', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await service.logout(REFRESH_TOKEN);

      expect(audit.record).toHaveBeenCalledWith(
        'tx',
        expect.objectContaining({
          action: 'AUTH_LOGOUT',
          userId: 'user-1',
          username: 'budi',
        }),
      );
    });

    it('still reports success when the database write fails', async () => {
      audit.record.mockRejectedValue(new Error('audit unavailable'));

      await expect(service.logout(REFRESH_TOKEN)).resolves.toMatchObject({
        message: 'Logout successful',
      });
    });
  });

  describe('refresh', () => {
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
});
