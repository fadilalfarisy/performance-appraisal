import * as ExcelJS from 'exceljs';
import { AppraisalsExcelService } from './appraisals.excel';

describe('AppraisalsExcelService', () => {
  const service = new AppraisalsExcelService();

  it('builds a summary and an employee-by-criteria assessment sheet', async () => {
    const buffer = await service.buildResult({
      appraisal: {
        period: '2026-01-01',
        status: 'COMPLETE',
        criteriaSetVersion: 3,
      },
      departmentName: 'Engineering',
      criteria: [
        {
          id: 'crit-1',
          code: 'QUALITY',
          name: 'Quality',
          weight: 60,
        },
        {
          id: 'crit-2',
          code: 'SPEED',
          name: 'Speed',
          weight: 40,
        },
      ] as never,
      employees: [
        {
          id: 'ae-1',
          employeeNumber: 'EMP0001',
          employeeName: '=Budi',
          departmentName: 'Engineering',
          positionName: 'Developer',
          contractType: 'FIXED_TERM',
          contractStartDate: '2026-01-01',
          contractEndDate: '2026-06-30',
          comment: '=SUM(1,2)',
          totalScore: 80,
        },
      ] as never,
      ratings: [
        { appraisalEmployeeId: 'ae-1', criterionId: 'crit-1', rating: 4 },
        { appraisalEmployeeId: 'ae-1', criterionId: 'crit-2', rating: 5 },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const summary = workbook.getWorksheet('Summary');
    expect(summary).toBeDefined();
    expect(summary!.getCell('A1').value).toBe('Department');
    expect(summary!.getCell('B1').value).toBe('Engineering');
    expect(summary!.getCell('B3').value).toBe('v3');
    expect(summary!.getCell('B4').value).toBe('COMPLETE');

    const sheet = workbook.getWorksheet('Assessment');
    expect(sheet).toBeDefined();
    expect(sheet!.getRow(1).getCell(1).value).toBe('Employee No');
    expect(sheet!.getRow(1).getCell(7).value).toBe('Contract End');
    expect(sheet!.getRow(1).getCell(8).value).toBe('Quality (60%)');
    expect(sheet!.getRow(1).getCell(9).value).toBe('Speed (40%)');
    expect(sheet!.getRow(1).getCell(10).value).toBe('Total Score');
    expect(sheet!.getRow(1).getCell(11).value).toBe('Comment');

    const row = sheet!.getRow(2);
    expect(row.getCell(1).value).toBe('EMP0001');
    expect(row.getCell(2).value).toBe("'=Budi");
    expect(row.getCell(8).value).toBe(4);
    expect(row.getCell(9).value).toBe(5);
    expect(row.getCell(10).value).toBe(80);
    expect(row.getCell(11).value).toBe("'=SUM(1,2)");
  });
});
