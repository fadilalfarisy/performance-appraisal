import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  FieldInputType,
  type CreateCriteriaSetRequest,
  type CriterionInput,
  type CriteriaScaleDescriptionInput,
  type CriterionFieldInput,
  type FieldOption,
  type FieldRules,
  type FieldValue,
} from '@appraisal/types';

export class CriteriaScaleDescriptionDto
  implements CriteriaScaleDescriptionInput
{
  @ApiProperty({ example: 5 })
  @IsInt()
  score!: number;

  @ApiProperty({ example: 'Consistently exceeds expectations' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class FieldOptionDto implements FieldOption {
  @ApiProperty({ example: 'GOOD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value!: string;

  @ApiProperty({ example: 'Good' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;
}

export class FieldRulesDto implements FieldRules {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  minLength?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  maxLength?: number;

  @ApiPropertyOptional({ example: '^[A-Z].*$' })
  @IsOptional()
  @IsString()
  pattern?: string;
}

export class CriterionFieldDto implements CriterionFieldInput {
  @ApiProperty({ example: 'tasks_completed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fieldKey!: string;

  @ApiProperty({ example: 'Tasks completed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @ApiProperty({ enum: FieldInputType, example: FieldInputType.NUMBER })
  @IsEnum(FieldInputType)
  inputType!: FieldInputType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  defaultValue?: FieldValue;

  @ApiPropertyOptional({ type: FieldRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldRulesDto)
  rules?: FieldRulesDto;

  @ApiPropertyOptional({ type: [FieldOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class CriterionDto implements CriterionInput {
  @ApiProperty({ example: 'QUALITY' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Quality of Work' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  scaleMin!: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  scaleMax!: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  weight!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiProperty({ type: [CriteriaScaleDescriptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaScaleDescriptionDto)
  scaleDescriptions!: CriteriaScaleDescriptionDto[];

  @ApiPropertyOptional({ type: [CriterionFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionFieldDto)
  fields?: CriterionFieldDto[];
}

export class CreateCriteriaSetDto implements CreateCriteriaSetRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: [CriterionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionDto)
  criteria?: CriterionDto[];
}
