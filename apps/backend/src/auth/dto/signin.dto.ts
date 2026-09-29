import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
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
