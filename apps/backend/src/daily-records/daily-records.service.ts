import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiResponse, ok } from '../common/utils/response.util';
import { DailyRecordsRepository } from './daily-records.repository';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';
import { DailyRecordPayload } from './interfaces/daily-record.interface';

@Injectable()
export class DailyRecordsService {
  constructor(private readonly dailyRecordsRepository: DailyRecordsRepository) {}

  async findOne(id: string): Promise<ApiResponse<DailyRecordPayload>> {
    const record = await this.findOneOrFail(id);
    return ok(this.toPayload(record));
  }

  async findAllByEmployee(employeeId: string): Promise<ApiResponse<DailyRecordPayload[]>> {
    const records = await this.dailyRecordsRepository.findAllByEmployee(employeeId);
    return ok(records.map((r) => this.toPayload(r)));
  }

  async findAllBySupervisor(supervisorId: string): Promise<ApiResponse<DailyRecordPayload[]>> {
    const records = await this.dailyRecordsRepository.findAllBySupervisor(supervisorId);
    return ok(records.map((r) => this.toPayload(r)));
  }

  async create(supervisorId: string, dto: CreateDailyRecordDto): Promise<ApiResponse<DailyRecordPayload>> {
    const result = await this.dailyRecordsRepository.createAndSave(supervisorId, dto);
    return ok(this.toPayload(result));
  }

  async update(id: string, supervisorId: string, dto: UpdateDailyRecordDto): Promise<ApiResponse<DailyRecordPayload>> {
    const record = await this.findOneOrFail(id);
    
    if (record.supervisorId !== supervisorId) {
      throw new ForbiddenException('You can only update your own daily records');
    }

    const updated = await this.dailyRecordsRepository.updateAndSave(id, dto);
    return ok(this.toPayload(updated));
  }

  async remove(id: string, supervisorId: string): Promise<void> {
    const record = await this.findOneOrFail(id);
    
    if (record.supervisorId !== supervisorId) {
      throw new ForbiddenException('You can only delete your own daily records');
    }

    await this.dailyRecordsRepository.delete(id);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<any> {
    const record = await this.dailyRecordsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Daily record with ID ${id} not found`);
    }
    return record;
  }

  private toPayload(record: any): DailyRecordPayload {
    return {
      id: record.id,
      employeeId: record.employeeId,
      supervisorId: record.supervisorId,
      recordDate: record.recordDate,
      category: record.category,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
