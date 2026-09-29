// employees/employees.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { EmployeePayload } from './interfaces/employee.interface';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ApiSuccess } from '../common/decorators/response.decorator';
import { ContractPayload } from './interfaces/contract.interface';

@ApiTags('employees')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) { }

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  @ApiSuccess('Get list of employees successfully', HttpStatus.OK)
  findAll(
    @Query() query: QueryEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload[]>> {
    return this.employeesService.findAllEmployees(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiSuccess('Get employee by ID successfully', HttpStatus.OK)
  findOneEmployee(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<EmployeePayload>> {
    return this.employeesService.findOneEmployee(id);
  }

  @Post()
  @Roles('HR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiSuccess('Create a new employee successfully', HttpStatus.CREATED)
  create(
    @Body() dto: CreateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    return this.employeesService.createEmployee(dto);
  }

  @Patch(':id')
  @Roles('HR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Update employee details' })
  @ApiSuccess('Update employee successfully', HttpStatus.OK)
  updateEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    return this.employeesService.updateEmployee(id, dto);
  }

  @Delete(':id')
  @Roles('HR', 'ADMINISTRATOR')
  @ApiSuccess('Delete employee successfully', HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete employee' })
  removeEmployee(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.employeesService.removeEmployee(id);
  }

  @Get(':id/contracts')
  @ApiOperation({ summary: 'Get contract by employee ID' })
  @ApiSuccess('Get list of employee contracts successfully', HttpStatus.OK)
  findAllContractsByEmployeeId(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ContractPayload[]>> {
    return this.employeesService.findAllContractsByEmployeeId(id);
  }

  @Get('/:id/contracts/:contractId')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiSuccess('Get contract by ID successfully', HttpStatus.OK)
  findOneContract(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<ApiResponse<ContractPayload>> {
    return this.employeesService.findOneContract(contractId);
  }

  @Post(':id/contracts')
  @Roles('HR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiSuccess('Create a new contract successfully', HttpStatus.CREATED)
  createContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    return this.employeesService.createContract(id, dto);
  }

  @Patch(':id/contracts/:contractId')
  @Roles('HR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Update contract details' })
  @ApiSuccess('Update contract successfully', HttpStatus.OK)
  updateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: UpdateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    return this.employeesService.updateContract(id, contractId, dto);
  }

  @Delete(':id/contracts/:contractId')
  @Roles('HR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Delete contract' })
  @ApiSuccess('Delete contract successfully', HttpStatus.NO_CONTENT)
  removeContract(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.employeesService.removeContract(id);
  }
}
