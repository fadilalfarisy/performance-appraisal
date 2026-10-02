import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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
import { CriteriaService } from './criteria.service';
import { ChildCriteriaPayload } from './interfaces/child-criteria.interface';
import { CreateCriteriaDto } from './dto/create-criteria.dto';
import { ParentCriteriaPayload } from './interfaces/parent-criteria.interface';

@ApiTags('criteria')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('criteria')
export class CriteriaController {
  constructor(private readonly criteriaService: CriteriaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all criteria' })
  @SwaggerResponse({ status: 200, description: 'List of criteria' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  findAll(): Promise<ApiResponse<ParentCriteriaPayload[]>> {
    return this.criteriaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get criteria by ID' })
  @SwaggerResponse({ status: 200, description: 'Criteria found' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 404, description: 'Criteria not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ChildCriteriaPayload[]>> {
    return this.criteriaService.findOne(id);
  }

  @Post()
  @Roles(UserRole.HR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new criteria' })
  @SwaggerResponse({ status: 201, description: 'Criteria created' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  create(
    @Body() createCriteriaDto: CreateCriteriaDto,
  ): Promise<ApiResponse<ChildCriteriaPayload>> {
    return this.criteriaService.create(createCriteriaDto);
  }
}
