import { IsString, MinLength, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiPropertyOptional({ example: 'b91ee242-138b-4174-a95b-07e76ca84966' })
    @IsUUID()
    @IsNotEmpty()
    roleId!: string;

    @ApiPropertyOptional({ example: '991fba1d-2256-40a2-8240-00dc52677c12' })
    @IsUUID()
    @IsNotEmpty()
    employeeId!: string;
}
