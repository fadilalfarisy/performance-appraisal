import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

const EXPORT_HEADERS = [
  { header: 'employee_number', key: 'employeeNumber', width: 18 },
  { header: 'employee_name', key: 'employeeName', width: 28 },
  { header: 'contract_type', key: 'contractType', width: 16 },
  { header: 'start_date', key: 'startDate', width: 14 },
  { header: 'end_date', key: 'endDate', width: 14 },
];

const TEMPLATE_HEADERS = [
  { header: 'employee_number', key: 'employeeNumber', width: 18 },
  { header: 'contract_type', key: 'contractType', width: 16 },
  { header: 'start_date', key: 'startDate', width: 14 },
  { header: 'end_date', key: 'endDate', width: 14 },
];

interface ExportRow {
  employeeNumber: string | null;
  employeeName: string | null;
  contractType: string;
  startDate: string;
  endDate: string | null;
}

/** Prefixes values that could be interpreted as formulas. */
function sanitize(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

@Injectable()
export class ContractsExcelService {
  async buildExport(rows: ExportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Contracts');
    sheet.columns = EXPORT_HEADERS;

    for (const row of rows) {
      sheet.addRow({
        employeeNumber: sanitize(row.employeeNumber ?? ''),
        employeeName: sanitize(row.employeeName ?? ''),
        contractType: row.contractType,
        startDate: row.startDate,
        endDate: row.endDate ?? '',
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Contracts');
    sheet.columns = TEMPLATE_HEADERS;
    sheet.addRow({
      employeeNumber: 'EMP0001',
      contractType: 'FIXED_TERM',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });

    const notes = workbook.addWorksheet('Notes');
    notes.addRow(['column', 'rule']);
    notes.addRow(['employee_number', 'Required. Must match an existing, non-deleted employee.']);
    notes.addRow(['contract_type', 'Required. PERMANENT | FIXED_TERM | PROBATION.']);
    notes.addRow(['start_date', 'Required. YYYY-MM-DD.']);
    notes.addRow(['end_date', 'Required unless PERMANENT. YYYY-MM-DD, on or after start_date.']);

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
