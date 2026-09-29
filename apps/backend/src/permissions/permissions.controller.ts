import {
  Controller,
  Get,
  Post,
  Body,
  ParseUUIDPipe,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('permissions')
// @UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async findAll() {
    return await this.permissionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.permissionsService.findOne(id);
  }

  @Post()
  async create(@Body() createDto: CreatePermissionDto) {
    return await this.permissionsService.create(createDto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: CreatePermissionDto,
  ) {
    return await this.permissionsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.permissionsService.delete(id);
  }
}
