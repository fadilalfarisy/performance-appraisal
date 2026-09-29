import {
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ContractStatus } from '../enum/contract.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContractDto {
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
