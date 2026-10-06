import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AppraisalsService } from './appraisals.service';

@Injectable()
export class AppraisalSchedulerService {
  private readonly logger = new Logger(AppraisalSchedulerService.name);

  constructor(
    private readonly appraisalsService: AppraisalsService,
    private readonly configService: ConfigService,
  ) {}

  // Day 1 of every month at 01:00. Idempotent and protected by an advisory lock.
  @Cron('0 1 1 * *', { name: 'appraisal-day-1' })
  async handleMonthly() {
    if (this.configService.get<string>('SCHEDULER_ENABLED') === 'false') {
      return;
    }
    try {
      const summary = await this.appraisalsService.runScheduler();
      this.logger.log(`Appraisal scheduler run: ${JSON.stringify(summary)}`);
    } catch (error) {
      this.logger.error('Appraisal scheduler run failed', error as Error);
    }
  }
}
