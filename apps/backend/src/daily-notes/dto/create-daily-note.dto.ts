import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import type { CreateDailyNoteRequest } from '@appraisal/types';

export class CreateDailyNoteDto implements CreateDailyNoteRequest {
  @ApiProperty({ example: 'uuid-employee' })
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  @IsNotEmpty()
  recordDate!: string;

  @ApiProperty({ example: 'Excellent performance in X task' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
