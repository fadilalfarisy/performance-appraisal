import { IsString, MinLength, IsUUID, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';
import type { SignUpRequest } from '@appraisal/types';

export class SignUpDto implements SignUpRequest {
    @ApiPropertyOptional({ example: 'user-new' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    username!: string;

    @ApiPropertyOptional({ example: 'newsecurepassword', minLength: 6 })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password!: string;

    @ApiPropertyOptional({ example: 'Jane Doe' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    fullName!: string;

    @ApiProperty({ enum: UserRole, example: UserRole.SUPERVISOR })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role!: UserRole;

    @ApiPropertyOptional({ example: '991fba1d-2256-40a2-8240-00dc52677c12' })
    @IsUUID()
    @IsNotEmpty()
    employeeId!: string;
}
