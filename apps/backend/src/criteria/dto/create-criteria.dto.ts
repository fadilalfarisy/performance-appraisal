import {
  IsString,
  IsNotEmpty,
  Matches,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateChildCriteriaDto } from './create-child-criteria.dto';
import { Type } from 'class-transformer';

export class CreateCriteriaDto {

  @ApiProperty({ example: 10 })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: 'Version must follow x.y.z format',
  })
  version!: string;

  @ApiProperty({ example: "Desc Test" })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ type: [CreateChildCriteriaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChildCriteriaDto)
  criterias!: [CreateChildCriteriaDto];

}
