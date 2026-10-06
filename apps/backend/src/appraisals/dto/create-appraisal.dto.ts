import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import type { CreateAppraisalRequest } from '@appraisal/types';

export class CreateAppraisalDto implements CreateAppraisalRequest {
  @ApiProperty({ example: 'department-uuid' })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: '2027-03-01' })
  @IsDateString()
  @IsNotEmpty()
  period!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  employeeIds!: string[];
}
