import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@appraisal/types';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/utils/response.util';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractQueryDto } from './dto/contract-query.dto';
import { ContractPayload } from './interfaces/contract.interface';
import type { UploadedFileLike } from '../imports/import.types';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'List contracts' })
  findAll(
    @Query() query: ContractQueryDto,
  ): Promise<ApiResponse<ContractPayload[]>> {
    return this.contractsService.findAll(query);
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Export contracts to .xlsx (Admin, HR)' })
  async export(
    @Query() query: ContractQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.contractsService.exportContracts(query);
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', 'attachment; filename="contracts.xlsx"');
    res.send(buffer);
  }

  @Get('import-template')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Download the contract import template (Admin, HR)' })
  async template(@Res() res: Response): Promise<void> {
    const buffer = await this.contractsService.buildTemplate();
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="contracts-template.xlsx"',
    );
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contract by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ContractPayload>> {
    return this.contractsService.findOne(id);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Import contracts from .xlsx (Admin, HR)' })
  import(@UploadedFile() file: UploadedFileLike) {
    return this.contractsService.importContracts(file);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a contract (Admin, HR)' })
  create(
    @Body() dto: CreateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    return this.contractsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update a contract (Admin, HR)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    return this.contractsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a contract (Admin, HR)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.contractsService.remove(id);
  }
}
