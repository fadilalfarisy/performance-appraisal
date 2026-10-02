import {
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ContractStatus } from '../enums/contract.enum';
import { ApiProperty } from '@nestjs/swagger';
import type { CreateContractRequest } from '@appraisal/types';

export class CreateContractDto implements CreateContractRequest {
  @ApiProperty({ example: ContractStatus.CONTRACT })
  @IsEnum(ContractStatus)
  @IsNotEmpty()
  status!: ContractStatus;

  @ApiProperty({ example: '2023-01-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2023-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
