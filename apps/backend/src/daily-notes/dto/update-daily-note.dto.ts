import { PartialType } from '@nestjs/swagger';
import { CreateDailyNoteDto } from './create-daily-note.dto';

export class UpdateDailyNoteDto extends PartialType(CreateDailyNoteDto) {}
