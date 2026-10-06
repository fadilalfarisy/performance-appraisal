import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CriterionInput, CriterionResponse } from '@appraisal/types';
import { ApiResponse, ok } from '../common/utils/response.util';
import { BusinessLogicException } from '../common/exceptions/custom.exceptions';
import { DbService } from '../db/db.service';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { CriteriaRepository, type CriteriaSetRow } from './criteria.repository';
import { CreateCriteriaSetDto } from './dto/create-criteria-set.dto';
import { UpdateCriteriaSetDto } from './dto/update-criteria-set.dto';
import { CriteriaSetPayload } from './interfaces/criteria-set.interface';
import { validateCriteriaSet } from './criteria.validation';

@Injectable()
export class CriteriaService {
  constructor(
    private readonly criteriaRepository: CriteriaRepository,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
  ) {}

  async findAll(): Promise<ApiResponse<CriteriaSetPayload[]>> {
    const sets = await this.criteriaRepository.findAllSets();
    const criteriaBySet = await this.criteriaRepository.criteriaBySetIds(
      sets.map((set) => set.id),
    );
    return ok(
      sets.map((set) => this.toResponse(set, criteriaBySet[set.id] ?? [])),
    );
  }

  async findActive(): Promise<ApiResponse<CriteriaSetPayload | null>> {
    const set = await this.criteriaRepository.findActiveSet();
    if (!set) return ok(null);
    const criteriaBySet = await this.criteriaRepository.criteriaBySetIds([
      set.id,
    ]);
    return ok(this.toResponse(set, criteriaBySet[set.id] ?? []));
  }

  async findOne(id: string): Promise<ApiResponse<CriteriaSetPayload>> {
    const set = await this.findSetOrFail(id);
    const criteriaBySet = await this.criteriaRepository.criteriaBySetIds([id]);
    return ok(this.toResponse(set, criteriaBySet[id] ?? []));
  }

  async createDraft(
    dto: CreateCriteriaSetDto,
  ): Promise<ApiResponse<CriteriaSetPayload>> {
    const version = (await this.criteriaRepository.getMaxVersion()) + 1;

    const created = await this.dbService.transaction(async (tx) => {
      const set = await this.criteriaRepository.createSet(
        { version, note: dto.note, createdBy: this.requestContext.getUser()?.userId },
        tx,
      );
      if (!set) {
        throw new BadRequestException('Criteria set could not be created');
      }

      let list = dto.criteria;
      if (!list) {
        const active = await this.criteriaRepository.findActiveSet(tx);
        if (active) {
          const bySet = await this.criteriaRepository.criteriaBySetIds(
            [active.id],
            tx,
          );
          list = (bySet[active.id] ?? []).map((criterion) =>
            this.toInput(criterion),
          );
        }
      }
      await this.criteriaRepository.replaceCriteria(set.id, list ?? [], tx);

      await this.audit.record(tx, {
        action: 'CRITERIA_SET_CREATED',
        entity: 'criteria_set',
        entityId: set.id,
        after: { version, status: 'DRAFT' },
        ...this.actor(),
      });

      return set;
    });

    return this.findOne(created.id);
  }

  async update(
    id: string,
    dto: UpdateCriteriaSetDto,
  ): Promise<ApiResponse<CriteriaSetPayload>> {
    const set = await this.findSetOrFail(id);
    if (set.status !== 'DRAFT') {
      throw new BusinessLogicException(
        'Only DRAFT criteria sets can be edited',
        'CRITERIA_SET_NOT_EDITABLE',
      );
    }

    if (dto.criteria !== undefined) {
      validateCriteriaSet(dto.criteria);
    }

    await this.dbService.transaction(async (tx) => {
      if (dto.note !== undefined) {
        await this.criteriaRepository.updateSet(id, { note: dto.note }, tx);
      }
      if (dto.criteria !== undefined) {
        await this.criteriaRepository.replaceCriteria(id, dto.criteria, tx);
      }
      await this.audit.record(tx, {
        action: 'CRITERIA_SET_UPDATED',
        entity: 'criteria_set',
        entityId: id,
        after: { note: dto.note, criteriaCount: dto.criteria?.length },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  async activate(id: string): Promise<ApiResponse<CriteriaSetPayload>> {
    const set = await this.findSetOrFail(id);
    if (set.status !== 'DRAFT') {
      throw new BusinessLogicException(
        'Only DRAFT criteria sets can be activated',
        'CRITERIA_SET_NOT_ACTIVATABLE',
      );
    }

    const bySet = await this.criteriaRepository.criteriaBySetIds([id]);
    const list = (bySet[id] ?? []).map((criterion) => this.toInput(criterion));
    if (list.length === 0) {
      throw new BusinessLogicException(
        'A criteria set needs at least one criterion',
        'CRITERIA_SET_EMPTY',
      );
    }
    validateCriteriaSet(list);
    await this.dbService.transaction(async (tx) => {
      await this.criteriaRepository.supersedeActive(tx);
      await this.criteriaRepository.activate(
        id,
        this.requestContext.getUser()?.userId ?? null,
        null,
        tx,
      );
      await this.audit.record(tx, {
        action: 'CRITERIA_SET_ACTIVATED',
        entity: 'criteria_set',
        entityId: id,
        after: { status: 'ACTIVE' },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findSetOrFail(id: string): Promise<CriteriaSetRow> {
    const set = await this.criteriaRepository.findSetById(id);
    if (!set) {
      throw new NotFoundException(`Criteria set with ID ${id} not found`);
    }
    return set;
  }

  private toInput(criterion: CriterionResponse): CriterionInput {
    return {
      code: criterion.code,
      name: criterion.name,
      description: criterion.description ?? undefined,
      scaleMin: criterion.scaleMin,
      scaleMax: criterion.scaleMax,
      weight: criterion.weight,
      displayOrder: criterion.displayOrder,
      scaleDescriptions: criterion.scaleDescriptions,
    };
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

  private toResponse(
    set: CriteriaSetRow,
    criteria: CriterionResponse[],
  ): CriteriaSetPayload {
    return {
      id: set.id,
      version: set.version,
      status: set.status as CriteriaSetPayload['status'],
      effectiveDate: set.effectiveDate ?? null,
      note: set.note ?? null,
      createdBy: set.createdBy ?? null,
      activatedBy: set.activatedBy ?? null,
      activatedAt: set.activatedAt
        ? new Date(set.activatedAt).toISOString()
        : null,
      criteria,
    };
  }
}
