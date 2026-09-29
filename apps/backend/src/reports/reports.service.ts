import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiResponse, ok } from '../common/utils/response.util';
import { ReportsRepository } from './reports.repository';
import { ReportStatus } from './reports.enum';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) { }

  async findOne(id: string): Promise<ApiResponse<any>> {
    const report = await this.findOneOrFail(id);
    return ok(report);
  }

  // ── Approval Workflow ──────────────────────────────────────────────────────

  async hrApprove(id: string, approverId: string): Promise<ApiResponse<any>> {
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException(
        'Report must be in PENDING status for HR approval',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.SUBMITTED,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.APPROVED,
    );
    return ok(updated);
  }

  async hrReject(
    id: string,
    approverId: string,
    note: string,
  ): Promise<ApiResponse<any>> {
    if (!note) throw new BadRequestException('Note is required for rejection');
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException(
        'Report must be in PENDING status for HR rejection',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.DRAFT,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.REJECTED,
      note,
    );
    return ok(updated);
  }

  async hodApprove(id: string, approverId: string): Promise<ApiResponse<any>> {
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.SUBMITTED) {
      throw new BadRequestException(
        'Report must be in SUBMITTED status for HOD approval',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.APPROVED,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.APPROVED,
    );
    return ok(updated);
  }

  async hodReject(
    id: string,
    approverId: string,
    note: string,
  ): Promise<ApiResponse<any>> {
    if (!note) throw new BadRequestException('Note is required for rejection');
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.SUBMITTED) {
      throw new BadRequestException(
        'Report must be in SUBMITTED status for HOD rejection',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.PENDING,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.REJECTED,
      note,
    );
    return ok(updated);
  }

  async managerApprove(
    id: string,
    approverId: string,
  ): Promise<ApiResponse<any>> {
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.APPROVED) {
      throw new BadRequestException(
        'Report must be in APPROVED status for Manager approval',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.PENDING,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.APPROVED,
    );
    return ok(updated);
  }

  async managerReject(
    id: string,
    approverId: string,
    note: string,
  ): Promise<ApiResponse<any>> {
    if (!note) throw new BadRequestException('Note is required for rejection');
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.APPROVED) {
      throw new BadRequestException(
        'Report must be in APPROVED status for Manager rejection',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.SUBMITTED,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.REJECTED,
      note,
    );
    return ok(updated);
  }

  async gmApprove(id: string, approverId: string): Promise<ApiResponse<any>> {
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException(
        'Report must be in GM_REVIEW status for GM approval',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.DONE,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.APPROVED,
    );
    return ok(updated);
  }

  async gmReject(
    id: string,
    approverId: string,
    note: string,
  ): Promise<ApiResponse<any>> {
    if (!note) throw new BadRequestException('Note is required for rejection');
    const report = await this.findOneOrFail(id);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException(
        'Report must be in GM_REVIEW status for GM rejection',
      );
    }

    const updated = await this.reportsRepository.updateStatus(
      id,
      ReportStatus.APPROVED,
    );
    await this.reportsRepository.createApproval(
      id,
      approverId,
      ReportStatus.REJECTED,
      note,
    );
    return ok(updated);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<any> {
    const report = await this.reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }
}
