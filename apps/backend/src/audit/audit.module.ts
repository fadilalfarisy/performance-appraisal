import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditExcelService } from './audit.excel';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository, AuditExcelService],
  exports: [AuditService],
})
export class AuditModule {}
