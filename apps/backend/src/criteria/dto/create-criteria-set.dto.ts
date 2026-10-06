import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CreateCriteriaSetRequest,
  CriterionInput,
  CriteriaScaleDescriptionInput,
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
