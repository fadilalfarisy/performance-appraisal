import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeStatus } from '../interfaces/employee.interface';
import { ColumnEmployee } from '../enums/column-employee.enum';
import { QueryDto } from '../../common/query/query.dto';

export class QueryEmployeeDto extends QueryDto {
  @ApiPropertyOptional({ example: ColumnEmployee.CREATED_AT })
  @IsOptional()
  @IsEnum(ColumnEmployee)
  sortBy: ColumnEmployee = ColumnEmployee.EMPLOYEE_NUMBER;

  @IsOptional()
  @IsUUID()
  department?: string;

  @IsOptional()
  @IsUUID()
  position?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsDateString()
  contractStartFrom?: string;

  @IsOptional()
  @IsDateString()
  contractStartTo?: string;

  @IsOptional()
  @IsDateString()
  contractEndFrom?: string;

  @IsOptional()
  @IsDateString()
  contractEndTo?: string;
}
