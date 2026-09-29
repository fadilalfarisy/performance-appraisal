import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateParentCriteriaDto {

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


}
