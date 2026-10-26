import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, type AuthenticatedUser } from '@appraisal/types';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { BusinessLogicException } from '../common/exceptions/custom.exceptions';
import { DbService } from '../db/db.service';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ScopeService } from '../common/scope/scope.service';
import { CriteriaService } from '../criteria/criteria.service';
import {
  DailyNotesRepository,
  type DailyNoteRow,
  type DailyNoteScope,
} from './daily-notes.repository';
import { CreateDailyNoteDto } from './dto/create-daily-note.dto';
import { UpdateDailyNoteDto } from './dto/update-daily-note.dto';
import { DailyNoteQueryDto } from './dto/daily-note-query.dto';
import { validateNoteValues } from './daily-note.validation';
import {
  AccessibleEmployeePayload,
  DailyNotePayload,
  DailyNoteValuePayload,
} from './interfaces/daily-note.interface';

type DailyNoteDetail = NonNullable<
  Awaited<ReturnType<DailyNotesRepository['findNoteDetail']>>
>;

@Injectable()
export class DailyNotesService {
  constructor(
    private readonly repository: DailyNotesRepository,
    private readonly criteriaService: CriteriaService,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
    private readonly scopeService: ScopeService,
  ) {}

  async findAll(
    query: DailyNoteQueryDto,
  ): Promise<ApiResponse<DailyNotePayload[]>> {
    const user = this.currentUser();
    const scope = await this.resolveScope(user);
    const [rows, total] = await this.repository.listNotes(query, scope);
    const values = await this.repository.valuesForNotes(
      rows.map((row) => row.id),
    );

    const data = rows.map((row) =>
      this.toResponse(
        row,
        values.filter((value) => value.noteId === row.id),
      ),
    );
    return paginated(data, {
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  async findOne(id: string): Promise<ApiResponse<DailyNotePayload>> {
    const user = this.currentUser();
    const scope = await this.resolveScope(user);

    const note = await this.findNoteOrFail(id);
    this.assertNoteInScope(scope, note);

    const detail = await this.repository.findNoteDetail(id);
    if (!detail) throw new NotFoundException(`Daily note ${id} not found`);
    const values = await this.repository.valuesForNotes([id]);
    return ok(
      this.toResponse(
        detail,
        values.filter((value) => value.noteId === id),
      ),
    );
  }

  async accessibleEmployees(): Promise<
    ApiResponse<AccessibleEmployeePayload[]>
  > {
    const user = this.currentUser();
    const scope = await this.resolveScope(user);

    const rows =
      scope.by === 'all'
        ? await this.repository.allEmployees()
        : scope.by === 'employee'
          ? await this.repository.subordinateEmployees(
              (user.employeeId as string) ?? '',
            )
          : await this.repository.employeesByDepartments(scope.ids);

    return ok(rows);
  }

  async create(dto: CreateDailyNoteDto): Promise<ApiResponse<DailyNotePayload>> {
    const user = this.currentUser();
    const scope = await this.resolveScope(user);

    const employee = await this.repository.findEmployee(dto.employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }
    this.assertEmployeeInScope(scope, employee);
    if (!employee.departmentId) {
      throw new BusinessLogicException(
        'Employee has no department, so a note cannot be recorded',
        'DAILY_NOTE_EMPLOYEE_NO_DEPARTMENT',
      );
    }

    const recordDate = dto.recordDate.slice(0, 10);
    const period = `${recordDate.slice(0, 7)}-01`;

    const set = (await this.criteriaService.findOne(dto.criteriaSetId)).data;
    if (set.status === 'DRAFT') {
      throw new BusinessLogicException(
        'A DRAFT criteria set cannot be used for a daily note',
        'DAILY_NOTE_CRITERIA_SET_DRAFT',
      );
    }
    if (
      set.departmentId !== null &&
      set.departmentId !== employee.departmentId
    ) {
      throw new BusinessLogicException(
        'The criteria set is not available for this employee department',
        'DAILY_NOTE_CRITERIA_SET_NOT_AVAILABLE',
      );
    }
    validateNoteValues(set.fields, dto.values);

    const created = await this.dbService.transaction(async (tx) => {
      const note = await this.repository.createNote(
        {
          employeeId: employee.id,
          departmentId: employee.departmentId as string,
          criteriaSetId: set.id,
          period,
          recordDate,
          createdBy: user.userId,
        },
        tx,
      );
      if (!note) {
        throw new ConflictException({
          message: 'A note already exists for this employee on this date',
          errorCode: 'DAILY_NOTE_ALREADY_EXISTS',
        });
      }

      await this.repository.insertValues(
        dto.values.map((value) => ({
          noteId: note.id,
          fieldId: value.fieldId,
          value: value.value ?? null,
        })),
        tx,
      );

      await this.audit.record(tx, {
        action: 'DAILY_NOTE_CREATED',
        entity: 'daily_note',
        entityId: note.id,
        after: {
          employeeId: employee.id,
          departmentId: employee.departmentId,
          recordDate,
        },
        ...this.actor(),
      });

      return note;
    });

    return this.findOne(created.id);
  }

  async update(
    id: string,
    dto: UpdateDailyNoteDto,
  ): Promise<ApiResponse<DailyNotePayload>> {
    const user = this.currentUser();
    const scope = await this.resolveScope(user);

    const note = await this.findNoteOrFail(id);
    this.assertNoteInScope(scope, note);

    const set = await this.criteriaService.findOne(note.criteriaSetId);
    validateNoteValues(set.data.fields, dto.values);

    await this.dbService.transaction(async (tx) => {
      await this.repository.replaceValues(
        note.id,
        dto.values.map((value) => ({
          noteId: note.id,
          fieldId: value.fieldId,
          value: value.value ?? null,
        })),
        tx,
      );
      await this.audit.record(tx, {
        action: 'DAILY_NOTE_UPDATED',
        entity: 'daily_note',
        entityId: note.id,
        after: { employeeId: note.employeeId, recordDate: note.recordDate },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const user = this.currentUser();
    const scope = await this.resolveScope(user);

    const note = await this.findNoteOrFail(id);
    this.assertNoteInScope(scope, note);

    await this.dbService.transaction(async (tx) => {
      await this.repository.softDeleteNote(note.id, user.userId, tx);
      await this.audit.record(tx, {
        action: 'DAILY_NOTE_DELETED',
        entity: 'daily_note',
        entityId: note.id,
        before: { employeeId: note.employeeId, recordDate: note.recordDate },
        ...this.actor(),
      });
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private currentUser(): AuthenticatedUser {
    const user = this.requestContext.getUser();
    if (!user) throw new ForbiddenException();
    return user;
  }

  private async resolveScope(user: AuthenticatedUser): Promise<DailyNoteScope> {
    const role = user.roles[0];
    if (role === UserRole.ADMIN) {
      return { by: 'all' };
    }
    if (role === UserRole.SUPERVISOR) {
      if (!user.employeeId) {
        throw new ForbiddenException('User is not linked to an employee');
      }
      const subordinates = await this.repository.subordinateEmployees(
        user.employeeId,
      );
      return { by: 'employee', ids: subordinates.map((row) => row.id) };
    }
    if (role === UserRole.HEAD_DEPARTMENT) {
      const scope = await this.scopeService.getDepartmentScope(user);
      // HEAD_DEPARTMENT is never a global scope role; 'ALL' is defensive only.
      return { by: 'department', ids: scope === 'ALL' ? [] : scope };
    }
    throw new ForbiddenException();
  }

  private assertEmployeeInScope(
    scope: DailyNoteScope,
    employee: { id: string; departmentId: string | null },
  ): void {
    if (scope.by === 'all') return;
    const okScope =
      scope.by === 'employee'
        ? scope.ids.includes(employee.id)
        : employee.departmentId !== null &&
          scope.ids.includes(employee.departmentId);
    if (!okScope) throw new NotFoundException();
  }

  private assertNoteInScope(scope: DailyNoteScope, note: DailyNoteRow): void {
    if (scope.by === 'all') return;
    const okScope =
      scope.by === 'employee'
        ? scope.ids.includes(note.employeeId)
        : scope.ids.includes(note.departmentId);
    if (!okScope) throw new NotFoundException();
  }

  private async findNoteOrFail(id: string): Promise<DailyNoteRow> {
    const note = await this.repository.findNote(id);
    if (!note) {
      throw new NotFoundException(`Daily note ${id} not found`);
    }
    return note;
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
    row: DailyNoteDetail,
    values: { fieldId: string; value: unknown }[],
  ): DailyNotePayload {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber ?? null,
      employeeName: row.employeeName ?? null,
      departmentId: row.departmentId ?? null,
      departmentName: row.departmentName ?? null,
      criteriaSetId: row.criteriaSetId,
      criteriaSetVersion: row.criteriaSetVersion ?? null,
      period: row.period,
      recordDate: row.recordDate,
      createdBy: row.createdBy ?? null,
      values: values.map(
        (value): DailyNoteValuePayload => ({
          fieldId: value.fieldId,
          value: value.value as DailyNoteValuePayload['value'],
        }),
      ),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }
}
