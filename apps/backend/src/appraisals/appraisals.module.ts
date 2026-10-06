import { Module } from '@nestjs/common';
import { CriteriaModule } from '../criteria/criteria.module';
import { AppraisalsService } from './appraisals.service';
import { AppraisalsRepository } from './appraisals.repository';
import { AppraisalSchedulerService } from './appraisal-scheduler.service';
import { AppraisalsController } from './appraisals.controller';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [CriteriaModule],
  controllers: [AppraisalsController, SchedulerController],
  providers: [
    AppraisalsService,
    AppraisalsRepository,
    AppraisalSchedulerService,
  ],
  exports: [AppraisalsService],
})
export class AppraisalsModule {}
