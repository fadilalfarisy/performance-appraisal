import {
  Controller,
  Post,
  Body,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('/signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.register(signUpDto);
  }

  @Post('/signin')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.login(signInDto);
  }

  @Get('/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (Requires JWT)' })
  getProfile(@Request() req: any) {
    return {
      message: 'Profile retrieved successfully',
      data: req.user,
    };
  }
}
