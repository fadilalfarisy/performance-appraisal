import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';

export class PermissionItemDto {
  @ApiProperty({ example: '0670c7c1-ae8d-4725-96a6-ac70a9beaba5' })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

export class AssignPermissionsDto {
  @ApiProperty({ type: [PermissionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permission!: PermissionItemDto[];
}
