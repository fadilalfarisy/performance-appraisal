import { ApiProperty } from "@nestjs/swagger";
import { randomUUID } from "crypto";

export class DepartmentResponseDto {
    @ApiProperty({ required: true, example: randomUUID() })
    id!: string;

    @ApiProperty({ required: true, example: 'Production' })
    name!: string;
}
