import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService, type RequestMeta } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from './auth-cookie';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  async signIn(
    @Body() signInDto: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(signInDto, this.meta(req));
    const { refreshToken, ...data } = result.data;

    setRefreshTokenCookie(res, refreshToken);

    return { message: result.message, data };
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshTokenCookie(req);

    if (!refreshToken) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    try {
      const result = await this.authService.refresh(
        refreshToken,
        this.meta(req),
      );
      const { refreshToken: newRefreshToken, ...data } = result.data;

      setRefreshTokenCookie(res, newRefreshToken);

      return { message: result.message, data };
    } catch (error) {
      clearRefreshTokenCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshTokenCookie(req);

    clearRefreshTokenCookie(res);

    if (!refreshToken) {
      return { message: 'Logout successful', data: null };
    }

    return this.authService.logout(refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user (requires a valid access token)' })
  me(@Req() req: Request & { user?: AuthenticatedUser }) {
    return { message: 'Profile retrieved successfully', data: req.user };
  }

  private meta(req: Request): RequestMeta {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
