import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import type { UpdateDailyNoteRequest } from '@appraisal/types';
import { DailyNoteValueDto } from './create-daily-note.dto';

export class UpdateDailyNoteDto implements UpdateDailyNoteRequest {
  @ApiProperty({ type: [DailyNoteValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyNoteValueDto)
  values!: DailyNoteValueDto[];
}
