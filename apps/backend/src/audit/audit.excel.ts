import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { sanitizeCell } from '../common/utils/excel.util';
import type { AuditLogRow } from './audit.repository';

const HEADERS = [
  { header: 'occurred_at', key: 'occurredAt', width: 24 },
  { header: 'actor_type', key: 'actorType', width: 12 },
  { header: 'username', key: 'username', width: 20 },
  { header: 'role', key: 'role', width: 16 },
  { header: 'employee_number', key: 'employeeNumber', width: 18 },
  { header: 'action', key: 'action', width: 28 },
  { header: 'entity', key: 'entity', width: 18 },
  { header: 'entity_id', key: 'entityId', width: 38 },
  { header: 'ip_address', key: 'ipAddress', width: 18 },
  { header: 'request_id', key: 'requestId', width: 38 },
  { header: 'before', key: 'before', width: 40 },
  { header: 'after', key: 'after', width: 40 },
  { header: 'metadata', key: 'metadata', width: 40 },
];

function text(value: string | null): string {
  return sanitizeCell(value ?? '');
}

function json(value: unknown): string {
  if (value === null || value === undefined) return '';
  return sanitizeCell(
    typeof value === 'string' ? value : JSON.stringify(value),
  );
}

@Injectable()
export class AuditExcelService {
  async buildExport(rows: AuditLogRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit Trail');
    sheet.columns = HEADERS;

    for (const row of rows) {
      sheet.addRow({
        occurredAt: row.occurredAt.toISOString(),
        actorType: row.actorType,
        username: text(row.username),
        role: text(row.role),
        employeeNumber: text(row.employeeNumber),
        action: sanitizeCell(row.action),
        entity: text(row.entity),
        entityId: text(row.entityId),
        ipAddress: text(row.ipAddress),
        requestId: text(row.requestId),
        before: json(row.beforeData),
        after: json(row.afterData),
        metadata: json(row.metadata),
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
