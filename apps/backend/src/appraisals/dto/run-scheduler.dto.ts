import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class RunSchedulerDto {
  @ApiPropertyOptional({
    example: '2027-03-01',
    description: 'Target period; defaults to next month',
  })
  @IsOptional()
  @IsDateString()
  period?: string;
}
