import { Injectable } from '@nestjs/common';
import type { EmployeeStatus, GenderEnum, ImportResult } from '@appraisal/types';
import type { DbExecutor } from '../db/db.type';
import {
  importError,
  type ImportRow,
  type ImportStrategy,
} from '../imports/import.types';
import { EmployeesRepository } from './employees.repository';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';

const GENDERS = ['MALE', 'FEMALE'];
const STATUSES = ['ACTIVE', 'INACTIVE'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface ParsedEmployee {
  row: number;
  employeeNumber: string;
  fullName: string;
  gender: string;
  birthDate: string;
  joinDate: string;
  address: string;
  departmentCode: string;
  positionCode: string;
  status: string;
  supervisorNumber: string;
}

@Injectable()
export class EmployeeImporter implements ImportStrategy {
  readonly expectedHeaders = [
    'employee_number',
    'full_name',
    'gender',
    'birth_date',
    'join_date',
    'address',
    'department_code',
    'position_code',
    'status',
    'supervisor_number',
  ];

  constructor(private readonly repository: EmployeesRepository) {}

  async validate(rows: ImportRow[]): Promise<void> {
    const parsed = this.parse(rows);

    const departmentCodes = [
      ...new Set(parsed.map((p) => p.departmentCode).filter(Boolean)),
    ];
    const positionCodes = [
      ...new Set(parsed.map((p) => p.positionCode).filter(Boolean)),
    ];
    const numbers = [
      ...new Set(parsed.map((p) => p.employeeNumber).filter(Boolean)),
    ];

    const [departments, positions, existing] = await Promise.all([
      this.repository.findDepartmentIdsByCodes(departmentCodes),
      this.repository.findPositionIdsByCodes(positionCodes),
      this.repository.findIdsByNumbers(numbers),
    ]);
    const departmentSet = new Set(departments.map((d) => d.code));
    const positionSet = new Set(positions.map((p) => p.code));
    const knownNumbers = new Set([
      ...existing.map((e) => e.employeeNumber),
      ...numbers,
    ]);

    const seen = new Set<string>();
    for (const p of parsed) {
      if (!p.employeeNumber) {
        importError(p.row, 'employee_number', 'Employee number is required');
      }
      if (seen.has(p.employeeNumber)) {
        importError(p.row, 'employee_number', 'Duplicate employee number in the file');
      }
      seen.add(p.employeeNumber);

      if (!p.fullName) importError(p.row, 'full_name', 'Full name is required');
      if (!GENDERS.includes(p.gender)) {
        importError(p.row, 'gender', `Invalid gender '${p.gender}'`);
      }
      if (!this.isDate(p.birthDate)) {
        importError(p.row, 'birth_date', 'Invalid birth date (expected YYYY-MM-DD)');
      }
      if (!this.isDate(p.joinDate)) {
        importError(p.row, 'join_date', 'Invalid join date (expected YYYY-MM-DD)');
      }
      if (!p.departmentCode || !departmentSet.has(p.departmentCode)) {
        importError(p.row, 'department_code', `Unknown department '${p.departmentCode}'`);
      }
      if (!p.positionCode || !positionSet.has(p.positionCode)) {
        importError(p.row, 'position_code', `Unknown position '${p.positionCode}'`);
      }
      const status = p.status || 'ACTIVE';
      if (!STATUSES.includes(status)) {
        importError(p.row, 'status', `Invalid status '${p.status}'`);
      }
      if (p.supervisorNumber && !knownNumbers.has(p.supervisorNumber)) {
        importError(
          p.row,
          'supervisor_number',
          `Supervisor '${p.supervisorNumber}' was not found`,
        );
      }
    }
  }

  async commit(rows: ImportRow[], tx: DbExecutor): Promise<ImportResult> {
    const parsed = this.parse(rows);
    const departmentCodes = [...new Set(parsed.map((p) => p.departmentCode))];
    const positionCodes = [...new Set(parsed.map((p) => p.positionCode))];
    const numbers = [...new Set(parsed.map((p) => p.employeeNumber))];

    const [departments, positions, existing] = await Promise.all([
      this.repository.findDepartmentIdsByCodes(departmentCodes),
      this.repository.findPositionIdsByCodes(positionCodes),
      this.repository.findIdsByNumbers(numbers, tx),
    ]);
    const departmentByCode = new Map(departments.map((d) => [d.code, d.id]));
    const positionByCode = new Map(positions.map((p) => [p.code, p.id]));
    const idByNumber = new Map(existing.map((e) => [e.employeeNumber, e.id]));

    let created = 0;
    let updated = 0;

    // Pass 1: upsert employees (without supervisor, resolved in pass 2).
    for (const p of parsed) {
      const values = {
        fullName: p.fullName,
        gender: p.gender as GenderEnum,
        birthDate: p.birthDate,
        joinDate: p.joinDate,
        address: p.address || null,
        departmentId: departmentByCode.get(p.departmentCode) ?? null,
        positionId: positionByCode.get(p.positionCode) ?? null,
        status: (p.status || 'ACTIVE') as EmployeeStatus,
        employeeNumber: p.employeeNumber,
      };

      const existingId = idByNumber.get(p.employeeNumber);
      if (existingId) {
        await this.repository.updateAndSave(existingId, values as UpdateEmployeeDto, tx);
        updated += 1;
      } else {
        const employee = await this.repository.createAndSave(
          values as CreateEmployeeDto,
          tx,
        );
        if (employee) idByNumber.set(p.employeeNumber, employee.id);
        created += 1;
      }
    }

    // Pass 2: resolve supervisors.
    for (const p of parsed) {
      if (!p.supervisorNumber) continue;
      const selfId = idByNumber.get(p.employeeNumber);
      const supervisorId = idByNumber.get(p.supervisorNumber);
      if (selfId && supervisorId) {
        await this.repository.updateAndSave(
          selfId,
          { supervisorId } as UpdateEmployeeDto,
          tx,
        );
      }
    }

    return { created, updated, skipped: 0 };
  }

  private parse(rows: ImportRow[]): ParsedEmployee[] {
    return rows.map((row) => ({
      row: Number(row.__row ?? 0),
      employeeNumber: String(row.employee_number ?? '').trim(),
      fullName: String(row.full_name ?? '').trim(),
      gender: String(row.gender ?? '').trim(),
      birthDate: String(row.birth_date ?? '').trim(),
      joinDate: String(row.join_date ?? '').trim(),
      address: String(row.address ?? '').trim(),
      departmentCode: String(row.department_code ?? '').trim(),
      positionCode: String(row.position_code ?? '').trim(),
      status: String(row.status ?? '').trim(),
      supervisorNumber: String(row.supervisor_number ?? '').trim(),
    }));
  }

  private isDate(value: string): boolean {
    return ISO_DATE.test(value) && !Number.isNaN(new Date(value).getTime());
  }
}
