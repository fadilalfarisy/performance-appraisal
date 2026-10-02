import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateDailyNoteDto {
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
