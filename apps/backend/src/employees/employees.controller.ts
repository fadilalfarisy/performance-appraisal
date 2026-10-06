import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { EmployeePayload } from './interfaces/employee.interface';
import type { UploadedFileLike } from '../imports/import.types';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  findAll(
    @Query() query: QueryEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload[]>> {
    return this.employeesService.findAllEmployees(query);
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Export employees to .xlsx (Admin, HR)' })
  async export(@Res() res: Response): Promise<void> {
    const buffer = await this.employeesService.exportEmployees();
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', 'attachment; filename="employees.xlsx"');
    res.send(buffer);
  }

  @Get('import-template')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Download the employee import template (Admin, HR)' })
  async template(@Res() res: Response): Promise<void> {
    const buffer = await this.employeesService.buildTemplate();
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="employees-template.xlsx"',
    );
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<EmployeePayload>> {
    return this.employeesService.findOneEmployee(id);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Import employees from .xlsx (Admin, HR)' })
  import(@UploadedFile() file: UploadedFileLike) {
    return this.employeesService.importEmployees(file);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Create a new employee' })
  create(
    @Body() dto: CreateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    return this.employeesService.createEmployee(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update employee details' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    return this.employeesService.updateEmployee(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Soft-delete an employee' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.employeesService.removeEmployee(id);
  }
}
