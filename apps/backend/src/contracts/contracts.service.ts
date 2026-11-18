import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { DbService } from '../db/db.service';
import type { DbExecutor } from '../db/db.type';
import { AuditService } from '../audit/audit.service';
import { auditActor } from '../common/utils/audit-actor.util';
import { RequestContextService } from '../common/context/request-context.service';
import { ImportService } from '../imports/import.service';
import type { UploadedFileLike } from '../imports/import.types';
import { ContractsRepository, type ContractRow } from './contracts.repository';
import { ContractImporter } from './contracts.importer';
import { ContractsExcelService } from './contracts.excel';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractQueryDto } from './dto/contract-query.dto';
import { ContractPayload } from './interfaces/contract.interface';
import type { ImportResult } from '@appraisal/types';

export const CONTRACTS_EXPORT_FILENAME = 'contracts.xlsx';
export const CONTRACTS_TEMPLATE_FILENAME = 'contracts-template.xlsx';

@Injectable()
export class ContractsService {
  constructor(
    private readonly contractsRepository: ContractsRepository,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
    private readonly importService: ImportService,
    private readonly contractImporter: ContractImporter,
    private readonly excel: ContractsExcelService,
  ) {}

  async findAll(
    query: ContractQueryDto,
  ): Promise<ApiResponse<ContractPayload[]>> {
    const [contracts, total] =
      await this.contractsRepository.findAllWithCount(query);
    return paginated(
      contracts.map((c) => this.toPayload(c)),
      { total, limit: query.limit, page: query.page },
    );
  }

  async findOne(id: string): Promise<ApiResponse<ContractPayload>> {
    const contract = await this.findOneOrFail(id);
    return ok(this.toPayload(contract));
  }

  async create(
    dto: CreateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    const created = await this.dbService.transaction(async (tx) => {
      await this.assertNoOverlap(
        dto.employeeId,
        dto.startDate,
        dto.endDate ?? null,
        tx,
      );
      const row = await this.contractsRepository.createAndSave(dto, tx);
      if (!row) {
        throw new BadRequestException('Contract could not be created');
      }
      await this.audit.record(tx, {
        action: 'CONTRACT_CREATED',
        entity: 'contract',
        entityId: row.id,
        after: this.toPayload(row),
        ...auditActor(this.requestContext),
      });
      return row;
    });
    return ok(this.toPayload(created));
  }

  async update(
    id: string,
    dto: UpdateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    const existing = await this.findOneOrFail(id);

    const updated = await this.dbService.transaction(async (tx) => {
      await this.assertNoOverlap(
        existing.employeeId,
        dto.startDate ?? existing.startDate,
        dto.endDate !== undefined ? (dto.endDate ?? null) : existing.endDate,
        tx,
        id,
      );
      const row = await this.contractsRepository.updateAndSave(id, dto, tx);
      if (!row) {
        throw new NotFoundException(`Contract with ID ${id} not found`);
      }
      await this.audit.record(tx, {
        action: 'CONTRACT_UPDATED',
        entity: 'contract',
        entityId: id,
        before: this.toPayload(existing),
        after: this.toPayload(row),
        ...auditActor(this.requestContext),
      });
      return row;
    });

    return ok(this.toPayload(updated));
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOneOrFail(id);

    await this.dbService.transaction(async (tx) => {
      await this.contractsRepository.softDelete(id, tx);
      await this.audit.record(tx, {
        action: 'CONTRACT_DELETED',
        entity: 'contract',
        entityId: id,
        before: this.toPayload(existing),
        ...auditActor(this.requestContext),
      });
    });
  }

  // ── Excel import / export ──────────────────────────────────────────────────

  async exportContracts(query: ContractQueryDto): Promise<Buffer> {
    const rows = await this.contractsRepository.findForExport(query);
    const buffer = await this.excel.buildExport(rows);
    await this.recordExport('CONTRACTS_EXPORTED', {
      file: CONTRACTS_EXPORT_FILENAME,
      filters: this.exportFilters(query),
      rows: rows.length,
    });
    return buffer;
  }

  async buildTemplate(): Promise<Buffer> {
    const buffer = await this.excel.buildTemplate();
    await this.recordExport('CONTRACTS_TEMPLATE_EXPORTED', {
      file: CONTRACTS_TEMPLATE_FILENAME,
    });
    return buffer;
  }

  private async recordExport(
    action: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.dbService.transaction((tx) =>
      this.audit.record(tx, {
        action,
        entity: 'contract',
        metadata,
        ...auditActor(this.requestContext),
      }),
    );
  }

  private exportFilters(query: ContractQueryDto): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(query)) {
      if (key === 'page' || key === 'limit' || key === 'orderBy') continue;
      if (value !== undefined && value !== null && value !== '') {
        filters[key] = value;
      }
    }

    return filters;
  }

  async importContracts(
    file: UploadedFileLike | undefined,
  ): Promise<ApiResponse<ImportResult>> {
    const result = await this.importService.run(
      file,
      this.contractImporter,
      'contract',
    );
    return ok(result);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async assertNoOverlap(
    employeeId: string,
    startDate: string,
    endDate: string | null,
    executor: DbExecutor,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.contractsRepository.findOverlapping(
      employeeId,
      startDate,
      endDate,
      excludeId,
      executor,
    );
    if (overlapping) {
      throw new UnprocessableEntityException({
        errorCode: 'CONTRACT_OVERLAP',
        message: `This contract overlaps an existing contract (${overlapping.startDate} to ${overlapping.endDate ?? 'no end date'}) for the employee`,
      });
    }
  }

  private async findOneOrFail(id: string): Promise<ContractRow> {
    const contract = await this.contractsRepository.findById(id);
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }
    return contract;
  }

  private toPayload(contract: any): ContractPayload {
    return {
      id: contract.id,
      employeeId: contract.employeeId,
      contractType: contract.contractType,
      startDate: contract.startDate,
      endDate: contract.endDate ?? null,
      employee: contract.employee ?? null,
    };
  }
}
