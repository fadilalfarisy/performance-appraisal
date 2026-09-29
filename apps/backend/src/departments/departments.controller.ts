import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponse } from '../common/utils/response.util';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { DepartmentPayload } from './interfaces/department.interface';

@ApiTags('departments')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) { }

  @Post()
  // @Roles('ADMINISTRATOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new department (Admin only)' })
  create(
    @Body() dto: CreateDepartmentDto,
  ): Promise<ApiResponse<DepartmentPayload>> {
    return this.departmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  findAll(
    @Query() query: DepartmentQueryDto,
  ): Promise<ApiResponse<DepartmentPayload[]>> {
    return this.departmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<DepartmentPayload>> {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  // @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Update department details (Admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<ApiResponse<DepartmentPayload>> {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  // @Roles('ADMINISTRATOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete department (Admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.departmentsService.remove(id);
  }
}
