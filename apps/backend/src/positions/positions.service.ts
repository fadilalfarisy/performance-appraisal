import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiResponse, ok, } from '../common/utils/response.util';
import { PositionsRepository } from './positions.repository';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionPayload } from './interfaces/position.interface';

@Injectable()
export class PositionsService {
  constructor(private readonly positionsRepository: PositionsRepository) { }

  async findAll(): Promise<ApiResponse<PositionPayload[]>> {
    const positions = await this.positionsRepository.findAll();
    return ok(positions.map((p) => this.toPayload(p)));
  }

  async findOne(id: string): Promise<ApiResponse<PositionPayload>> {
    const position = await this.findOneOrFail(id);
    return ok(this.toPayload(position));
  }

  async create(dto: CreatePositionDto): Promise<ApiResponse<PositionPayload>> {
    const result = await this.positionsRepository.createAndSave(dto);
    return ok(this.toPayload(result));
  }

  async update(id: string, dto: UpdatePositionDto): Promise<ApiResponse<PositionPayload>> {
    await this.findOneOrFail(id);
    const result = await this.positionsRepository.updateAndSave(id, dto);
    return ok(this.toPayload(result));
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrFail(id);

    const isLinked = await this.positionsRepository.isLinkedToEmployees(id);
    if (isLinked) {
      throw new BadRequestException('Cannot delete position linked to employees');
    }

    await this.positionsRepository.delete(id);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<any> {
    const position = await this.positionsRepository.findById(id);
    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }
    return position;
  }

  private toPayload(position: any): PositionPayload {
    return {
      id: position.id,
      name: position.name
    };
  }
}
