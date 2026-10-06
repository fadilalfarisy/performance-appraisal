import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

const HEADERS = [
  { header: 'employee_number', key: 'employeeNumber', width: 18 },
  { header: 'full_name', key: 'fullName', width: 26 },
  { header: 'gender', key: 'gender', width: 10 },
  { header: 'birth_date', key: 'birthDate', width: 14 },
  { header: 'join_date', key: 'joinDate', width: 14 },
  { header: 'address', key: 'address', width: 28 },
  { header: 'department_code', key: 'departmentCode', width: 18 },
  { header: 'position_code', key: 'positionCode', width: 16 },
  { header: 'status', key: 'status', width: 12 },
  { header: 'superior_number', key: 'superiorNumber', width: 18 },
];

function sanitize(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

interface ExportRow {
  employeeNumber: string;
  fullName: string;
  gender: string;
  birthDate: string;
  joinDate: string;
  address: string | null;
  departmentCode: string | null;
  positionCode: string | null;
  status: string;
  superiorNumber: string | null;
}

@Injectable()
export class EmployeesExcelService {
  async buildExport(rows: ExportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');
    sheet.columns = HEADERS;

    for (const row of rows) {
      sheet.addRow({
        employeeNumber: sanitize(row.employeeNumber),
        fullName: sanitize(row.fullName),
        gender: row.gender,
        birthDate: row.birthDate,
        joinDate: row.joinDate,
        address: sanitize(row.address ?? ''),
        departmentCode: row.departmentCode ?? '',
        positionCode: row.positionCode ?? '',
        status: row.status,
        superiorNumber: row.superiorNumber ?? '',
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');
    sheet.columns = HEADERS;
    sheet.addRow({
      employeeNumber: 'EMP0001',
      fullName: 'John Doe',
      gender: 'MALE',
      birthDate: '1990-01-01',
      joinDate: '2023-01-01',
      address: 'Jl. Merdeka No. 1',
      departmentCode: 'DEP001',
      positionCode: 'POS001',
      status: 'ACTIVE',
      superiorNumber: '',
    });

    const notes = workbook.addWorksheet('Notes');
    notes.addRow(['column', 'rule']);
    notes.addRow(['employee_number', 'Required, unique. Existing numbers are updated.']);
    notes.addRow(['full_name', 'Required.']);
    notes.addRow(['gender', 'Required. MALE | FEMALE.']);
    notes.addRow(['birth_date', 'Required. YYYY-MM-DD.']);
    notes.addRow(['join_date', 'Required. YYYY-MM-DD.']);
    notes.addRow(['address', 'Optional.']);
    notes.addRow(['department_code', 'Required. Must match an existing department code.']);
    notes.addRow(['position_code', 'Required. Must match an existing position code.']);
    notes.addRow(['status', 'Optional. ACTIVE | INACTIVE (default ACTIVE).']);
    notes.addRow(['superior_number', 'Optional. Employee number that exists in the DB or file.']);

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
