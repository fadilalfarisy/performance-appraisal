import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty({ required: true, example: 'Production' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
