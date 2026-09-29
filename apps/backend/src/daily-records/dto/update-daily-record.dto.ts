import { PartialType } from '@nestjs/swagger';
import { CreateDailyRecordDto } from './create-daily-record.dto';

export class UpdateDailyRecordDto extends PartialType(CreateDailyRecordDto) {}
