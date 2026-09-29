import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
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
import { DailyRecordsService } from './daily-records.service';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';
import { DailyRecordPayload } from './interfaces/daily-record.interface';

@ApiTags('daily-records')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('daily-records')
export class DailyRecordsController {
  constructor(private readonly dailyRecordsService: DailyRecordsService) {}

  @Post()
  @Roles('SUPERVISOR', 'ADMINISTRATOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new daily record (Supervisor only)' })
  @SwaggerResponse({ status: 201, description: 'Daily record created' })
  @SwaggerResponse({ status: 400, description: 'Bad request' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDailyRecordDto,
  ): Promise<ApiResponse<DailyRecordPayload>> {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.dailyRecordsService.create(user.employeeId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get daily record by ID' })
  @SwaggerResponse({ status: 200, description: 'Daily record found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 404, description: 'Daily record not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<DailyRecordPayload>> {
    return this.dailyRecordsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPERVISOR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Update daily record (Owner only)' })
  @SwaggerResponse({ status: 200, description: 'Daily record updated' })
  @SwaggerResponse({ status: 400, description: 'Bad request' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  @SwaggerResponse({ status: 404, description: 'Daily record not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDailyRecordDto,
  ): Promise<ApiResponse<DailyRecordPayload>> {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.dailyRecordsService.update(id, user.employeeId, dto);
  }

  @Delete(':id')
  @Roles('SUPERVISOR', 'ADMINISTRATOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete daily record (Owner only)' })
  @SwaggerResponse({ status: 204, description: 'Daily record deleted' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  @SwaggerResponse({ status: 404, description: 'Daily record not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.dailyRecordsService.remove(id, user.employeeId);
  }
}
