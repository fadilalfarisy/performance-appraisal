import { Module } from '@nestjs/common';
import { DailyRecordsService } from './daily-records.service';
import { DailyRecordsController } from './daily-records.controller';
import { DailyRecordsRepository } from './daily-records.repository';

@Module({
  controllers: [DailyRecordsController],
  providers: [DailyRecordsService, DailyRecordsRepository],
  exports: [DailyRecordsService],
})
export class DailyRecordsModule {}
