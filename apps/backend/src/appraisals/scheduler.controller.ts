import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { AppraisalsService } from './appraisals.service';
import { RunSchedulerDto } from './dto/run-scheduler.dto';

@ApiTags('scheduler')
@ApiBearerAuth()
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly appraisalsService: AppraisalsService) {}

  @Post('appraisals/run')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the day-1 appraisal job now (Admin, idempotent)' })
  run(@Body() dto: RunSchedulerDto) {
    return this.appraisalsService.runScheduler(dto.period);
  }
}
