import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import type { ImportResult } from '@appraisal/types';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { RequestContextService } from '../common/context/request-context.service';
import { importError, type ImportRow, type ImportStrategy, type UploadedFileLike } from './import.types';

type ExcelLoadInput = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const record = value as unknown as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return (record.richText as { text: string }[])
        .map((part) => part.text)
        .join('')
        .trim();
    }
    if (typeof record.text === 'string') return record.text.trim();
    if (record.result !== undefined) return String(record.result).trim();
    return '';
  }
  return String(value).trim();
}

@Injectable()
export class ImportService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dbService: DbService,
    private readonly audit: AuditService,
    private readonly requestContext: RequestContextService,
  ) {}

  async run(
    file: UploadedFileLike | undefined,
    strategy: ImportStrategy,
    entity: string,
  ): Promise<ImportResult> {
    this.assertFile(file);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ExcelLoadInput);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new HttpException(
        { message: 'The file has no sheet', errorCode: 'IMPORT_EMPTY_FILE' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const headerValues = sheet.getRow(1).values as ExcelJS.CellValue[];
    const headers = (headerValues ?? []).map((value) => cellText(value));
    const columnIndex = new Map<string, number>();
    headers.forEach((header, index) => {
      if (header) columnIndex.set(header, index);
    });

    for (const expected of strategy.expectedHeaders) {
      if (!columnIndex.has(expected)) {
        importError(1, expected, `Missing column "${expected}"`);
      }
    }

    const rows: ImportRow[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const record: ImportRow = { __row: rowNumber };
      let hasValue = false;
      for (const header of strategy.expectedHeaders) {
        const index = columnIndex.get(header) ?? 0;
        const text = cellText(row.getCell(index).value);
        record[header] = text;
        if (text !== '') hasValue = true;
      }
      if (hasValue) rows.push(record);
    }

    const maxRows = Number(this.configService.get('IMPORT_MAX_ROWS') ?? 5000);
    if (rows.length > maxRows) {
      throw new HttpException(
        {
          message: `The file has more than ${maxRows} rows`,
          errorCode: 'IMPORT_TOO_MANY_ROWS',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate the whole file first — nothing is written during validation.
    await strategy.validate(rows);

    return this.dbService.transaction(async (tx) => {
      const result = await strategy.commit(rows, tx);
      await this.audit.record(tx, {
        action: `${entity.toUpperCase()}_IMPORTED`,
        entity,
        metadata: { file: file.originalname, ...result },
        ...this.actor(),
      });
      return result;
    });
  }

  private assertFile(
    file: UploadedFileLike | undefined,
  ): asserts file is UploadedFileLike {
    if (!file) {
      throw new HttpException(
        { message: 'No file uploaded', errorCode: 'IMPORT_FILE_REQUIRED' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new HttpException(
        { message: 'Only .xlsx files are allowed', errorCode: 'IMPORT_FILE_TYPE' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const maxBytes =
      Number(this.configService.get('IMPORT_MAX_FILE_SIZE_MB') ?? 5) *
      1024 *
      1024;
    if (file.size > maxBytes) {
      throw new HttpException(
        {
          message: `File exceeds the ${maxBytes / (1024 * 1024)} MB limit`,
          errorCode: 'IMPORT_FILE_TOO_LARGE',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private actor() {
    const user = this.requestContext.getUser();
    return {
      userId: user?.userId ?? null,
      username: user?.username ?? null,
      role: user?.roles?.[0] ?? null,
      ipAddress: this.requestContext.getIp() ?? null,
      requestId: this.requestContext.getRequestId() ?? null,
    };
  }
}
