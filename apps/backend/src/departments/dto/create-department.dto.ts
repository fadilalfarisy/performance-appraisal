import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import type { CreateDepartmentRequest } from "@appraisal/types";

export class CreateDepartmentDto implements CreateDepartmentRequest {
  @ApiProperty({ required: true, example: 'Production' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
