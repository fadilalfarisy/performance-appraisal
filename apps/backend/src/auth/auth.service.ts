import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UsersRepository,
    private jwtService: JwtService,
  ) { }

  async register(signUp: SignUpDto) {
    const existingUser = await this.userRepository.findOneByUsername(
      signUp.username,
    );
    if (existingUser) {
      throw new ConflictException({
        message: 'Username already exists',
        errorCode: 'AUTH_USERNAME_ALREADY_EXISTS',
      });
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(signUp.password, salt);

    const user = await this.userRepository.createAndSave({
      username: signUp.username,
      password: hashedPassword,
      roleId: signUp.roleId,
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
      data: { id: user.id, username: user.username },
    };
  }

  async login(signIn: SignInDto) {
    const user = await this.userRepository.findOneWithRelationsByUsername(
      signIn.username,
    );

    if (user && (await bcrypt.compare(signIn.password, user.password))) {
      const payload = { username: user.username };
      return {
        message: 'Login successful',
        data: {
          username: user.username,
          role: user.role?.name || null,
          accessToken: this.jwtService.sign(payload),
        },
      };
    } else {
      throw new UnauthorizedException({
        message: 'Please check your login credentials',
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
    }
  }
}
