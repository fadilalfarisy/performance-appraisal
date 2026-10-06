import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractsRepository } from './contracts.repository';
import { ContractImporter } from './contracts.importer';
import { ContractsExcelService } from './contracts.excel';

@Module({
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractsRepository,
    ContractImporter,
    ContractsExcelService,
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
