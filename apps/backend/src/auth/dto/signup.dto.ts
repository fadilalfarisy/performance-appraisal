import { IsString, MinLength, IsUUID, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

export class SignUpDto {
    @ApiPropertyOptional({ example: 'user-new' })
    @IsString()
    @IsNotEmpty()
    username!: string;

    @ApiPropertyOptional({ example: 'newsecurepassword', minLength: 6 })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password!: string;

    @ApiProperty({ enum: UserRole, example: UserRole.SUPERVISOR })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role!: UserRole;

    @ApiPropertyOptional({ example: '991fba1d-2256-40a2-8240-00dc52677c12' })
    @IsUUID()
    @IsNotEmpty()
    employeeId!: string;
}
