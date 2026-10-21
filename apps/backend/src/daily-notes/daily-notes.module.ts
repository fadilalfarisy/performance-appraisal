import { Module } from '@nestjs/common';
import { CriteriaModule } from '../criteria/criteria.module';
import { DailyNotesService } from './daily-notes.service';
import { DailyNotesController } from './daily-notes.controller';
import { DailyNotesRepository } from './daily-notes.repository';

@Module({
  imports: [CriteriaModule],
  controllers: [DailyNotesController],
  providers: [DailyNotesService, DailyNotesRepository],
  exports: [DailyNotesService],
})
export class DailyNotesModule {}
