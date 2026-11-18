import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@appraisal/types';
import type { ApiResponse, AuditLogResponse } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

  @Get('export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export audit entries to .xlsx (Admin only)' })
  async export(
    @Query() query: AuditLogQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.auditService.export(query);
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }
}
