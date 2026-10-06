import { Injectable } from '@nestjs/common';
import type { ContractType, ImportResult } from '@appraisal/types';
import type { DbExecutor } from '../db/db.type';
import {
  importError,
  type ImportRow,
  type ImportStrategy,
} from '../imports/import.types';
import { ContractsRepository } from './contracts.repository';

const CONTRACT_TYPES = ['PERMANENT', 'FIXED_TERM', 'PROBATION'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface ParsedContract {
  row: number;
  employeeNumber: string;
  contractType: string;
  startDate: string;
  endDate: string;
}

@Injectable()
export class ContractImporter implements ImportStrategy {
  readonly expectedHeaders = [
    'employee_number',
    'contract_type',
    'start_date',
    'end_date',
  ];

  constructor(private readonly repository: ContractsRepository) {}

  async validate(rows: ImportRow[]): Promise<void> {
    const parsed = this.parse(rows);
    const numbers = [
      ...new Set(parsed.map((p) => p.employeeNumber).filter(Boolean)),
    ];
    const employees = await this.repository.findEmployeesByNumbers(numbers);
    const byNumber = new Map(
      employees.map((employee) => [employee.employeeNumber, employee.id]),
    );

    const seen = new Set<string>();
    for (const p of parsed) {
      if (!p.employeeNumber) {
        importError(p.row, 'employee_number', 'Employee number is required');
      }
      if (!byNumber.has(p.employeeNumber)) {
        importError(
          p.row,
          'employee_number',
          `Employee '${p.employeeNumber}' was not found`,
        );
      }
      if (!CONTRACT_TYPES.includes(p.contractType)) {
        importError(
          p.row,
          'contract_type',
          `Invalid contract type '${p.contractType}'`,
        );
      }
      if (!this.isDate(p.startDate)) {
        importError(p.row, 'start_date', 'Invalid start date (expected YYYY-MM-DD)');
      }
      if (p.contractType === 'PERMANENT') {
        if (p.endDate) {
          importError(p.row, 'end_date', 'Permanent contracts cannot have an end date');
        }
      } else {
        if (!p.endDate) {
          importError(p.row, 'end_date', 'End date is required');
        }
        if (p.endDate && !this.isDate(p.endDate)) {
          importError(p.row, 'end_date', 'Invalid end date (expected YYYY-MM-DD)');
        }
        if (p.endDate && p.endDate < p.startDate) {
          importError(p.row, 'end_date', 'End date must be on or after start date');
        }
      }
      const key = `${p.employeeNumber}|${p.startDate}`;
      if (seen.has(key)) {
        importError(
          p.row,
          'start_date',
          'Duplicate employee number and start date in the file',
        );
      }
      seen.add(key);
    }

    // Overlap against the database and within the file.
    const employeeIds = [...new Set(byNumber.values())];
    const existing = await this.repository.findByEmployeeIds(employeeIds);
    const existingIntervals = new Map<string, { start: string; end: string }[]>();
    for (const contract of existing) {
      const intervals = existingIntervals.get(contract.employeeId) ?? [];
      intervals.push({
        start: contract.startDate,
        end: contract.endDate ?? '9999-12-31',
      });
      existingIntervals.set(contract.employeeId, intervals);
    }

    for (const p of parsed) {
      const employeeId = byNumber.get(p.employeeNumber);
      if (!employeeId) continue;
      const start = p.startDate;
      const end = p.contractType === 'PERMANENT' ? '9999-12-31' : p.endDate;

      const dbCandidates = (existingIntervals.get(employeeId) ?? []).filter(
        (c) => c.start !== start, // the same contract being updated
      );
      const fileCandidates = parsed
        .filter((o) => o !== p && o.employeeNumber === p.employeeNumber)
        .map((o) => ({
          start: o.startDate,
          end: o.contractType === 'PERMANENT' ? '9999-12-31' : o.endDate,
        }));

      for (const candidate of [...dbCandidates, ...fileCandidates]) {
        if (start <= candidate.end && candidate.start <= end) {
          importError(
            p.row,
            'start_date',
            'Overlaps another contract for this employee',
          );
        }
      }
    }
  }

  async commit(rows: ImportRow[], tx: DbExecutor): Promise<ImportResult> {
    const parsed = this.parse(rows);
    const numbers = [...new Set(parsed.map((p) => p.employeeNumber))];
    const employees = await this.repository.findEmployeesByNumbers(numbers);
    const byNumber = new Map(
      employees.map((employee) => [employee.employeeNumber, employee.id]),
    );

    let created = 0;
    let updated = 0;

    for (const p of parsed) {
      const employeeId = byNumber.get(p.employeeNumber);
      if (!employeeId) continue;
      const values = {
        contractType: p.contractType as ContractType,
        startDate: p.startDate,
        endDate: p.contractType === 'PERMANENT' ? null : p.endDate,
      };

      const existing = await this.repository.findByEmployeeAndStart(
        employeeId,
        p.startDate,
        tx,
      );
      if (existing) {
        await this.repository.updateAndSave(
          existing.id,
          {
            contractType: values.contractType,
            endDate: values.endDate ?? undefined,
          },
          tx,
        );
        updated += 1;
      } else {
        await this.repository.createAndSave(
          {
            employeeId,
            contractType: values.contractType,
            startDate: values.startDate,
            endDate: values.endDate ?? undefined,
          },
          tx,
        );
        created += 1;
      }
    }

    return { created, updated, skipped: 0 };
  }

  private parse(rows: ImportRow[]): ParsedContract[] {
    return rows.map((row) => ({
      row: Number(row.__row ?? 0),
      employeeNumber: String(row.employee_number ?? '').trim(),
      contractType: String(row.contract_type ?? '').trim(),
      startDate: String(row.start_date ?? '').trim(),
      endDate: String(row.end_date ?? '').trim(),
    }));
  }

  private isDate(value: string): boolean {
    return ISO_DATE.test(value) && !Number.isNaN(new Date(value).getTime());
  }
}
