import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ContractStatus, ContractType } from '@appraisal/types';
import type { CreateContractRequest } from '@appraisal/types';

export class CreateContractDto implements CreateContractRequest {
  @ApiProperty({ example: 'employee-uuid' })
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ enum: ContractType, example: ContractType.PERMANENT })
  @IsEnum(ContractType)
  @IsNotEmpty()
  contractType!: ContractType;

  @ApiProperty({ example: '2023-01-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiPropertyOptional({ example: '2023-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
