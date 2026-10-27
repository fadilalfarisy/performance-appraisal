import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole, type AppraisalEmployeeDetailResponse } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { AppraisalsService } from './appraisals.service';
import { PreviewAppraisalDto } from './dto/preview-appraisal.dto';
import { CreateAppraisalDto } from './dto/create-appraisal.dto';
import { UpdateAppraisalEmployeesDto } from './dto/update-appraisal-employees.dto';
import { SaveRatingsDto } from './dto/save-ratings.dto';
import { AppraisalTransitionDto } from './dto/appraisal-transition.dto';
import { AppraisalQueryDto } from './dto/appraisal-query.dto';
import { AppraisalPayload } from './interfaces/appraisal.interface';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('appraisals')
@ApiBearerAuth()
@Controller('appraisals')
export class AppraisalsController {
  constructor(private readonly appraisalsService: AppraisalsService) {}

  @Get()
  @ApiOperation({ summary: 'List appraisals (scoped)' })
  findAll(
    @Query() query: AppraisalQueryDto,
  ): Promise<ApiResponse<AppraisalPayload[]>> {
    return this.appraisalsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appraisal with employees and ratings' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<AppraisalPayload>> {
    return this.appraisalsService.findOne(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get the status history' })
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.appraisalsService.history(id);
  }

  @Get(':id/employees/:appraisalEmployeeId')
  @Roles(UserRole.HEAD_DEPARTMENT)
  @ApiOperation({
    summary:
      'Get one appraisal employee with ratings, criteria rubric, and daily note sum (Head Department, Admin)',
  })
  findEmployeeDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('appraisalEmployeeId', ParseUUIDPipe) appraisalEmployeeId: string,
  ): Promise<ApiResponse<AppraisalEmployeeDetailResponse>> {
    return this.appraisalsService.findEmployeeDetail(id, appraisalEmployeeId);
  }

  @Get(':id/export-result')
  @Roles(
    UserRole.HR,
    UserRole.HEAD_DEPARTMENT,
    UserRole.MANAGER,
    UserRole.GENERAL_MANAGER,
  )
  @ApiOperation({
    summary: 'Export the appraisal result as .xlsx (COMPLETE only)',
  })
  async exportResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.appraisalsService.exportResult(id);
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="appraisal-result.xlsx"',
    );
    res.send(buffer);
  }

  @Post('preview')
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview eligible employees (HR)' })
  preview(@Body() dto: PreviewAppraisalDto) {
    return this.appraisalsService.preview(dto);
  }

  @Post()
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a DRAFT appraisal (HR)' })
  create(
    @Body() dto: CreateAppraisalDto,
  ): Promise<ApiResponse<AppraisalPayload>> {
    return this.appraisalsService.create(dto);
  }

  @Put(':id/employees')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Add or remove employees (DRAFT, HR)' })
  updateEmployees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppraisalEmployeesDto,
  ): Promise<ApiResponse<AppraisalPayload>> {
    return this.appraisalsService.updateEmployees(id, dto);
  }

  @Put(':id/ratings')
  @Roles(UserRole.HEAD_DEPARTMENT)
  @ApiOperation({ summary: 'Bulk upsert ratings (PENDING, Head Department)' })
  saveRatings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveRatingsDto,
  ): Promise<ApiResponse<AppraisalPayload>> {
    return this.appraisalsService.saveRatings(id, dto);
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move an appraisal through the workflow' })
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AppraisalTransitionDto,
  ): Promise<ApiResponse<AppraisalPayload>> {
    return this.appraisalsService.transition(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a DRAFT appraisal (HR)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.appraisalsService.remove(id);
  }
}
