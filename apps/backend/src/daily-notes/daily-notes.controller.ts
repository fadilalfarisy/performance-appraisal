import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { DailyNotesService } from './daily-notes.service';
import { CreateDailyNoteDto } from './dto/create-daily-note.dto';
import { UpdateDailyNoteDto } from './dto/update-daily-note.dto';
import { DailyNoteQueryDto } from './dto/daily-note-query.dto';
import {
  AccessibleEmployeePayload,
  DailyNotePayload,
} from './interfaces/daily-note.interface';

@ApiTags('daily-notes')
@ApiBearerAuth()
@Roles(UserRole.HEAD_DEPARTMENT, UserRole.SUPERVISOR)
@Controller('daily-notes')
export class DailyNotesController {
  constructor(private readonly dailyNotesService: DailyNotesService) {}

  @Get()
  @ApiOperation({ summary: 'List daily notes for the caller scope' })
  findAll(
    @Query() query: DailyNoteQueryDto,
  ): Promise<ApiResponse<DailyNotePayload[]>> {
    return this.dailyNotesService.findAll(query);
  }

  @Get('accessible-employees')
  @ApiOperation({
    summary: 'Employees the caller may record notes for (own subordinates / own department)',
  })
  accessibleEmployees(): Promise<ApiResponse<AccessibleEmployeePayload[]>> {
    return this.dailyNotesService.accessibleEmployees();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a daily note by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<DailyNotePayload>> {
    return this.dailyNotesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a daily note for an employee' })
  create(
    @Body() dto: CreateDailyNoteDto,
  ): Promise<ApiResponse<DailyNotePayload>> {
    return this.dailyNotesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a daily note (replaces its values)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDailyNoteDto,
  ): Promise<ApiResponse<DailyNotePayload>> {
    return this.dailyNotesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a daily note' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.dailyNotesService.remove(id);
  }
}
