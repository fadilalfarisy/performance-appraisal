import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import type { UpdateAppraisalEmployeesRequest } from '@appraisal/types';

export class UpdateAppraisalEmployeesDto
  implements UpdateAppraisalEmployeesRequest
{
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  addEmployeeIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  removeEmployeeIds?: string[];
}
