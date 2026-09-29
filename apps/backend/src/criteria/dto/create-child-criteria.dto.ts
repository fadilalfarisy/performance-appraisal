import { IsString, IsNotEmpty, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { CriteriaType } from '../criteria.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChildCriteriaDto {
  @ApiProperty({ example: "Criteria Test" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "Desc Test" })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  weight!: number;

  @ApiProperty({ example: CriteriaType.BENEFIT })
  @IsEnum(CriteriaType)
  @IsNotEmpty()
  type!: CriteriaType;
}
