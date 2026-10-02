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
import { Roles } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { UserRole } from '@appraisal/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DailyNotesService } from './daily-notes.service';
import { CreateDailyNoteDto } from './dto/create-daily-note.dto';
import { UpdateDailyNoteDto } from './dto/update-daily-note.dto';
import { DailyNotePayload } from './interfaces/daily-note.interface';

@ApiTags('daily-notes')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('daily-notes')
export class DailyNotesController {
  constructor(private readonly dailyNotesService: DailyNotesService) {}

  @Post()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new daily note (Supervisor only)' })
  @SwaggerResponse({ status: 201, description: 'Daily note created' })
  @SwaggerResponse({ status: 400, description: 'Bad request' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDailyNoteDto,
  ): Promise<ApiResponse<DailyNotePayload>> {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.dailyNotesService.create(user.employeeId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get daily note by ID' })
  @SwaggerResponse({ status: 200, description: 'Daily note found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 404, description: 'Daily note not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<DailyNotePayload>> {
    return this.dailyNotesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update daily note (Owner only)' })
  @SwaggerResponse({ status: 200, description: 'Daily note updated' })
  @SwaggerResponse({ status: 400, description: 'Bad request' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  @SwaggerResponse({ status: 404, description: 'Daily note not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDailyNoteDto,
  ): Promise<ApiResponse<DailyNotePayload>> {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.dailyNotesService.update(id, user.employeeId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete daily note (Owner only)' })
  @SwaggerResponse({ status: 204, description: 'Daily note deleted' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  @SwaggerResponse({ status: 404, description: 'Daily note not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    if (!user.employeeId) {
      throw new BadRequestException('User is not linked to an employee');
    }
    return this.dailyNotesService.remove(id, user.employeeId);
  }
}
