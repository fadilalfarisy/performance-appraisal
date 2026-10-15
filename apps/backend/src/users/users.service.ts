import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiResponse, ok } from '../common/utils/response.util';
import { DbService } from '../db/db.service';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { UsersRepository, type UserUpdate } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPayload } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
  ) {}

  async findAll(): Promise<ApiResponse<UserPayload[]>> {
    const rows = await this.usersRepository.findAll();
    const departments = await this.usersRepository.departmentsByUserIds(
      rows.map((row) => row.id),
    );
    return ok(rows.map((row) => this.toPayload(row, departments[row.id] ?? [])));
  }

  async findOne(id: string): Promise<ApiResponse<UserPayload>> {
    const row = await this.findOneOrFail(id);
    const departments = await this.usersRepository.departmentsByUserId(id);
    return ok(this.toPayload(row, departments));
  }

  async create(dto: CreateUserDto): Promise<ApiResponse<UserPayload>> {
    if (await this.usersRepository.existsByUsername(dto.username)) {
      throw new ConflictException({
        message: 'Username already exists',
        errorCode: 'USER_USERNAME_ALREADY_EXISTS',
      });
    }

    const password = await bcrypt.hash(dto.password, 10);

    const created = await this.dbService.transaction(async (tx) => {
      const user = await this.usersRepository.createAndSave(
        {
          username: dto.username,
          password,
          role: dto.role,
          employeeId: dto.employeeId ?? null,
        },
        tx,
      );
      if (!user) {
        throw new ConflictException({ message: 'User registration failed' });
      }
      await this.usersRepository.setDepartments(
        user.id,
        dto.departmentIds ?? [],
        tx,
      );
      await this.audit.record(tx, {
        action: 'USER_CREATED',
        entity: 'user',
        entityId: user.id,
        after: { username: dto.username, role: dto.role },
        ...this.actor(),
      });
      return user.id;
    });

    return this.findOne(created);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<ApiResponse<UserPayload>> {
    await this.findOneOrFail(id);

    await this.dbService.transaction(async (tx) => {
      const values: UserUpdate = {};
      if (dto.role !== undefined) values.role = dto.role;
      if (dto.employeeId !== undefined) values.employeeId = dto.employeeId ?? null;
      if (dto.isActive !== undefined) values.isActive = dto.isActive;

      if (Object.keys(values).length > 0) {
        await this.usersRepository.updateAndSave(id, values, tx);
      }
      if (dto.departmentIds !== undefined) {
        await this.usersRepository.setDepartments(id, dto.departmentIds, tx);
      }
      await this.audit.record(tx, {
        action: 'USER_UPDATED',
        entity: 'user',
        entityId: id,
        after: values,
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  async setStatus(id: string, isActive: boolean): Promise<ApiResponse<UserPayload>> {
    await this.findOneOrFail(id);

    await this.dbService.transaction(async (tx) => {
      await this.usersRepository.updateAndSave(id, { isActive }, tx);
      await this.audit.record(tx, {
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity: 'user',
        entityId: id,
        after: { isActive },
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  async resetPassword(
    id: string,
    password: string,
  ): Promise<ApiResponse<UserPayload>> {
    await this.findOneOrFail(id);
    const hashed = await bcrypt.hash(password, 10);

    await this.dbService.transaction(async (tx) => {
      await this.usersRepository.updateAndSave(id, { password: hashed }, tx);
      await this.audit.record(tx, {
        action: 'USER_PASSWORD_RESET',
        entity: 'user',
        entityId: id,
        ...this.actor(),
      });
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrFail(id);

    await this.dbService.transaction(async (tx) => {
      await this.usersRepository.softDelete(id, tx);
      await this.audit.record(tx, {
        action: 'USER_DELETED',
        entity: 'user',
        entityId: id,
        ...this.actor(),
      });
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string) {
    const row = await this.usersRepository.findById(id);
    if (!row) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return row;
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

  private toPayload(
    row: {
      id: string;
      username: string;
      role: string;
      isActive: boolean;
      employee: { id: string | null; fullName: string | null } | null;
    },
    departments: UserPayload['departments'],
  ): UserPayload {
    return {
      id: row.id,
      username: row.username,
      role: row.role as UserPayload['role'],
      isActive: row.isActive,
      employee: row.employee?.id
        ? { id: row.employee.id, fullName: row.employee.fullName ?? '' }
        : null,
      departments,
    };
  }
}
