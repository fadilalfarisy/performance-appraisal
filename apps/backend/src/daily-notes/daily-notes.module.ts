import { Module } from '@nestjs/common';
import { DailyNotesService } from './daily-notes.service';
import { DailyNotesController } from './daily-notes.controller';
import { DailyNotesRepository } from './daily-notes.repository';

@Module({
  controllers: [DailyNotesController],
  providers: [DailyNotesService, DailyNotesRepository],
  exports: [DailyNotesService],
})
export class DailyNotesModule {}
