import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  @SwaggerResponse({ status: 200, description: 'Report found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<any>> {
    return this.reportsService.findOne(id);
  }

  // ── HR Actions ─────────────────────────────────────────────────────────────

  @Post(':id/hr/approve')
  @Roles('HR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'HR approve report' })
  hrApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.hrApprove(id, user.userId);
  }

  @Post(':id/hr/reject')
  @Roles('HR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'HR reject report' })
  hrReject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('note') note: string,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.hrReject(id, user.userId, note);
  }

  // ── HOD Actions ────────────────────────────────────────────────────────────

  @Post(':id/hod/approve')
  @Roles('HEAD_DEPARTMENT', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'HOD approve report' })
  hodApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.hodApprove(id, user.userId);
  }

  @Post(':id/hod/reject')
  @Roles('HEAD_DEPARTMENT', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'HOD reject report' })
  hodReject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('note') note: string,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.hodReject(id, user.userId, note);
  }

  // ── Manager Actions ────────────────────────────────────────────────────────

  @Post(':id/manager/approve')
  @Roles('MANAGER', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Manager approve report' })
  managerApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.managerApprove(id, user.userId);
  }

  @Post(':id/manager/reject')
  @Roles('MANAGER', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Manager reject report' })
  managerReject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('note') note: string,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.managerReject(id, user.userId, note);
  }

  // ── GM Actions ─────────────────────────────────────────────────────────────

  @Post(':id/gm/approve')
  @Roles('GENERAL_MANAGER', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'GM approve report (Finalize)' })
  gmApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.gmApprove(id, user.userId);
  }

  @Post(':id/gm/reject')
  @Roles('GENERAL_MANAGER', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'GM reject report' })
  gmReject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('note') note: string,
  ): Promise<ApiResponse<any>> {
    return this.reportsService.gmReject(id, user.userId, note);
  }
}
