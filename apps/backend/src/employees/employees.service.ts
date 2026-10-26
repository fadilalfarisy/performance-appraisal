import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { DbService } from '../db/db.service';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ScopeService } from '../common/scope/scope.service';
import { EmployeesRepository } from './employees.repository';
import { ContractsRepository } from '../contracts/contracts.repository';
import { EmployeeImporter } from './employees.importer';
import { EmployeesExcelService } from './employees.excel';
import { ImportService } from '../imports/import.service';
import type { UploadedFileLike } from '../imports/import.types';
import type { ImportResult } from '@appraisal/types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { EmployeePayload } from './interfaces/employee.interface';

const SORT_COLUMNS: Record<string, string> = {
  employeeNumber: 'e.employee_number',
  fullName: 'e.full_name',
  department: 'd.name',
  position: 'p.name',
  status: 'e.status',
  createdAt: 'e.created_at',
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly contractsRepository: ContractsRepository,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
    private readonly scopeService: ScopeService,
    private readonly importService: ImportService,
    private readonly employeeImporter: EmployeeImporter,
    private readonly excel: EmployeesExcelService,
  ) {}

  async findAllEmployees(
    query: QueryEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload[]>> {
    const {
      page = 1,
      limit = 10,
      sortBy,
      orderBy,
      search,
      department,
      position,
      status,
      contractStartFrom,
      contractStartTo,
      contractEndFrom,
      contractEndTo,
    } = query;

    const offset = (page - 1) * limit;
    const column = SORT_COLUMNS[sortBy] ?? 'e.employee_number';
    const direction = orderBy === 'asc' ? sql`ASC` : sql`DESC`;
    const orderClause = sql`${sql.raw(column)} ${direction}`;

    const whereParts: SQL[] = [sql`e.deleted_at IS NULL`];

    if (search) {
      whereParts.push(
        sql`(e.full_name ILIKE ${'%' + search + '%'} OR e.employee_number ILIKE ${'%' + search + '%'})`,
      );
    }
    if (department) whereParts.push(sql`e.department_id = ${department}`);
    if (position) whereParts.push(sql`e.position_id = ${position}`);
    if (status) whereParts.push(sql`e.status = ${status}`);
    if (contractStartFrom || contractStartTo) {
      const firstStart = sql`(
        SELECT MIN(fc.start_date)
        FROM contracts fc
        WHERE fc.employee_id = e.id
          AND fc.deleted_at IS NULL
      )`;
      if (contractStartFrom) {
        whereParts.push(sql`${firstStart} >= ${contractStartFrom}`);
      }
      if (contractStartTo) {
        whereParts.push(sql`${firstStart} <= ${contractStartTo}`);
      }
    }
    if (contractEndFrom) {
      whereParts.push(sql`c.end_date >= ${contractEndFrom}`);
    }
    if (contractEndTo) {
      whereParts.push(sql`c.end_date <= ${contractEndTo}`);
    }

    const user = this.requestContext.getUser();
    if (user) {
      const scope = await this.scopeService.getDepartmentScope(user);
      if (scope !== 'ALL') {
        whereParts.push(
          scope.length === 0
            ? sql`1 = 0`
            : sql`e.department_id IN (${sql.join(
                scope.map((id) => sql`${id}`),
                sql`, `,
              )})`,
        );
      }
    }

    const whereClause = sql.join(whereParts, sql` AND `);

    const [result, total] = await Promise.all([
      this.employeesRepository.findAllWithRelationAndQuery(
        whereClause,
        orderClause,
        limit,
        offset,
      ),
      this.employeesRepository.countEmployees(whereClause),
    ]);

    return paginated(result as unknown as EmployeePayload[], {
      total,
      page,
      limit,
    });
  }

  async findOneEmployee(id: string): Promise<ApiResponse<EmployeePayload>> {
    const employee = await this.findOneRowOrFail(id);
    return ok(this.toResponseEmployee(employee));
  }

  async createEmployee(
    dto: CreateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    const { contracts, ...employeeData } = dto;

    const saved = await this.dbService.transaction(async (tx) => {
      const employee = await this.employeesRepository.createAndSave(
        employeeData,
        tx,
      );
      if (!employee) {
        throw new BadRequestException('Failed to create employee');
      }

      for (const contract of contracts ?? []) {
        const savedContract = await this.contractsRepository.createAndSave(
          { employeeId: employee.id, ...contract },
          tx,
        );
        if (!savedContract) {
          throw new BadRequestException('Contract could not be created');
        }
        await this.audit.record(tx, {
          action: 'CONTRACT_CREATED',
          entity: 'contract',
          entityId: savedContract.id,
          after: {
            employeeId: savedContract.employeeId,
            contractType: savedContract.contractType,
            startDate: savedContract.startDate,
            endDate: savedContract.endDate ?? null,
          },
          ...this.actor(),
        });
      }

      const full = await this.employeesRepository.findOneWithRelations(
        employee.id,
        tx,
      );
      await this.audit.record(tx, {
        action: 'EMPLOYEE_CREATED',
        entity: 'employee',
        entityId: employee.id,
        after: full,
        ...this.actor(),
      });
      return full;
    });

    return ok(this.toResponseEmployee(saved));
  }

  async updateEmployee(
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    const existing = await this.findOneRowOrFail(id);

    const updated = await this.dbService.transaction(async (tx) => {
      const row = await this.employeesRepository.updateAndSave(id, dto, tx);
      if (!row) {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }
      const full = await this.employeesRepository.findOneWithRelations(id, tx);
      await this.audit.record(tx, {
        action: 'EMPLOYEE_UPDATED',
        entity: 'employee',
        entityId: id,
        before: existing,
        after: full,
        ...this.actor(),
      });
      return full;
    });

    return ok(this.toResponseEmployee(updated));
  }

  async removeEmployee(id: string): Promise<void> {
    const existing = await this.findOneRowOrFail(id);

    const isLinked = await this.employeesRepository.isLinkedToUsers(id);
    if (isLinked) {
      throw new BadRequestException('Cannot delete employee linked to users');
    }

    await this.dbService.transaction(async (tx) => {
      await this.employeesRepository.softDelete(id, tx);
      await this.audit.record(tx, {
        action: 'EMPLOYEE_DELETED',
        entity: 'employee',
        entityId: id,
        before: existing,
        ...this.actor(),
      });
    });
  }

  // ── Excel import / export ──────────────────────────────────────────────────

  async exportEmployees(): Promise<Buffer> {
    const rows = await this.employeesRepository.findForExport();
    return this.excel.buildExport(rows);
  }

  async buildTemplate(): Promise<Buffer> {
    return this.excel.buildTemplate();
  }

  async importEmployees(
    file: UploadedFileLike | undefined,
  ): Promise<ApiResponse<ImportResult>> {
    const result = await this.importService.run(
      file,
      this.employeeImporter,
      'employee',
    );
    return ok(result);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneRowOrFail(
    id: string,
  ): Promise<Record<string, unknown>> {
    const employee = await this.employeesRepository.findOneWithRelations(id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const user = this.requestContext.getUser();
    if (user) {
      const scope = await this.scopeService.getDepartmentScope(user);
      if (scope !== 'ALL') {
        const department = employee.department as { id?: string } | null;
        if (!department?.id || !scope.includes(department.id)) {
          throw new NotFoundException(`Employee with ID ${id} not found`);
        }
      }
    }

    return employee;
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

  private toResponseEmployee(employee: any): EmployeePayload {
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      birthDate: employee.birthDate,
      joinDate: employee.joinDate,
      gender: employee.gender,
      supervisor: employee.supervisor
        ? { id: employee.supervisor.id, fullName: employee.supervisor.fullName }
        : null,
      position: employee.position ?? null,
      department: employee.department ?? null,
      status: employee.status,
      address: employee.address,
      contract: employee.contract ?? null,
      contractStartDate: employee.contractStartDate ?? null,
    };
  }
}
