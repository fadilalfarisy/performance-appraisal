import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../common/utils/response.util';
import { DashboardService } from './dashboard.service';
import type { DashboardSummary } from '@appraisal/types';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary (scoped)' })
  summary(): Promise<ApiResponse<DashboardSummary>> {
    return this.dashboardService.summary();
  }
}
