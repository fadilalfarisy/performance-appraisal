import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiResponse, ok } from '../common/utils/response.util';
import { DailyNotesRepository } from './daily-notes.repository';
import { CreateDailyNoteDto } from './dto/create-daily-note.dto';
import { UpdateDailyNoteDto } from './dto/update-daily-note.dto';
import { DailyNotePayload } from './interfaces/daily-note.interface';

@Injectable()
export class DailyNotesService {
  constructor(private readonly dailyNotesRepository: DailyNotesRepository) {}

  async findOne(id: string): Promise<ApiResponse<DailyNotePayload>> {
    const record = await this.findOneOrFail(id);
    return ok(this.toPayload(record));
  }

  async findAllByEmployee(employeeId: string): Promise<ApiResponse<DailyNotePayload[]>> {
    const records = await this.dailyNotesRepository.findAllByEmployee(employeeId);
    return ok(records.map((r) => this.toPayload(r)));
  }

  async findAllBySupervisor(supervisorId: string): Promise<ApiResponse<DailyNotePayload[]>> {
    const records = await this.dailyNotesRepository.findAllBySupervisor(supervisorId);
    return ok(records.map((r) => this.toPayload(r)));
  }

  async create(supervisorId: string, dto: CreateDailyNoteDto): Promise<ApiResponse<DailyNotePayload>> {
    const result = await this.dailyNotesRepository.createAndSave(supervisorId, dto);
    return ok(this.toPayload(result));
  }

  async update(id: string, supervisorId: string, dto: UpdateDailyNoteDto): Promise<ApiResponse<DailyNotePayload>> {
    const record = await this.findOneOrFail(id);

    if (record.supervisorId !== supervisorId) {
      throw new ForbiddenException('You can only update your own daily notes');
    }

    const updated = await this.dailyNotesRepository.updateAndSave(id, dto);
    return ok(this.toPayload(updated));
  }

  async remove(id: string, supervisorId: string): Promise<void> {
    const record = await this.findOneOrFail(id);

    if (record.supervisorId !== supervisorId) {
      throw new ForbiddenException('You can only delete your own daily notes');
    }

    await this.dailyNotesRepository.delete(id);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<any> {
    const record = await this.dailyNotesRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Daily note with ID ${id} not found`);
    }
    return record;
  }

  private toPayload(record: any): DailyNotePayload {
    return {
      id: record.id,
      employeeId: record.employeeId,
      supervisorId: record.supervisorId,
      recordDate: record.recordDate,
      description: record.description,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: new Date(record.updatedAt).toISOString(),
    };
  }
}
