import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  AppraisalStatus,
  type AppraisalEmployeeResponse,
  type AppraisalResponse,
  type CriterionResponse,
} from '@appraisal/types';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { BusinessLogicException } from '../common/exceptions/custom.exceptions';
import { addMonths, currentPeriod, periodEnd, periodStart } from '../common/utils/period.util';
import { DbService } from '../db/db.service';
import type { DbExecutor } from '../db/db.type';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ScopeService } from '../common/scope/scope.service';
import { CriteriaService } from '../criteria/criteria.service';
import { calculateScore } from './appraisal-score';
import { findTransition } from './appraisal.transitions';
import { AppraisalsRepository } from './appraisals.repository';
import { PreviewAppraisalDto } from './dto/preview-appraisal.dto';
import { CreateAppraisalDto } from './dto/create-appraisal.dto';
import { UpdateAppraisalEmployeesDto } from './dto/update-appraisal-employees.dto';
import { SaveRatingsDto } from './dto/save-ratings.dto';
import { AppraisalTransitionDto } from './dto/appraisal-transition.dto';
import { AppraisalQueryDto } from './dto/appraisal-query.dto';

type EligibleEmployee = Awaited<
  ReturnType<AppraisalsRepository['findEligible']>
>[number];

@Injectable()
export class AppraisalsService {
  constructor(
    private readonly repository: AppraisalsRepository,
    private readonly criteriaService: CriteriaService,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
    private readonly scopeService: ScopeService,
  ) {}

  // ── Preview / creation ─────────────────────────────────────────────────────

  async preview(dto: PreviewAppraisalDto) {
    const activeSet = await this.requireActiveSet();
    const start = periodStart(dto.period);
    const eligible = await this.repository.findEligible(
      dto.departmentId,
      start,
      periodEnd(dto.period),
    );
    return ok({
      departmentId: dto.departmentId,
      period: start,
      criteriaSetId: activeSet.id,
      criteriaSetVersion: activeSet.version,
      employees: eligible,
    });
  }

  async create(dto: CreateAppraisalDto): Promise<ApiResponse<AppraisalResponse>> {
    const activeSet = await this.requireActiveSet();
    const start = periodStart(dto.period);
    const eligible = await this.repository.findEligible(
      dto.departmentId,
      start,
      periodEnd(dto.period),
    );
    const byId = new Map(eligible.map((row) => [row.id, row]));
    const chosen = dto.employeeIds
      .map((id) => byId.get(id))
      .filter((row): row is EligibleEmployee => Boolean(row));

    if (chosen.length !== dto.employeeIds.length) {
      throw new BusinessLogicException(
        'Some employees are not eligible for this department and period',
        'APPRAISAL_INELIGIBLE_EMPLOYEE',
      );
    }

    const created = await this.dbService.transaction(async (tx) => {
      const appraisal = await this.repository.createAppraisal(
        {
          departmentId: dto.departmentId,
          period: start,
          criteriaSetId: activeSet.id,
          source: 'MANUAL',
          createdBy: this.requestContext.getUser()?.userId ?? null,
        },
        tx,
      );
      if (!appraisal) {
        throw new ConflictException({
          message: 'An appraisal already exists for this department and period',
          errorCode: 'APPRAISAL_ALREADY_EXISTS',
        });
      }
      await this.repository.insertEmployees(
        chosen.map((employee) => this.toSnapshot(appraisal.id, employee)),
        tx,
      );
      await this.audit.record(tx, {
        action: 'APPRAISAL_CREATED',
        entity: 'appraisal',
        entityId: appraisal.id,
        after: { departmentId: dto.departmentId, period: start, employees: chosen.length },
        ...this.actor(),
      });
      return appraisal;
    });

    return this.findOne(created.id);
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  async findAll(
    query: AppraisalQueryDto,
  ): Promise<ApiResponse<AppraisalResponse[]>> {
    const scope = await this.currentScope();
    const [rows, total] = await this.repository.listAppraisals(
      query,
      scope === 'ALL' ? undefined : scope,
    );

    const data = rows.map((row) => this.toResponse(row, [], [], []));
    return paginated(data, {
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  async findOne(id: string): Promise<ApiResponse<AppraisalResponse>> {
    const appraisal = await this.repository.findAppraisal(id);
    if (!appraisal) {
      throw new NotFoundException(`Appraisal with ID ${id} not found`);
    }
    await this.assertScope(appraisal.departmentId);

    const criteria = await this.criteriaForSet(appraisal.criteriaSetId);
    const employees = await this.repository.findEmployees(id);
    const ratings = await this.repository.ratingsForAppraisal(id);
    const departmentName = await this.repository.departmentName(
      appraisal.departmentId,
    );

    return ok(
      this.toResponse(appraisal, employees, ratings, criteria, departmentName),
    );
  }

  async history(
    id: string,
  ): Promise<ApiResponse<unknown[]>> {
    const appraisal = await this.repository.findAppraisal(id);
    if (!appraisal) {
      throw new NotFoundException(`Appraisal with ID ${id} not found`);
    }
    await this.assertScope(appraisal.departmentId);

    const rows = await this.repository.history(id);
    return ok(
      rows.map((row) => ({
        id: row.id,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        action: row.action,
        comment: row.comment,
        actorUserId: row.actorUserId,
        createdAt: new Date(row.createdAt).toISOString(),
      })),
    );
  }

  // ── Employee list (DRAFT) ──────────────────────────────────────────────────

  async updateEmployees(
    id: string,
    dto: UpdateAppraisalEmployeesDto,
  ): Promise<ApiResponse<AppraisalResponse>> {
    const appraisal = await this.findDraft(id);

    await this.dbService.transaction(async (tx) => {
      if (dto.removeEmployeeIds?.length) {
        await this.repository.removeEmployees(id, dto.removeEmployeeIds, tx);
      }
      if (dto.addEmployeeIds?.length) {
        const eligible = await this.repository.findEligible(
          appraisal.departmentId,
          appraisal.period,
          periodEnd(appraisal.period),
        );
        const byId = new Map(eligible.map((row) => [row.id, row]));
        const chosen = dto.addEmployeeIds
          .map((employeeId) => byId.get(employeeId))
          .filter((row): row is EligibleEmployee => Boolean(row));
        await this.repository.insertEmployees(
          chosen.map((employee) => this.toSnapshot(id, employee)),
          tx,
        );
      }
      await this.audit.record(tx, {
        action: 'APPRAISAL_EMPLOYEES_UPDATED',
        entity: 'appraisal',
        entityId: id,
        after: {
          added: dto.addEmployeeIds?.length ?? 0,
          removed: dto.removeEmployeeIds?.length ?? 0,
        },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  // ── Ratings (PENDING) ──────────────────────────────────────────────────────

  async saveRatings(
    id: string,
    dto: SaveRatingsDto,
  ): Promise<ApiResponse<AppraisalResponse>> {
    const appraisal = await this.repository.findAppraisal(id);
    if (!appraisal) {
      throw new NotFoundException(`Appraisal with ID ${id} not found`);
    }
    if (appraisal.status !== AppraisalStatus.PENDING) {
      throw new BusinessLogicException(
        'Ratings can only be edited while the appraisal is PENDING',
        'APPRAISAL_RATINGS_NOT_EDITABLE',
      );
    }
    await this.assertScope(appraisal.departmentId);

    const criteria = await this.criteriaForSet(appraisal.criteriaSetId);
    const criteriaById = new Map(criteria.map((c) => [c.id, c]));
    const employees = await this.repository.findEmployees(id);
    const employeeIds = new Set(employees.map((e) => e.id));

    for (const rating of dto.ratings) {
      const criterion = criteriaById.get(rating.criterionId);
      if (!criterion) {
        throw new BusinessLogicException(
          'Rating references a criterion outside this appraisal',
          'APPRAISAL_UNKNOWN_CRITERION',
        );
      }
      if (
        !employeeIds.has(rating.appraisalEmployeeId) ||
        rating.rating < criterion.scaleMin ||
        rating.rating > criterion.scaleMax
      ) {
        throw new BusinessLogicException(
          `Rating for ${criterion.code} is outside its scale`,
          'APPRAISAL_RATING_OUT_OF_RANGE',
        );
      }
    }

    await this.dbService.transaction(async (tx) => {
      await this.repository.upsertRatings(
        dto.ratings.map((rating) => ({
          appraisalEmployeeId: rating.appraisalEmployeeId,
          criterionId: rating.criterionId,
          rating: rating.rating,
          updatedBy: this.requestContext.getUser()?.userId ?? null,
        })),
        tx,
      );
      for (const comment of dto.comments ?? []) {
        await this.repository.updateEmployeeComment(
          comment.appraisalEmployeeId,
          comment.comment,
          tx,
        );
      }
      await this.recomputeScores(id, criteria, tx);
      await this.audit.record(tx, {
        action: 'APPRAISAL_RATINGS_SAVED',
        entity: 'appraisal',
        entityId: id,
        metadata: { ratings: dto.ratings.length },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  // ── Workflow ───────────────────────────────────────────────────────────────

  async transition(
    id: string,
    dto: AppraisalTransitionDto,
  ): Promise<ApiResponse<AppraisalResponse>> {
    const user = this.requestContext.getUser();
    const role = user?.roles?.[0] ?? '';

    await this.dbService.transaction(async (tx) => {
      const appraisal = await this.repository.lockAppraisal(id, tx);
      if (!appraisal) {
        throw new NotFoundException(`Appraisal with ID ${id} not found`);
      }

      const rule = findTransition(
        appraisal.status as AppraisalStatus,
        dto.to,
        role,
      );
      if (!rule) {
        throw new BusinessLogicException(
          `Cannot move from ${appraisal.status} to ${dto.to}`,
          'APPRAISAL_INVALID_TRANSITION',
        );
      }

      if (rule.scoped && user) {
        await this.scopeService.assertDepartmentAccess(
          user,
          appraisal.departmentId,
        );
      }

      if (rule.comment && !dto.comment?.trim()) {
        throw new BusinessLogicException(
          'A comment is required for this transition',
          'APPRAISAL_COMMENT_REQUIRED',
        );
      }

      await this.checkPreconditions(id, appraisal.criteriaSetId, rule.requires ?? [], tx);

      await this.repository.updateStatus(id, dto.to, tx);
      await this.repository.insertHistory(
        {
          appraisalId: id,
          fromStatus: appraisal.status as AppraisalStatus,
          toStatus: dto.to,
          action: rule.kind,
          comment: dto.comment ?? null,
          actorUserId: user?.userId ?? null,
        },
        tx,
      );
      await this.audit.record(tx, {
        action: 'APPRAISAL_STATUS_CHANGED',
        entity: 'appraisal',
        entityId: id,
        before: { status: appraisal.status },
        after: { status: dto.to },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  // ── Deletion ───────────────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const appraisal = await this.findDraft(id);
    await this.dbService.transaction(async (tx) => {
      await this.repository.softDelete(
        id,
        this.requestContext.getUser()?.userId ?? null,
        tx,
      );
      await this.audit.record(tx, {
        action: 'APPRAISAL_DELETED',
        entity: 'appraisal',
        entityId: appraisal.id,
        ...this.actor(),
      });
    });
  }

  // ── Scheduler ──────────────────────────────────────────────────────────────

  async runScheduler(targetPeriod?: string) {
    const activeSet = (await this.criteriaService.findActive()).data;
    if (!activeSet) {
      throw new BusinessLogicException(
        'No active criteria set',
        'APPRAISAL_NO_ACTIVE_CRITERIA_SET',
      );
    }

    const period = periodStart(targetPeriod ?? addMonths(currentPeriod(), 1));
    const end = periodEnd(period);

    return this.dbService.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`SELECT pg_try_advisory_xact_lock(73001) AS locked`,
      );
      const locked = (lockResult.rows[0] as { locked?: boolean } | undefined)
        ?.locked;
      if (!locked) {
        return { created: 0, skipped: 0, failed: 0, lockSkipped: true };
      }

      const departments = await this.repository.findActiveDepartments(tx);
      let created = 0;
      let skipped = 0;
      let failed = 0;

      for (const department of departments) {
        try {
          const eligible = await this.repository.findEligible(
            department.id,
            period,
            end,
          );
          if (eligible.length === 0) {
            skipped += 1;
            continue;
          }
          const appraisal = await this.repository.createAppraisal(
            {
              departmentId: department.id,
              period,
              criteriaSetId: activeSet.id,
              source: 'SCHEDULER',
              createdBy: null,
            },
            tx,
          );
          if (!appraisal) {
            skipped += 1;
            continue;
          }
          await this.repository.insertEmployees(
            eligible.map((employee) => this.toSnapshot(appraisal.id, employee)),
            tx,
          );
          await this.audit.record(tx, {
            actorType: 'SYSTEM',
            action: 'APPRAISAL_CREATED',
            entity: 'appraisal',
            entityId: appraisal.id,
            after: { source: 'SCHEDULER', departmentId: department.id, period },
          });
          created += 1;
        } catch {
          failed += 1;
        }
      }

      await this.audit.record(tx, {
        actorType: 'SYSTEM',
        action: 'SCHEDULER_RUN',
        entity: 'scheduler',
        metadata: { period, created, skipped, failed },
      });

      return { created, skipped, failed, lockSkipped: false };
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async requireActiveSet(): Promise<CriterionSetLike> {
    const activeSet = (await this.criteriaService.findActive()).data;
    if (!activeSet) {
      throw new BusinessLogicException(
        'No active criteria set',
        'APPRAISAL_NO_ACTIVE_CRITERIA_SET',
      );
    }
    return activeSet;
  }

  private async criteriaForSet(setId: string): Promise<CriterionResponse[]> {
    return (await this.criteriaService.findOne(setId)).data.criteria;
  }

  private async findDraft(id: string) {
    const appraisal = await this.repository.findAppraisal(id);
    if (!appraisal) {
      throw new NotFoundException(`Appraisal with ID ${id} not found`);
    }
    if (appraisal.status !== AppraisalStatus.DRAFT) {
      throw new BusinessLogicException(
        'This action is only allowed while the appraisal is DRAFT',
        'APPRAISAL_NOT_DRAFT',
      );
    }
    await this.assertScope(appraisal.departmentId);
    return appraisal;
  }

  private async currentScope(): Promise<'ALL' | string[]> {
    const user = this.requestContext.getUser();
    if (!user) return 'ALL';
    return this.scopeService.getDepartmentScope(user);
  }

  private async assertScope(departmentId: string): Promise<void> {
    const user = this.requestContext.getUser();
    if (!user) return;
    await this.scopeService.assertDepartmentAccess(user, departmentId);
  }

  private async checkPreconditions(
    appraisalId: string,
    criteriaSetId: string,
    requires: string[],
    executor: DbExecutor,
  ): Promise<void> {
    if (requires.includes('hasEmployees')) {
      const employees = await this.repository.findEmployees(appraisalId, executor);
      if (employees.length === 0) {
        throw new BusinessLogicException(
          'The appraisal has no employees',
          'APPRAISAL_NO_EMPLOYEES',
        );
      }
    }
    if (requires.includes('allRatingsFilled')) {
      const employees = await this.repository.findEmployees(appraisalId, executor);
      const criteria = await this.criteriaForSet(criteriaSetId);
      const ratings = await this.repository.ratingsForAppraisal(
        appraisalId,
        executor,
      );
      if (ratings.length < employees.length * criteria.length) {
        throw new BusinessLogicException(
          'All ratings must be filled before submitting',
          'APPRAISAL_RATINGS_INCOMPLETE',
        );
      }
    }
  }

  private async recomputeScores(
    appraisalId: string,
    criteria: CriterionResponse[],
    executor: DbExecutor,
  ): Promise<void> {
    const employees = await this.repository.findEmployees(appraisalId, executor);
    const ratings = await this.repository.ratingsForAppraisal(
      appraisalId,
      executor,
    );
    const scoreCriteria = criteria.map((c) => ({
      id: c.id,
      scaleMax: c.scaleMax,
      weight: c.weight,
    }));

    for (const employee of employees) {
      const employeeRatings = ratings
        .filter((r) => r.appraisalEmployeeId === employee.id)
        .map((r) => ({ criterionId: r.criterionId, rating: r.rating }));
      const score = calculateScore(employeeRatings, scoreCriteria);
      await this.repository.updateEmployeeTotalScore(employee.id, score, executor);
    }
  }

  private toSnapshot(appraisalId: string, employee: EligibleEmployee) {
    return {
      appraisalId,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      employeeName: employee.fullName,
      departmentId: employee.departmentId,
      departmentName: employee.departmentName,
      positionId: employee.positionId,
      positionName: employee.positionName,
      contractId: employee.contractId,
      contractType: employee.contractType,
      contractEndDate: employee.contractEndDate,
    };
  }

  private toResponse(
    appraisal: {
      id: string;
      departmentId: string;
      period: string;
      criteriaSetId: string;
      status: string;
      source: string;
      createdBy: string | null;
      createdAt: Date | string;
    },
    employees: {
      id: string;
      employeeId: string;
      employeeNumber: string;
      employeeName: string;
      departmentId: string | null;
      departmentName: string | null;
      positionId: string | null;
      positionName: string | null;
      contractId: string | null;
      contractType: string | null;
      contractEndDate: string | null;
      comment: string | null;
      totalScore: number | null;
    }[],
    ratings: {
      appraisalEmployeeId: string;
      criterionId: string;
      rating: number;
    }[],
    criteria: CriterionResponse[],
    departmentName: string | null = null,
  ): AppraisalResponse {
    const mappedEmployees: AppraisalEmployeeResponse[] = employees.map(
      (employee) => ({
        id: employee.id,
        employeeId: employee.employeeId,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.employeeName,
        departmentId: employee.departmentId,
        departmentName: employee.departmentName,
        positionId: employee.positionId,
        positionName: employee.positionName,
        contractId: employee.contractId,
        contractType: employee.contractType,
        contractEndDate: employee.contractEndDate,
        comment: employee.comment,
        totalScore: employee.totalScore,
        ratings: ratings
          .filter((r) => r.appraisalEmployeeId === employee.id)
          .map((r) => ({ criterionId: r.criterionId, rating: r.rating })),
      }),
    );

    return {
      id: appraisal.id,
      departmentId: appraisal.departmentId,
      departmentName,
      period: appraisal.period,
      criteriaSetId: appraisal.criteriaSetId,
      criteriaSetVersion:
        (appraisal as unknown as { criteriaSetVersion?: number })
          .criteriaSetVersion ?? 0,
      status: appraisal.status as AppraisalResponse['status'],
      source: appraisal.source as AppraisalResponse['source'],
      createdBy: appraisal.createdBy,
      createdAt: new Date(appraisal.createdAt).toISOString(),
      criteria,
      employees: mappedEmployees,
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
}

interface CriterionSetLike {
  id: string;
  version: number;
}
