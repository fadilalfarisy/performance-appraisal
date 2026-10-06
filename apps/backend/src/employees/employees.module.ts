import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeeImporter } from './employees.importer';
import { EmployeesExcelService } from './employees.excel';

@Module({
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
