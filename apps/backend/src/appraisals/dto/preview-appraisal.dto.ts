import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class PreviewAppraisalDto {
  @ApiProperty({ example: 'department-uuid' })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: '2027-03-01' })
  @IsDateString()
  @IsNotEmpty()
  period!: string;
}
