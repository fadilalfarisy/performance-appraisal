// employees/dto/create-employee.dto.ts
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { EmployeeStatus } from '../interfaces/employee.interface';
import { randomUUID } from 'crypto';
import { GenderEnum } from '../enums/gender.enum';
import { CreateContractDto } from './create-contract.dto';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'GM0001', maxLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  @Transform(({ value }) => value?.trim())
  nip!: string;

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

  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  @IsNotEmpty()
  positionId!: string;

  @ApiProperty({ example: randomUUID(), required: false })
  @IsUUID()
  @IsNotEmpty()
  managerId!: string;

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

  @ApiProperty({ type: [CreateContractDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractDto)
  contracts!: [CreateContractDto];
}
