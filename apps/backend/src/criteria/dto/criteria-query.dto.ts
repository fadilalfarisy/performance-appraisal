import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CriteriaQueryDto {
  @ApiPropertyOptional({
    description: 'Department whose criteria sets are requested',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
