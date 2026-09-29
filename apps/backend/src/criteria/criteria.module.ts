import { Module } from '@nestjs/common';
import { CriteriaService } from './criteria.service';
import { CriteriaController } from './criteria.controller';
import { CriteriaRepository } from './criteria.repository';

@Module({
  controllers: [CriteriaController],
  providers: [
    CriteriaService,
    CriteriaRepository,
  ],
  exports: [CriteriaService],
})
export class CriteriaModule { }
