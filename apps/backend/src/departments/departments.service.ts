import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { DbService } from '../db/db.service';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { DepartmentsRepository, type DepartmentRow } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { DepartmentPayload } from './interfaces/department.interface';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
  ) {}

  async findAll(
    query: DepartmentQueryDto,
  ): Promise<ApiResponse<DepartmentPayload[]>> {
    const [departments, total] =
      await this.departmentsRepository.findAllWithCount(query);
    return paginated(
      departments.map((d) => this.toPayload(d)),
      { total, limit: query.limit, page: query.page },
    );
  }

  async findOne(id: string): Promise<ApiResponse<DepartmentPayload>> {
    const department = await this.findOneOrFail(id);
    return ok(this.toPayload(department));
  }

  async create(
    dto: CreateDepartmentDto,
  ): Promise<ApiResponse<DepartmentPayload>> {
    const created = await this.dbService.transaction(async (tx) => {
      const row = await this.departmentsRepository.createAndSave(dto, tx);
      if (!row) {
        throw new BadRequestException('Department could not be created');
      }
      await this.audit.record(tx, {
        action: 'DEPARTMENT_CREATED',
        entity: 'department',
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
    dto: UpdateDepartmentDto,
  ): Promise<ApiResponse<DepartmentPayload>> {
    const existing = await this.findOneOrFail(id);

    const updated = await this.dbService.transaction(async (tx) => {
      const row = await this.departmentsRepository.updateAndSave(id, dto, tx);
      if (!row) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }
      await this.audit.record(tx, {
        action: 'DEPARTMENT_UPDATED',
        entity: 'department',
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

    const isLinked = await this.departmentsRepository.isLinkedToEmployees(id);
    if (isLinked) {
      throw new BadRequestException(
        'Cannot delete department linked to employees',
      );
    }

    await this.dbService.transaction(async (tx) => {
      await this.departmentsRepository.softDelete(id, tx);
      await this.audit.record(tx, {
        action: 'DEPARTMENT_DELETED',
        entity: 'department',
        entityId: id,
        before: this.toPayload(existing),
        ...this.actor(),
      });
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<DepartmentRow> {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
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

  private toPayload(department: DepartmentRow): DepartmentPayload {
    return {
      id: department.id,
      code: department.code,
      name: department.name,
      headEmployeeId: department.headEmployeeId ?? null,
      isActive: department.isActive,
      createdAt: new Date(department.createdAt).toISOString(),
      updatedAt: new Date(department.updatedAt).toISOString(),
    };
  }
}
