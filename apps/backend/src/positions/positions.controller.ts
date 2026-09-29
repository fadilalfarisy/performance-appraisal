import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionPayload } from './interfaces/position.interface';

@ApiTags('positions')
@ApiBearerAuth()
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) { }

  @Post()
  @Roles('ADMINISTRATOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new position (Admin only)' })
  create(
    @Body() dto: CreatePositionDto,
  ): Promise<ApiResponse<PositionPayload>> {
    return this.positionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all positions' })
  findAll(): Promise<ApiResponse<PositionPayload[]>> {
    return this.positionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<PositionPayload>> {
    return this.positionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Update position details (Admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePositionDto,
  ): Promise<ApiResponse<PositionPayload>> {
    return this.positionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete position (Admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.positionsService.remove(id);
  }
}
