export interface ImportFirstError {
  row: number;
  column: string;
  message: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
}
