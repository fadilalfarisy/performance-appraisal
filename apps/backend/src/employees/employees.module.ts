import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeeImporter } from './employees.importer';
import { EmployeesExcelService } from './employees.excel';

@Module({
  imports: [ContractsModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeesRepository,
    EmployeeImporter,
    EmployeesExcelService,
  ],
  exports: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}
