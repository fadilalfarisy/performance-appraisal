import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '@appraisal/types';
import { UsersService } from '../users/users.service';
import { RequestContextService } from '../common/context/request-context.service';

interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string | null;
  typ: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly requestContext: RequestContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid token type. Please login again.');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token. Please login again.');
    }

    const authenticated: AuthenticatedUser = {
      userId: user.id,
      username: user.username,
      employeeId: user.employee?.id ?? null,
      roles: user.role ? [user.role] : [],
    };

    this.requestContext.setUser(authenticated);
    return authenticated;
  }
}
