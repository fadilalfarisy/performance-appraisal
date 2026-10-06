import { HttpException, HttpStatus } from '@nestjs/common';
import type { ImportResult } from '@appraisal/types';
import type { DbExecutor } from '../db/db.type';

export type ImportRow = Record<string, unknown>;

/** The subset of an uploaded file the pipeline needs (Multer memory storage). */
export interface UploadedFileLike {
  originalname: string;
  size: number;
  buffer: Buffer;
}

export interface ImportStrategy {
  /** Exact header names required in row 1. */
  expectedHeaders: string[];
  /** Throws on the first invalid row. Must not write anything. */
  validate(rows: ImportRow[]): Promise<void>;
  /** Writes everything in the caller's transaction. */
  commit(rows: ImportRow[], tx: DbExecutor): Promise<ImportResult>;
}

/** Rejects an import with a single first-error detail (HTTP 422). */
export function importError(
  row: number,
  column: string,
  message: string,
): never {
  throw new HttpException(
    {
      message,
      errorCode: 'IMPORT_VALIDATION_FAILED',
      details: { row, column, message },
    },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}
