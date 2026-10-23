import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CriteriaSetSummary } from '@appraisal/types';
import { UserRole } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { CriteriaService } from './criteria.service';
import { CreateCriteriaSetDto } from './dto/create-criteria-set.dto';
import { CriteriaQueryDto } from './dto/criteria-query.dto';
import { UpdateCriteriaSetDto } from './dto/update-criteria-set.dto';
import { CriteriaSetPayload } from './interfaces/criteria-set.interface';

@ApiTags('criteria-sets')
@ApiBearerAuth()
@Controller('criteria-sets')
export class CriteriaController {
  constructor(private readonly criteriaService: CriteriaService) {}

  @Get()
  @ApiOperation({ summary: 'List criteria set versions' })
  findAll(): Promise<ApiResponse<CriteriaSetPayload[]>> {
    return this.criteriaService.findAll();
  }

  @Get('available')
  @ApiOperation({
    summary: 'List non-draft criteria sets available to a department',
  })
  findAvailable(
    @Query() query: CriteriaQueryDto,
  ): Promise<ApiResponse<CriteriaSetSummary[]>> {
    return this.criteriaService.findAvailable(query.departmentId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the active criteria set for a department' })
  findActive(
    @Query() query: CriteriaQueryDto,
  ): Promise<ApiResponse<CriteriaSetPayload | null>> {
    return this.criteriaService.findActive(query.departmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a criteria set by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<CriteriaSetPayload>> {
    return this.criteriaService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a DRAFT criteria set for a department or globally',
  })
  create(
    @Body() dto: CreateCriteriaSetDto,
  ): Promise<ApiResponse<CriteriaSetPayload>> {
    return this.criteriaService.createDraft(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({
    summary:
      'Update a DRAFT set, or edit the allowed ACTIVE fields as ADMIN',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCriteriaSetDto,
  ): Promise<ApiResponse<CriteriaSetPayload>> {
    return this.criteriaService.update(id, dto);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate a DRAFT set and archive the previous active set',
  })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<CriteriaSetPayload>> {
    return this.criteriaService.activate(id);
  }
}
