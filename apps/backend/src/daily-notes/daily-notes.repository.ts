import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import {
  criteriaSets,
  dailyNotes,
  dailyNoteValues,
  departments,
  employees,
} from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';
import type { DailyNoteQueryDto } from './dto/daily-note-query.dto';

export type DailyNoteRow = typeof dailyNotes.$inferSelect;

export type DailyNoteScope =
  | { by: 'employee'; ids: string[] }
  | { by: 'department'; ids: string[] }
  | { by: 'all' };

export function buildDailyNoteFilters(
  query: DailyNoteQueryDto,
  scope: DailyNoteScope,
): SQL[] {
  const { employeeId, departmentId, search, dateFrom, dateTo } = query;

  const filters: SQL[] = [notDeleted(dailyNotes)];
  if (employeeId) filters.push(eq(dailyNotes.employeeId, employeeId));
  if (departmentId) filters.push(eq(dailyNotes.departmentId, departmentId));
  if (dateFrom) filters.push(gte(dailyNotes.recordDate, dateFrom));
  if (dateTo) filters.push(lte(dailyNotes.recordDate, dateTo));
  if (search) {
    const term = `%${search}%`;
    const searchFilter = or(
      ilike(employees.employeeNumber, term),
      ilike(employees.fullName, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  if (scope.by === 'employee') {
    filters.push(
      scope.ids.length === 0
        ? sql`1 = 0`
        : inArray(dailyNotes.employeeId, scope.ids),
    );
  } else if (scope.by === 'department') {
    filters.push(
      scope.ids.length === 0
        ? sql`1 = 0`
        : inArray(dailyNotes.departmentId, scope.ids),
    );
  }

  return filters;
}

@Injectable()
export class DailyNotesRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async findEmployee(id: string, executor: DbExecutor = this.db) {
    const [row] = await executor
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        fullName: employees.fullName,
        departmentId: employees.departmentId,
        supervisorId: employees.supervisorId,
      })
      .from(employees)
      .where(and(eq(employees.id, id), notDeleted(employees)))
      .limit(1);
    return row ?? null;
  }

  async subordinateEmployees(supervisorEmployeeId: string) {
    return this.db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        fullName: employees.fullName,
        departmentId: employees.departmentId,
        departmentName: departments.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(employees.supervisorId, supervisorEmployeeId),
          notDeleted(employees),
        ),
      )
      .orderBy(asc(employees.fullName));
  }

  async allEmployees() {
    return this.db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        fullName: employees.fullName,
        departmentId: employees.departmentId,
        departmentName: departments.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(notDeleted(employees))
      .orderBy(asc(employees.fullName));
  }

  async employeesByDepartments(departmentIds: string[]) {
    if (departmentIds.length === 0) return [];
    return this.db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        fullName: employees.fullName,
        departmentId: employees.departmentId,
        departmentName: departments.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          inArray(employees.departmentId, departmentIds),
          notDeleted(employees),
        ),
      )
      .orderBy(asc(employees.fullName));
  }

  async findNote(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<DailyNoteRow | null> {
    const [row] = await executor
      .select()
      .from(dailyNotes)
      .where(and(eq(dailyNotes.id, id), notDeleted(dailyNotes)))
      .limit(1);
    return row ?? null;
  }

  async findNoteDetail(id: string) {
    const [row] = await this.db
      .select({
        id: dailyNotes.id,
        employeeId: dailyNotes.employeeId,
        employeeNumber: employees.employeeNumber,
        employeeName: employees.fullName,
        departmentId: dailyNotes.departmentId,
        departmentName: departments.name,
        criteriaSetId: dailyNotes.criteriaSetId,
        criteriaSetVersion: criteriaSets.version,
        period: dailyNotes.period,
        recordDate: dailyNotes.recordDate,
        createdBy: dailyNotes.createdBy,
        createdAt: dailyNotes.createdAt,
        updatedAt: dailyNotes.updatedAt,
      })
      .from(dailyNotes)
      .leftJoin(employees, eq(dailyNotes.employeeId, employees.id))
      .leftJoin(departments, eq(dailyNotes.departmentId, departments.id))
      .leftJoin(criteriaSets, eq(dailyNotes.criteriaSetId, criteriaSets.id))
      .where(and(eq(dailyNotes.id, id), notDeleted(dailyNotes)))
      .limit(1);
    return row ?? null;
  }

  async createNote(
    values: typeof dailyNotes.$inferInsert,
    executor: DbExecutor = this.db,
  ): Promise<DailyNoteRow | null> {
    const [row] = await executor
      .insert(dailyNotes)
      .values(values)
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  async insertValues(
    rows: (typeof dailyNoteValues.$inferInsert)[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    if (rows.length === 0) return;
    await executor.insert(dailyNoteValues).values(rows);
  }

  async replaceValues(
    noteId: string,
    rows: (typeof dailyNoteValues.$inferInsert)[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(dailyNoteValues)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(
        and(
          eq(dailyNoteValues.noteId, noteId),
          notDeleted(dailyNoteValues),
        ),
      );
    await this.insertValues(rows, executor);
  }

  async softDeleteNote(
    id: string,
    actorId: string | null,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(dailyNotes)
      .set({ isDeleted: true, deletedAt: new Date(), deletedBy: actorId })
      .where(eq(dailyNotes.id, id));
  }

  async listNotes(query: DailyNoteQueryDto, scope: DailyNoteScope) {
    const { page = 1, limit = 10 } = query;
    const where = and(...buildDailyNoteFilters(query, scope));

    const rows = await this.db
      .select({
        id: dailyNotes.id,
        employeeId: dailyNotes.employeeId,
        employeeNumber: employees.employeeNumber,
        employeeName: employees.fullName,
        departmentId: dailyNotes.departmentId,
        departmentName: departments.name,
        criteriaSetId: dailyNotes.criteriaSetId,
        criteriaSetVersion: criteriaSets.version,
        period: dailyNotes.period,
        recordDate: dailyNotes.recordDate,
        createdBy: dailyNotes.createdBy,
        createdAt: dailyNotes.createdAt,
        updatedAt: dailyNotes.updatedAt,
      })
      .from(dailyNotes)
      .leftJoin(employees, eq(dailyNotes.employeeId, employees.id))
      .leftJoin(departments, eq(dailyNotes.departmentId, departments.id))
      .leftJoin(criteriaSets, eq(dailyNotes.criteriaSetId, criteriaSets.id))
      .where(where)
      .orderBy(desc(dailyNotes.recordDate))
      .limit(limit)
      .offset((page - 1) * limit);

    const [total] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(dailyNotes)
      .leftJoin(employees, eq(dailyNotes.employeeId, employees.id))
      .where(where);

    return [rows, Number(total?.count ?? 0)] as const;
  }

  async valuesForNotes(noteIds: string[]) {
    if (noteIds.length === 0) return [];
    return this.db
      .select({
        noteId: dailyNoteValues.noteId,
        fieldId: dailyNoteValues.fieldId,
        value: dailyNoteValues.value,
      })
      .from(dailyNoteValues)
      .where(
        and(
          inArray(dailyNoteValues.noteId, noteIds),
          notDeleted(dailyNoteValues),
        ),
      );
  }
}
