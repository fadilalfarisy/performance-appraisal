import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';
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
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  startDate?: string[];

  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  endDate?: string[];
}
