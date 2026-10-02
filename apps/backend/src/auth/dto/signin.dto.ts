import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { SignInRequest } from '@appraisal/types';

export class SignInDto implements SignInRequest {
    @ApiProperty({ example: 'user-new' })
    @IsString()
    @IsNotEmpty()
    username!: string;

    @ApiProperty({ example: 'newsecurepassword', minLength: 6 })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password!: string;
}
