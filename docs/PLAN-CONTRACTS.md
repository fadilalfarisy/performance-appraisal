# Plan: Finish the Contracts module (list screen + Excel import/export)

**Status:** Implemented (contract status was later removed; see PRD v0.6)
**Based on:** PRD v0.6 (5.7, 5.8), `DESIGN-BACKEND.md` 13, `DESIGN-FRONTEND.md` 11, `CONVENTIONS.md`.
**Scope:** complete the contracts feature only. The shared import pipeline built here is reused later by the employee and assessment-rating importers.

---

## 1. Goal

Employees/contracts can already be managed per employee. This adds:

1. A dedicated **Contracts list screen** (`/dashboard/contracts`) with filters, pagination, and create.
2. **Excel export** of contracts (respecting filters).
3. **Excel import** of contracts (template, whole-file validation, first-error reporting, one transaction).

## 2. Current state (already built)

- Backend `ContractsModule`: `GET/POST /contracts`, `GET/PATCH/DELETE /contracts/:id`; filters `employeeId`, `contractType`; pagination; `contract_type`; date-based no-overlap exclusion constraint (422 `CONTRACT_OVERLAP`); soft delete; audit-in-transaction; `@Roles(ADMIN, HR)` on writes. (Contract status was removed in PRD v0.6.)
- Frontend `contractApi`, per-employee `Contract` list, `ContractForm`, Create/Update pages.
- `exceljs` and Multer are already installed on the backend.

## 3. Decisions that go beyond the PRD

| # | Decision | Reason |
|---|---|---|
| 1 | Build one shared `ImportService` (file checks → parse → validate → single transaction → audit) and register the contract importer as the first strategy. | PRD 5.7 describes one pipeline; employees/ratings reuse it. |
| 2 | Contract import matches on **`employee_number` + `start_date`**; matched rows update, unmatched rows create. | Matches the unique `(employee_id, start_date)` key. |
| 3 | Validate overlaps in code (against DB and inside the file) before hitting the DB constraint, so the first-error message is precise. | The exclusion constraint would otherwise surface as a generic 422. |
| 4 | Import is limited to `.xlsx` with a configurable max size/rows (`IMPORT_MAX_FILE_SIZE_MB`, `IMPORT_MAX_ROWS`; default 5 MB / 5000). | PRD 5.7. |
| 5 | Every export/import is audited with file name, filters, and result summary. | PRD 5.6. |

## 4. Backend

### 4.1 Endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/contracts/export` | ADMIN, HR | `.xlsx`, respects the same filters as the list |
| GET | `/contracts/import-template` | ADMIN, HR | Headers + example row + notes sheet |
| POST | `/contracts/import` | ADMIN, HR | `multipart/form-data`, single file |

### 4.2 Shared import pipeline (`src/imports/`)

- `ImportService.run(file, importer)`:
  1. **File checks** — extension and content are `.xlsx`; size ≤ `IMPORT_MAX_FILE_SIZE_MB`; row count ≤ `IMPORT_MAX_ROWS`; header row matches the importer's expected headers exactly.
  2. **Parse** — `exceljs`, trim strings, typed conversion (dates, numbers).
  3. **Validate** — run the importer's row rules in order; **stop at the first error** (nothing is written).
  4. **Commit** — one transaction; any failure rolls everything back.
  5. **Audit** — one entry with file name, uploader, time, and `{ created, updated, skipped }`.
- `ContractImporter` implements the row rules.
- File upload via `FileInterceptor` + Multer memory storage (`limits.fileSize`).

### 4.3 Contract import rules (order matters)

1. Required headers present: `employee_number`, `contract_type`, `start_date`, `end_date`.
2. `employee_number` exists (non-deleted employee).
3. `contract_type` ∈ {`PERMANENT`, `FIXED_TERM`, `PROBATION`}.
4. `start_date` is a valid date; `end_date` empty for `PERMANENT`, otherwise a valid date with `end_date >= start_date`.
5. No duplicate `(employee_number, start_date)` inside the file.
6. No **overlapping** contracts — checked against the DB and within the file — for the same employee.
7. On any error: reject the whole file, report **only the first error** as `{ row, column, message }` (HTTP 422).

### 4.4 Contract export rules

- Filters identical to the list (`employeeId`, `contractType`, and `q` search on employee name/number), role/department scope enforced.
- Columns: `employee_number`, `employee_name`, `contract_type`, `start_date`, `end_date`.
- Sanitize any cell starting with `=`, `+`, `-`, `@` (prefix `'`).
- Streamed `exceljs` writer; audited with the filters used.

## 5. Shared types (`@appraisal/types`)

- `ImportFirstError { row: number; column: string; message: string }`
- `ImportResult { created: number; updated: number; skipped: number }`
- `ImportErrorResponse` (for 422 handling on the client) — reuse `ApiError` with `details`.
- Reuse existing `CreateContractRequest` / `UpdateContractRequest` / `ContractQuery` / `ContractResponse`.

## 6. Frontend

### 6.1 Shared helpers

- `shared/api/downloadFile(path, params)` — authenticated fetch → `Blob`, filename from `Content-Disposition`, loading/error states.
- `components/ImportModal` — props: title, template path, upload endpoint, accepted columns hint; `.xlsx` only; client size check; on success shows `created/updated/skipped` and refreshes the list; on 422 shows **only the first error** ("The file was not imported. Fix this error and upload again.").

### 6.2 Contracts list screen

- Route `/dashboard/contracts` + menu entry ("Contracts", ADMIN/HR write; others read where scoped).
- Filters: employee (search select), contract type, end-date range; URL-driven (shared `useTableQuery` pattern); pagination.
- Table: employee, type (tag), start date, end date, actions (edit → `ContractForm`, delete).
- Toolbar: **Create**, **Import** (ADMIN, HR), **Export**, **Download template** (ADMIN, HR).
- Keep the existing per-employee contract list.

### 6.3 API

- Extend `contractApi` with `importContracts`, `exportContracts`, `importTemplate` (or reuse `downloadFile` for the two downloads).

## 7. Ordered steps (each build-verified)

1. Shared types: `ImportFirstError`, `ImportResult`.
2. Backend: `ImportService` + file checks + a unit test for the header/size checks.
3. Backend: `ContractImporter` (row rules) + unit tests for the validation order (first-error).
4. Backend: `POST /contracts/import` + controller wiring, permissions, audit.
5. Backend: contract export writer + sanitization (+ unit test) + `GET /contracts/export`.
6. Backend: `GET /contracts/import-template`.
7. Frontend: `downloadFile` + `ImportModal`.
8. Frontend: contracts list screen + route + menu; create/edit via `ContractForm`.
9. Wire import/export/template buttons; verify against a running backend.

## 8. Verification

- `pnpm -r build` and `pnpm -r test` stay green; new backend unit tests for header checks, import validation order, and export sanitization.
- Manual: export reflects filters; template downloads; a valid file imports (summary shown); a bad file is rejected with only the first error and nothing is written.
- End-to-end import against a live Postgres is blocked in this environment (no Docker); covered by CI where the DB is available.

## 9. Risks / assumptions

- Employee numbers in the file must already exist (contracts do not create employees).
- The exclusion constraint and the in-code overlap check must agree; the in-code check is the user-facing path.
- Large files stay bounded by the configured limits.

## 10. Out of scope (later Phase 5 passes)

- Employee import/export and assessment-rating import (they reuse the same `ImportService`).
- Audit trail UI and the audit-retention job (Phase 6).
