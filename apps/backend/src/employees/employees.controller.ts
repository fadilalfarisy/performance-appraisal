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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { EmployeePayload } from './interfaces/employee.interface';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<EmployeePayload>> {
    return this.employeesService.findOneEmployee(id);
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
