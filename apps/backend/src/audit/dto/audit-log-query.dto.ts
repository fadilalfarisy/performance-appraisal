import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import type { AuditActorType, AuditLogQuery } from '@appraisal/types';
import { QueryDto } from '../../common/query/query.dto';

export class AuditLogQueryDto extends QueryDto implements AuditLogQuery {
  @ApiPropertyOptional({
    description: 'Inclusive lower bound on occurred_at (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  occurredFrom?: string;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound on occurred_at (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  occurredTo?: string;

  @ApiPropertyOptional({ description: 'Filter by actor user id' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by entity name' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: 'Filter by entity id' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Filter by action code' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ enum: ['USER', 'SYSTEM'] })
  @IsOptional()
  @IsIn(['USER', 'SYSTEM'])
  actorType?: AuditActorType;
}
