import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@appraisal/types';
import type { ApiResponse, AuditLogResponse } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List audit entries (Admin only)' })
  findAll(
    @Query() query: AuditLogQueryDto,
  ): Promise<ApiResponse<AuditLogResponse[]>> {
    return this.auditService.findAll(query);
  }
}
