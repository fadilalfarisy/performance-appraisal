import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type { CriterionResponse } from '@appraisal/types';
import type { AppraisalEmployeeRow } from './appraisals.repository';

interface ResultInput {
  appraisal: {
    period: string;
    status: string;
    criteriaSetVersion: number | null;
  };
  departmentName: string | null;
  criteria: CriterionResponse[];
  employees: AppraisalEmployeeRow[];
  ratings: {
    appraisalEmployeeId: string;
    criterionId: string;
    rating: number;
  }[];
}

/** Prefixes values that could be interpreted as formulas. */
function sanitize(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

@Injectable()
export class AppraisalsExcelService {
  async buildResult(input: ResultInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summary = workbook.addWorksheet('Summary');
    summary.columns = [{ width: 24 }, { width: 34 }];
    summary.addRows([
      ['Department', sanitize(input.departmentName ?? '')],
      ['Period', input.appraisal.period],
      ['Criteria set version', `v${input.appraisal.criteriaSetVersion ?? 0}`],
      ['Status', input.appraisal.status],
      ['Generated at', new Date().toISOString()],
    ]);
    summary.getColumn(1).font = { bold: true };

    const fixedColumns = [
      { header: 'Employee No', key: 'employeeNumber', width: 18 },
      { header: 'Employee Name', key: 'employeeName', width: 28 },
      { header: 'Department', key: 'departmentName', width: 24 },
      { header: 'Position', key: 'positionName', width: 22 },
      { header: 'Contract Type', key: 'contractType', width: 18 },
      { header: 'Contract Start', key: 'contractStartDate', width: 15 },
      { header: 'Contract End', key: 'contractEndDate', width: 15 },
    ];
    const criterionColumns = input.criteria.map((criterion) => ({
      header: `${criterion.name} (${criterion.weight}%)`,
      key: `criterion_${criterion.id}`,
      width: 16,
    }));
    const tailColumns = [
      { header: 'Total Score', key: 'totalScore', width: 12 },
      { header: 'Comment', key: 'comment', width: 32 },
    ];

    const sheet = workbook.addWorksheet('Assessment');
    sheet.columns = [...fixedColumns, ...criterionColumns, ...tailColumns];

    const ratings = new Map(
      input.ratings.map((rating) => [
        `${rating.appraisalEmployeeId}:${rating.criterionId}`,
        rating.rating,
      ]),
    );

    for (const employee of input.employees) {
      const row: Record<string, unknown> = {
        employeeNumber: sanitize(employee.employeeNumber ?? ''),
        employeeName: sanitize(employee.employeeName ?? ''),
        departmentName: sanitize(employee.departmentName ?? ''),
        positionName: sanitize(employee.positionName ?? ''),
        contractType: employee.contractType ?? '',
        contractStartDate: employee.contractStartDate ?? '',
        contractEndDate: employee.contractEndDate ?? '',
        totalScore: employee.totalScore ?? null,
        comment: sanitize(employee.comment ?? ''),
      };

      for (const criterion of input.criteria) {
        row[`criterion_${criterion.id}`] = ratings.get(`${employee.id}:${criterion.id}`) ?? null;
      }

      sheet.addRow(row);
    }

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
