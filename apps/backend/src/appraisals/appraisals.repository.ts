import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNotNull,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import {
  appraisalEmployees,
  appraisalRatings,
  appraisalStatusHistory,
  appraisals,
  contracts,
  criteriaFields,
  criteriaSets,
  dailyNoteValues,
  dailyNotes,
  departments,
  employees,
  positions,
} from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';
import { FieldInputType, type AppraisalStatus } from '@appraisal/types';
import type { AppraisalQueryDto } from './dto/appraisal-query.dto';

export type AppraisalRow = typeof appraisals.$inferSelect;
export type AppraisalDetailRow = AppraisalRow & {
  criteriaSetVersion: number | null;
  criteriaSetStatus: string | null;
};
export type AppraisalEmployeeRow = typeof appraisalEmployees.$inferSelect;

@Injectable()
export class AppraisalsRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async findEligible(departmentId: string, start: string, end: string) {
    return this.db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        fullName: employees.fullName,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        positionId: employees.positionId,
        positionName: positions.name,
        contractId: contracts.id,
        contractType: contracts.contractType,
        contractStartDate: contracts.startDate,
        contractEndDate: contracts.endDate,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .innerJoin(
        contracts,
        and(
          eq(contracts.employeeId, employees.id),
          notDeleted(contracts),
          gte(contracts.endDate, start),
          lte(contracts.endDate, end),
        ),
      )
      .where(
        and(
          eq(employees.departmentId, departmentId),
          eq(employees.status, 'ACTIVE'),
          notDeleted(employees),
          sql`NOT EXISTS (
            SELECT 1 FROM appraisal_employees ae
            JOIN appraisals a ON a.id = ae.appraisal_id
            WHERE ae.employee_id = ${employees.id}
              AND a.period = ${start}
              AND a.status <> 'COMPLETE'
              AND a.deleted_at IS NULL
              AND ae.deleted_at IS NULL
          )`,
        ),
      )
      .orderBy(asc(employees.fullName));
  }

  async findActiveDepartments(executor: DbExecutor = this.db) {
    return executor
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(and(eq(departments.isActive, true), notDeleted(departments)))
      .orderBy(asc(departments.name));
  }

  async createAppraisal(
    values: {
      departmentId: string;
      period: string;
      criteriaSetId: string;
      source: 'MANUAL' | 'SCHEDULER';
      createdBy: string | null;
    },
    executor: DbExecutor = this.db,
  ): Promise<AppraisalRow | null> {
    const [row] = await executor
      .insert(appraisals)
      .values(values)
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  async insertEmployees(
    rows: (typeof appraisalEmployees.$inferInsert)[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    if (rows.length === 0) return;
    await executor.insert(appraisalEmployees).values(rows);
  }

  async findAppraisal(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<AppraisalDetailRow | null> {
    const [row] = await executor
      .select({
        ...getTableColumns(appraisals),
        criteriaSetVersion: criteriaSets.version,
        criteriaSetStatus: criteriaSets.status,
      })
      .from(appraisals)
      .leftJoin(criteriaSets, eq(appraisals.criteriaSetId, criteriaSets.id))
      .where(and(eq(appraisals.id, id), notDeleted(appraisals)))
      .limit(1);
    return row ?? null;
  }

  async lockAppraisal(
    id: string,
    executor: DbExecutor,
  ): Promise<AppraisalRow | null> {
    const [row] = await executor
      .select()
      .from(appraisals)
      .where(and(eq(appraisals.id, id), notDeleted(appraisals)))
      .limit(1)
      .for('update');
    return row ?? null;
  }

  async departmentName(id: string): Promise<string | null> {
    const [row] = await this.db
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    return row?.name ?? null;
  }

  async listAppraisals(query: AppraisalQueryDto, scopeDepartmentIds?: string[]) {
    const { page = 1, limit = 20, status, department, periodFrom, periodTo } =
      query;

    const filters: SQL[] = [notDeleted(appraisals)];
    if (status) filters.push(eq(appraisals.status, status));
    if (department) filters.push(eq(appraisals.departmentId, department));
    if (periodFrom) filters.push(gte(appraisals.period, periodFrom));
    if (periodTo) filters.push(lte(appraisals.period, periodTo));
    if (scopeDepartmentIds) {
      filters.push(
        scopeDepartmentIds.length === 0
          ? sql`1 = 0`
          : inArray(appraisals.departmentId, scopeDepartmentIds),
      );
    }
    const where = and(...filters);

    const rows = await this.db
      .select({
        id: appraisals.id,
        departmentId: appraisals.departmentId,
        departmentName: departments.name,
        period: appraisals.period,
        criteriaSetId: appraisals.criteriaSetId,
        criteriaSetVersion: criteriaSets.version,
        criteriaSetStatus: criteriaSets.status,
        status: appraisals.status,
        source: appraisals.source,
        createdBy: appraisals.createdBy,
        createdAt: appraisals.createdAt,
      })
      .from(appraisals)
      .leftJoin(departments, eq(appraisals.departmentId, departments.id))
      .leftJoin(criteriaSets, eq(appraisals.criteriaSetId, criteriaSets.id))
      .where(where)
      .orderBy(desc(appraisals.period))
      .limit(limit)
      .offset((page - 1) * limit);

    const [total] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(appraisals)
      .where(where);

    return [rows, Number(total?.count ?? 0)] as const;
  }

  async findEmployees(
    appraisalId: string,
    executor: DbExecutor = this.db,
  ): Promise<AppraisalEmployeeRow[]> {
    return executor
      .select()
      .from(appraisalEmployees)
      .where(
        and(
          eq(appraisalEmployees.appraisalId, appraisalId),
          notDeleted(appraisalEmployees),
        ),
      )
      .orderBy(asc(appraisalEmployees.employeeName));
  }

  async findEmployeeById(
    id: string,
    appraisalId: string,
    executor: DbExecutor = this.db,
  ): Promise<AppraisalEmployeeRow | null> {
    const [row] = await executor
      .select()
      .from(appraisalEmployees)
      .where(
        and(
          eq(appraisalEmployees.id, id),
          eq(appraisalEmployees.appraisalId, appraisalId),
          notDeleted(appraisalEmployees),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async dailyNoteSums(appraisalId: string) {
    const numericValue = sql<number>`CASE
      WHEN jsonb_typeof(${dailyNoteValues.value}) = 'number'
        THEN (${dailyNoteValues.value} #>> '{}')::numeric
      ELSE 0
    END`;

    const rows = await this.db
      .select({
        appraisalEmployeeId: appraisalEmployees.id,
        total: sql<number>`COALESCE(SUM(${numericValue}), 0)`,
      })
      .from(appraisalEmployees)
      .innerJoin(
        dailyNotes,
        and(
          eq(dailyNotes.employeeId, appraisalEmployees.employeeId),
          eq(dailyNotes.departmentId, appraisalEmployees.departmentId),
          gte(dailyNotes.recordDate, appraisalEmployees.contractStartDate),
          lte(dailyNotes.recordDate, appraisalEmployees.contractEndDate),
          notDeleted(dailyNotes),
        ),
      )
      .innerJoin(
        dailyNoteValues,
        and(
          eq(dailyNoteValues.noteId, dailyNotes.id),
          notDeleted(dailyNoteValues),
        ),
      )
      .innerJoin(
        criteriaFields,
        and(
          eq(criteriaFields.id, dailyNoteValues.fieldId),
          eq(criteriaFields.inputType, FieldInputType.NUMBER),
        ),
      )
      .where(
        and(
          eq(appraisalEmployees.appraisalId, appraisalId),
          isNotNull(appraisalEmployees.contractStartDate),
          isNotNull(appraisalEmployees.contractEndDate),
          notDeleted(appraisalEmployees),
        ),
      )
      .groupBy(appraisalEmployees.id);

    return rows.map((row) => ({
      appraisalEmployeeId: row.appraisalEmployeeId,
      total: Number(row.total ?? 0),
    }));
  }

  async removeEmployees(
    appraisalId: string,
    ids: string[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    if (ids.length === 0) return;
    await executor
      .update(appraisalEmployees)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(
        and(
          eq(appraisalEmployees.appraisalId, appraisalId),
          inArray(appraisalEmployees.employeeId, ids),
        ),
      );
  }

  async ratingsForAppraisal(
    appraisalId: string,
    executor: DbExecutor = this.db,
  ) {
    return executor
      .select({
        appraisalEmployeeId: appraisalRatings.appraisalEmployeeId,
        criterionId: appraisalRatings.criterionId,
        rating: appraisalRatings.rating,
      })
      .from(appraisalRatings)
      .innerJoin(
        appraisalEmployees,
        eq(appraisalRatings.appraisalEmployeeId, appraisalEmployees.id),
      )
      .where(
        and(
          eq(appraisalEmployees.appraisalId, appraisalId),
          notDeleted(appraisalRatings),
          notDeleted(appraisalEmployees),
        ),
      );
  }

  async upsertRatings(
    rows: { appraisalEmployeeId: string; criterionId: string; rating: number; updatedBy: string | null }[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    for (const row of rows) {
      await executor
        .insert(appraisalRatings)
        .values(row)
        .onConflictDoUpdate({
          target: [
            appraisalRatings.appraisalEmployeeId,
            appraisalRatings.criterionId,
          ],
          set: {
            rating: row.rating,
            updatedBy: row.updatedBy,
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
          },
        });
    }
  }

  async updateEmployeeTotalScore(
    id: string,
    totalScore: number | null,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(appraisalEmployees)
      .set({ totalScore })
      .where(eq(appraisalEmployees.id, id));
  }

  async updateEmployeeComment(
    id: string,
    comment: string,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(appraisalEmployees)
      .set({ comment })
      .where(eq(appraisalEmployees.id, id));
  }

  async updateStatus(
    id: string,
    status: AppraisalStatus,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(appraisals)
      .set({ status })
      .where(eq(appraisals.id, id));
  }

  async insertHistory(
    values: {
      appraisalId: string;
      fromStatus: AppraisalStatus | null;
      toStatus: AppraisalStatus;
      action: 'TRANSITION' | 'SEND_BACK' | 'REOPEN';
      comment: string | null;
      actorUserId: string | null;
    },
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor.insert(appraisalStatusHistory).values(values);
  }

  async history(appraisalId: string) {
    return this.db
      .select()
      .from(appraisalStatusHistory)
      .where(eq(appraisalStatusHistory.appraisalId, appraisalId))
      .orderBy(asc(appraisalStatusHistory.createdAt));
  }

  async softDelete(
    id: string,
    actorId: string | null,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(appraisals)
      .set({ isDeleted: true, deletedAt: new Date(), deletedBy: actorId })
      .where(eq(appraisals.id, id));
  }
}
