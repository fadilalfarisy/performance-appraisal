// employees/employees.module.ts
import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { ContractsRepository } from './contracts.repository';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository, ContractsRepository],
  exports: [EmployeesService],
})
export class EmployeesModule {}
