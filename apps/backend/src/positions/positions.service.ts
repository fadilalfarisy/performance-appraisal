import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponse, ok } from '../common/utils/response.util';
import { DbService } from '../db/db.service';
import { AuditService, type AuditEntry } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { PositionsRepository, type PositionRow } from './positions.repository';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionPayload } from './interfaces/position.interface';

@Injectable()
export class PositionsService {
  constructor(
    private readonly positionsRepository: PositionsRepository,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
  ) {}

  async findAll(): Promise<ApiResponse<PositionPayload[]>> {
    const positions = await this.positionsRepository.findAll();
    return ok(positions.map((p) => this.toPayload(p)));
  }

  async findOne(id: string): Promise<ApiResponse<PositionPayload>> {
    const position = await this.findOneOrFail(id);
    return ok(this.toPayload(position));
  }

  async create(dto: CreatePositionDto): Promise<ApiResponse<PositionPayload>> {
    const created = await this.dbService.transaction(async (tx) => {
      const row = await this.positionsRepository.createAndSave(dto, tx);
      if (!row) {
        throw new BadRequestException('Position could not be created');
      }
      await this.audit.record(tx, {
        action: 'POSITION_CREATED',
        entity: 'position',
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
    dto: UpdatePositionDto,
  ): Promise<ApiResponse<PositionPayload>> {
    const existing = await this.findOneOrFail(id);

    const updated = await this.dbService.transaction(async (tx) => {
      const row = await this.positionsRepository.updateAndSave(id, dto, tx);
      if (!row) {
        throw new NotFoundException(`Position with ID ${id} not found`);
      }
      await this.audit.record(tx, {
        action: 'POSITION_UPDATED',
        entity: 'position',
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

    const isLinked = await this.positionsRepository.isLinkedToEmployees(id);
    if (isLinked) {
      throw new BadRequestException('Cannot delete position linked to employees');
    }

    await this.dbService.transaction(async (tx) => {
      await this.positionsRepository.softDelete(id, tx);
      await this.audit.record(tx, {
        action: 'POSITION_DELETED',
        entity: 'position',
        entityId: id,
        before: this.toPayload(existing),
        ...this.actor(),
      });
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<PositionRow> {
    const position = await this.positionsRepository.findById(id);
    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }
    return position;
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

  private toPayload(position: PositionRow): PositionPayload {
    return {
      id: position.id,
      code: position.code,
      name: position.name,
      level: position.level,
      isActive: position.isActive,
    };
  }
}
