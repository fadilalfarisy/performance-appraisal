import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  UserRole,
  type CriterionFieldInput,
  type CriterionFieldResponse,
  type CriterionInput,
  type CriterionResponse,
  type CriteriaSetSummary,
} from '@appraisal/types';
import { ApiResponse, ok } from '../common/utils/response.util';
import { BusinessLogicException } from '../common/exceptions/custom.exceptions';
import { DbService } from '../db/db.service';
import type { DbExecutor } from '../db/db.type';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import {
  CriteriaRepository,
  type CriteriaSetListRow,
  type CriteriaSetSummaryRow,
} from './criteria.repository';
import { CreateCriteriaSetDto } from './dto/create-criteria-set.dto';
import { UpdateCriteriaSetDto } from './dto/update-criteria-set.dto';
import { CriteriaSetPayload } from './interfaces/criteria-set.interface';
import {
  validateActiveCriteriaUpdate,
  validateCriteriaSet,
  validateFields,
} from './criteria.validation';

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
    const setIds = sets.map((set) => set.id);
    const [criteriaBySet, fieldsBySet] = await Promise.all([
      this.criteriaRepository.criteriaBySetIds(setIds),
      this.criteriaRepository.fieldsBySetIds(setIds),
    ]);
    return ok(
      sets.map((set) =>
        this.toResponse(
          set,
          criteriaBySet[set.id] ?? [],
          fieldsBySet[set.id] ?? [],
        ),
      ),
    );
  }

  async findAvailable(
    departmentId?: string,
  ): Promise<ApiResponse<CriteriaSetSummary[]>> {
    const rows = await this.criteriaRepository.findAvailableSets(
      departmentId ?? null,
    );
    return ok(rows.map((row) => this.toSummary(row)));
  }

  async findActive(
    departmentId?: string,
  ): Promise<ApiResponse<CriteriaSetPayload | null>> {
    const set = await this.criteriaRepository.findActiveSet(
      departmentId ?? null,
    );
    if (!set) return ok(null);
    const [criteriaBySet, fieldsBySet] = await Promise.all([
      this.criteriaRepository.criteriaBySetIds([set.id]),
      this.criteriaRepository.fieldsBySetIds([set.id]),
    ]);
    return ok(
      this.toResponse(
        set,
        criteriaBySet[set.id] ?? [],
        fieldsBySet[set.id] ?? [],
      ),
    );
  }

  async findOne(id: string): Promise<ApiResponse<CriteriaSetPayload>> {
    const set = await this.findSetOrFail(id);
    const [criteriaBySet, fieldsBySet] = await Promise.all([
      this.criteriaRepository.criteriaBySetIds([id]),
      this.criteriaRepository.fieldsBySetIds([id]),
    ]);
    return ok(
      this.toResponse(
        set,
        criteriaBySet[id] ?? [],
        fieldsBySet[id] ?? [],
      ),
    );
  }

  async createDraft(
    dto: CreateCriteriaSetDto,
  ): Promise<ApiResponse<CriteriaSetPayload>> {
    const departmentId = dto.departmentId ?? null;

    const created = await this.dbService.transaction(async (tx) => {
      const version =
        (await this.criteriaRepository.getMaxVersion(departmentId, tx)) + 1;
      const set = await this.criteriaRepository.createSet(
        {
          departmentId,
          version,
          note: dto.note,
          createdBy: this.requestContext.getUser()?.userId,
        },
        tx,
      );
      if (!set) {
        throw new BadRequestException('Criteria set could not be created');
      }

      let criteriaList = dto.criteria;
      let fieldList = dto.fields;
      if (!criteriaList || !fieldList) {
        const active = await this.criteriaRepository.findActiveSet(
          departmentId,
          tx,
        );
        if (active) {
          if (!criteriaList) {
            const bySet = await this.criteriaRepository.criteriaBySetIds(
              [active.id],
              tx,
            );
            criteriaList = (bySet[active.id] ?? []).map((criterion) =>
              this.toInput(criterion),
            );
          }
          if (!fieldList) {
            const fieldsBySet = await this.criteriaRepository.fieldsBySetIds(
              [active.id],
              tx,
            );
            fieldList = (fieldsBySet[active.id] ?? []).map((field) =>
              this.toFieldInput(field),
            );
          }
        }
      }

      await this.criteriaRepository.replaceCriteria(
        set.id,
        criteriaList ?? [],
        tx,
      );
      await this.criteriaRepository.replaceFields(
        set.id,
        fieldList ?? [],
        tx,
      );

      await this.audit.record(tx, {
        action: 'CRITERIA_SET_CREATED',
        entity: 'criteria_set',
        entityId: set.id,
        after: {
          version,
          status: 'DRAFT',
          departmentId,
        },
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
    const role = this.requestContext.getUser()?.roles?.[0] ?? null;

    if (set.status === 'ARCHIVED') {
      throw new BusinessLogicException(
        'ARCHIVED criteria sets are read-only',
        'CRITERIA_SET_ARCHIVED',
      );
    }

    if (set.status === 'ACTIVE' && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only ADMIN can edit an ACTIVE criteria set',
      );
    }

    if (set.status === 'DRAFT') {
      if (dto.criteria !== undefined) {
        validateCriteriaSet(dto.criteria);
      }
      if (dto.fields !== undefined) {
        validateFields(dto.fields);
      }

      await this.dbService.transaction(async (tx) => {
        if (dto.note !== undefined) {
          await this.criteriaRepository.updateSet(id, { note: dto.note }, tx);
        }
        if (dto.criteria !== undefined) {
          await this.criteriaRepository.replaceCriteria(id, dto.criteria, tx);
        }
        if (dto.fields !== undefined) {
          await this.criteriaRepository.replaceFields(id, dto.fields, tx);
        }
        await this.audit.record(tx, {
          action: 'CRITERIA_SET_UPDATED',
          entity: 'criteria_set',
          entityId: id,
          after: {
            note: dto.note,
            criteriaCount: dto.criteria?.length,
            fieldsCount: dto.fields?.length,
            departmentId: set.departmentId,
          },
          ...this.actor(),
        });
      });

      return this.findOne(id);
    }

    const existingCriteria =
      (await this.criteriaRepository.criteriaBySetIds([id]))[id] ?? [];
    const existingFields =
      (await this.criteriaRepository.fieldsBySetIds([id]))[id] ?? [];
    if (dto.criteria !== undefined) {
      validateActiveCriteriaUpdate(existingCriteria, dto.criteria);
    }
    if (dto.fields !== undefined) {
      validateFields(dto.fields);
    }

    await this.dbService.transaction(async (tx) => {
      if (dto.note !== undefined) {
        await this.criteriaRepository.updateSet(id, { note: dto.note }, tx);
      }

      if (dto.criteria !== undefined) {
        const existingById = new Map(
          existingCriteria.map((criterion) => [criterion.id, criterion]),
        );

        for (const [index, criterion] of dto.criteria.entries()) {
          const current = existingById.get(criterion.id as string);
          if (!current) {
            throw new BusinessLogicException(
              'The criterion list of an ACTIVE set is locked',
              'CRITERIA_SET_STRUCTURE_LOCKED',
            );
          }

          await this.criteriaRepository.updateCriterion(
            current.id,
            {
              code: criterion.code,
              name: criterion.name,
              description: criterion.description ?? null,
              scaleMin: criterion.scaleMin,
              scaleMax: criterion.scaleMax,
              displayOrder: criterion.displayOrder ?? index,
            },
            tx,
          );
          await this.criteriaRepository.replaceScaleDescriptions(
            current.id,
            criterion.scaleDescriptions,
            tx,
          );
        }
      }

      if (dto.fields !== undefined) {
        await this.syncFields(id, existingFields, dto.fields, tx);
      }

      await this.audit.record(tx, {
        action: 'CRITERIA_SET_UPDATED',
        entity: 'criteria_set',
        entityId: id,
        after: {
          note: dto.note,
          criteriaCount: dto.criteria?.length,
          fieldsCount: dto.fields?.length,
          departmentId: set.departmentId,
          status: set.status,
        },
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
    const fieldsBySet = await this.criteriaRepository.fieldsBySetIds([id]);
    const fields = fieldsBySet[id] ?? [];
    validateCriteriaSet(list);
    validateFields(fields);

    await this.dbService.transaction(async (tx) => {
      await this.criteriaRepository.archiveActive(set.departmentId, tx);
      await this.criteriaRepository.activate(
        id,
        this.requestContext.getUser()?.userId ?? null,
        tx,
      );
      await this.audit.record(tx, {
        action: 'CRITERIA_SET_ACTIVATED',
        entity: 'criteria_set',
        entityId: id,
        after: {
          status: 'ACTIVE',
          departmentId: set.departmentId,
        },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async syncFields(
    setId: string,
    existing: CriterionFieldResponse[],
    incoming: CriterionFieldInput[] | undefined,
    executor: DbExecutor,
  ): Promise<void> {
    if (incoming === undefined) return;

    const existingById = new Map(existing.map((field) => [field.id, field]));
    const incomingIds = new Set<string>();

    for (const field of incoming) {
      if (!field.id) continue;
      if (!existingById.has(field.id)) {
        throw new BusinessLogicException(
          `Field ${field.id} does not belong to this criteria set`,
          'CRITERIA_FIELD_UNKNOWN',
        );
      }
      incomingIds.add(field.id);
    }

    for (const field of existing) {
      if (incomingIds.has(field.id)) continue;
      if (await this.criteriaRepository.fieldHasValues(field.id, executor)) {
        await this.criteriaRepository.softDeleteField(field.id, executor);
      } else {
        await this.criteriaRepository.hardDeleteField(field.id, executor);
      }
    }

    for (const [index, field] of incoming.entries()) {
      const values = {
        fieldKey: field.fieldKey,
        label: field.label,
        inputType: field.inputType,
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        rules: field.rules ?? null,
        options: field.options ?? null,
        displayOrder: field.displayOrder ?? index,
      };

      if (field.id) {
        await this.criteriaRepository.updateField(field.id, values, executor);
      } else {
        await this.criteriaRepository.insertField(
          {
            criteriaSetId: setId,
            ...values,
          },
          executor,
        );
      }
    }
  }

  private async findSetOrFail(id: string): Promise<CriteriaSetListRow> {
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

  private toFieldInput(field: CriterionFieldResponse): CriterionFieldInput {
    return {
      fieldKey: field.fieldKey,
      label: field.label,
      inputType: field.inputType,
      required: field.required,
      defaultValue: field.defaultValue ?? undefined,
      rules: field.rules ?? undefined,
      options: field.options ?? undefined,
      displayOrder: field.displayOrder,
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
    set: CriteriaSetListRow,
    criteria: CriterionResponse[],
    fields: CriterionFieldResponse[],
  ): CriteriaSetPayload {
    return {
      id: set.id,
      departmentId: set.departmentId ?? null,
      departmentName: set.departmentName ?? null,
      version: set.version,
      status: set.status as CriteriaSetPayload['status'],
      note: set.note ?? null,
      createdBy: set.createdBy ?? null,
      activatedBy: set.activatedBy ?? null,
      activatedAt: set.activatedAt
        ? new Date(set.activatedAt).toISOString()
        : null,
      criteria,
      fields,
    };
  }

  private toSummary(row: CriteriaSetSummaryRow): CriteriaSetSummary {
    return {
      id: row.id,
      departmentId: row.departmentId ?? null,
      departmentName: row.departmentName ?? null,
      version: row.version,
      status: row.status as CriteriaSetSummary['status'],
      note: row.note ?? null,
      activatedAt: row.activatedAt
        ? new Date(row.activatedAt).toISOString()
        : null,
      criteriaCount: Number(row.criteriaCount ?? 0),
    };
  }
}
