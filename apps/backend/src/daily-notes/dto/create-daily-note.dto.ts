import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import type {
  CreateDailyNoteRequest,
  DailyNoteValueInput,
  FieldValue,
} from '@appraisal/types';

export class DailyNoteValueDto implements DailyNoteValueInput {
  @ApiProperty({ example: 'field-uuid' })
  @IsUUID()
  fieldId!: string;

  @ApiPropertyOptional({
    description: 'Value matching the field input type declared in the criteria set',
  })
  @Allow()
  value!: FieldValue;
}

export class CreateDailyNoteDto implements CreateDailyNoteRequest {
  @ApiProperty({ example: 'employee-uuid' })
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ example: '2026-10-19' })
  @IsDateString()
  @IsNotEmpty()
  recordDate!: string;

  @ApiProperty({ example: 'criteria-set-uuid' })
  @IsUUID()
  @IsNotEmpty()
  criteriaSetId!: string;

  @ApiProperty({ type: [DailyNoteValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyNoteValueDto)
  values!: DailyNoteValueDto[];
}
