import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { randomUUID } from 'crypto';
import type { CreateEmployeeRequest } from '@appraisal/types';
import { EmployeeStatus } from '../interfaces/employee.interface';
import { GenderEnum } from '../enums/gender.enum';

export class CreateEmployeeDto implements CreateEmployeeRequest {
  @ApiProperty({ example: 'EMP0001', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  employeeNumber!: string;

  @ApiProperty({ example: 'John Doe', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  fullName!: string;

  @ApiProperty({ example: GenderEnum.MALE, enum: GenderEnum })
  @IsEnum(GenderEnum)
  @IsNotEmpty()
  gender!: GenderEnum;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  @IsNotEmpty()
  birthDate!: string;

  @ApiProperty({ example: '2023-01-01' })
  @IsDateString()
  @IsNotEmpty()
  joinDate!: string;

  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  @IsNotEmpty()
  positionId!: string;

  @ApiPropertyOptional({ example: randomUUID() })
  @IsOptional()
  @IsUUID()
  superiorId?: string;

  @ApiProperty({
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status: EmployeeStatus = EmployeeStatus.ACTIVE;

  @ApiProperty({ example: 'West Jakarta' })
  @IsString()
  @IsNotEmpty()
  address!: string;
}
