import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import { contracts, employees } from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractQueryDto } from './dto/contract-query.dto';

export type ContractRow = typeof contracts.$inferSelect;

@Injectable()
export class ContractsRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async findById(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<ContractRow | null> {
    const [result] = await executor
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), notDeleted(contracts)))
      .limit(1);
    return result ?? null;
  }

  async findAllWithCount(query: ContractQueryDto) {
    const { page = 1, limit = 20, employeeId, contractType } = query;

    const filters: SQL[] = [notDeleted(contracts)];
    if (employeeId) filters.push(eq(contracts.employeeId, employeeId));
    if (contractType) filters.push(eq(contracts.contractType, contractType));
    const where = and(...filters);

    const rows = await this.db
      .select({
        id: contracts.id,
        employeeId: contracts.employeeId,
        contractType: contracts.contractType,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        employee: {
          id: employees.id,
          fullName: employees.fullName,
          employeeNumber: employees.employeeNumber,
        },
      })
      .from(contracts)
      .leftJoin(employees, eq(contracts.employeeId, employees.id))
      .where(where)
      .orderBy(desc(contracts.startDate))
      .limit(limit)
      .offset((page - 1) * limit);

    const [total] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(where);

    return [rows, Number(total?.count ?? 0)] as const;
  }

  async createAndSave(dto: CreateContractDto, executor: DbExecutor = this.db) {
    const [result] = await executor
      .insert(contracts)
      .values(dto)
      .returning();
    return result ?? null;
  }

  async updateAndSave(
    id: string,
    dto: UpdateContractDto,
    executor: DbExecutor = this.db,
  ) {
    const [result] = await executor
      .update(contracts)
      .set(dto)
      .where(and(eq(contracts.id, id), notDeleted(contracts)))
      .returning();
    return result ?? null;
  }

  async softDelete(id: string, executor: DbExecutor = this.db) {
    const [result] = await executor
      .update(contracts)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(and(eq(contracts.id, id), notDeleted(contracts)))
      .returning();
    return result ?? null;
  }

  async findEmployeesByNumbers(numbers: string[]) {
    if (numbers.length === 0) return [];
    return this.db
      .select({ id: employees.id, employeeNumber: employees.employeeNumber })
      .from(employees)
      .where(
        and(
          inArray(employees.employeeNumber, numbers),
          notDeleted(employees),
        ),
      );
  }

  async findByEmployeeIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.db
      .select({
        id: contracts.id,
        employeeId: contracts.employeeId,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
      })
      .from(contracts)
      .where(
        and(
          inArray(contracts.employeeId, ids),
          notDeleted(contracts),
        ),
      );
  }

  async findByEmployeeAndStart(
    employeeId: string,
    startDate: string,
    executor: DbExecutor = this.db,
  ) {
    const [row] = await executor
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.employeeId, employeeId),
          eq(contracts.startDate, startDate),
          notDeleted(contracts),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findForExport(query: ContractQueryDto) {
    const { employeeId, contractType, search } = query;

    const filters: SQL[] = [notDeleted(contracts)];
    if (employeeId) filters.push(eq(contracts.employeeId, employeeId));
    if (contractType) filters.push(eq(contracts.contractType, contractType));
    if (search) {
      const searchFilter = or(
        ilike(employees.fullName, `%${search}%`),
        ilike(employees.employeeNumber, `%${search}%`),
      );
      if (searchFilter) filters.push(searchFilter);
    }

    return this.db
      .select({
        employeeNumber: employees.employeeNumber,
        employeeName: employees.fullName,
        contractType: contracts.contractType,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
      })
      .from(contracts)
      .leftJoin(employees, eq(contracts.employeeId, employees.id))
      .where(and(...filters))
      .orderBy(desc(contracts.startDate));
  }
}
