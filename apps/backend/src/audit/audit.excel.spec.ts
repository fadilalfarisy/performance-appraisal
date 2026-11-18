import * as ExcelJS from 'exceljs';
import { AuditExcelService } from './audit.excel';

const service = new AuditExcelService();

const row = {
  id: 1,
  occurredAt: new Date('2026-11-18T03:04:05.000Z'),
  actorType: 'USER',
  userId: 'user-1',
  username: '=budi',
  role: 'ADMIN',
  employeeNumber: 'E-1',
  action: 'USER_CREATED',
  entity: 'user',
  entityId: '=1+1',
  beforeData: null,
  afterData: { username: 'budi' },
  metadata: { file: '@cmd' },
  ipAddress: '10.0.0.1',
  requestId: 'req-1',
};

describe('AuditExcelService', () => {
  it('writes headers and one row per entry, sanitizing formulas', async () => {
    const buffer = await service.buildExport([row]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Audit Trail');

    expect(sheet).toBeDefined();
    expect(sheet!.getRow(1).getCell(1).value).toBe('occurred_at');
    expect(sheet!.getRow(1).getCell(6).value).toBe('action');

    const data = sheet!.getRow(2);
    expect(data.getCell(1).value).toBe('2026-11-18T03:04:05.000Z');
    expect(data.getCell(3).value).toBe("'=budi");
    expect(data.getCell(8).value).toBe("'=1+1");
    expect(data.getCell(11).value).toBe('');
    expect(data.getCell(12).value).toContain('"username":"budi"');
    expect(data.getCell(13).value).toContain('"file":"@cmd"');
  });

  it('produces a valid file with headers when there are no rows', async () => {
    const buffer = await service.buildExport([]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Audit Trail');

    expect(sheet!.actualRowCount).toBe(1);
    expect(sheet!.getRow(1).getCell(1).value).toBe('occurred_at');
  });
});
