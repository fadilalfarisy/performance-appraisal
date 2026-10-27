import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { DbService } from '../db/db.service';
import type { DbExecutor } from '../db/db.type';
import { AuditService, type AuditEntry } from '../audit/audit.service';
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
        ...this.actor(),
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
        ...this.actor(),
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
        ...this.actor(),
      });
    });
  }

  // ── Excel import / export ──────────────────────────────────────────────────

  async exportContracts(query: ContractQueryDto): Promise<Buffer> {
    const rows = await this.contractsRepository.findForExport(query);
    return this.excel.buildExport(rows);
  }

  async buildTemplate(): Promise<Buffer> {
    return this.excel.buildTemplate();
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

  private actor(): Pick<
    AuditEntry,
    'userId' | 'username' | 'role' | 'ipAddress' | 'requestId'
  > {
    const user = this.requestContext.getUser();
    return {
      userId: user?.userId ?? null,
      username: user?.username ?? null,
      role: user?.roles?.[0] ?? null,
      ipAddress: this.requestContext.getIp() ?? null,
      requestId: this.requestContext.getRequestId() ?? null,
    };
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
