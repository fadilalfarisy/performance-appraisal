# Implementation Planning: Employee Performance Appraisal System

**Based on:** PRD v0.4, `DESIGN-BACKEND.md` v0.3, `DESIGN-FRONTEND.md` v0.3, and `CONVENTIONS.md` v1.0.
**Scope:** the build order for the whole system, backend and frontend.
**Status:** Draft v1.0

**How to use:** tick items as they complete. Each phase assumes the previous one is done. Items marked **BLOCKER** must be resolved before work on their phase starts. If a task changes a requirement, update `PRD.md` first, then the design docs, then code and tests (see `AGENTS.md`).

Legend: `[ ]` not started, `[~]` in progress, `[x]` done.

---

## Phase 0 — Reconcile and foundation

The repo currently contains scaffold modules that are not part of the PRD and a structure that differs from the design docs. Settle these first.

- [x] **BLOCKER** Resolved: deleted the out-of-scope scaffold modules — backend `tasks`, `reports`, `assessments`, `roles`, `permissions`; frontend `performance`, `report`, `assessment`, `roles`, `permissions`. Kept `daily-records` and renamed it to `daily-notes` for the Daily Activity Notes feature (PRD 5.9). `users` now uses a `UserRole` enum instead of RBAC tables.
- [x] **BLOCKER** Resolved: the canonical backend structure is flat `src/<feature>` + `src/db`, aligned to `CONVENTIONS.md` section 4 (plural feature folders, `dto/`, `interfaces/`, `enums/`, guards and decorators under `common/`, `test/` folder).
- [x] Create the shared `@appraisal/types` package (enums, `ApiResponse` envelope, all request/response types) and migrate both apps to it — see `CONVENTIONS.md` section 2.
- [ ] Configure monorepo scripts and `.env` / `.env.example` for both apps; add docker-compose PostgreSQL for dev and e2e.
- [ ] Add CI to run `pnpm -r lint`, `pnpm -r build`, and both test suites.
- [ ] Apply the shared Prettier/ESLint config to `apps/frontend` so both apps match `CONVENTIONS.md` section 6.

## Phase 1 — Backend foundation

- [ ] Build `ConfigModule` with `class-validator` env validation; read config through `ConfigService`, never `process.env`.
- [ ] Build the Drizzle database module (pg Pool + transaction helper) and `src/db/schema.ts`.
- [ ] Generate base migrations plus custom SQL for things Drizzle cannot express: contract exclusion constraint, partitioned `audit_logs`, partial unique indexes, grants, `btree_gist`.
- [ ] Build the common layer: `notDeleted()` helper, pagination, shared error format, global exception filter, response interceptor.
- [ ] Build `AuditService` with central masking and same-transaction recording.
- [ ] Build the auth module: login, access/refresh signing (HS256, separate secrets), refresh rotation, reuse detection, logout.
- [ ] Add guards and context: global `JwtAuthGuard`, `RolesGuard`, `@Public()`/`@Roles()`/`@CurrentUser()`, request context via `nestjs-cls`.
- [ ] Implement `ScopeService` and the `permissions.ts` data structure driven by the PRD 5.8 matrix.
- [ ] Configure auth rate limiting, CORS, and Swagger (disabled or protected in production).

## Phase 2 — Master data

- [ ] Build the Users module: CRUD, deactivate, reset password, role and department assignment, optional linked employee.
- [ ] Build the Departments module: CRUD, soft delete, head employee.
- [ ] Build the Positions module: CRUD, soft delete.
- [ ] Build the Employees module: unique employee number, superior link, soft delete, search/filter/sort/pagination.
- [ ] Build the Contracts module: CRUD, overlapping-active-contract rule, soft delete.
- [ ] Add a table-driven permission e2e test covering every row of the PRD 5.8 matrix.

## Phase 3 — Criteria versioning

- [ ] Add schema and repository for `criteria_sets`, `criteria`, `criteria_scale_descriptions`.
- [ ] Implement create DRAFT set (copy the active set) and DRAFT-only editing rules.
- [ ] Implement activation: weights total 100, `scale_min < scale_max`, every score level described, unique codes; mark the previous set SUPERSEDED in one transaction.
- [ ] Expose criteria version history; block edits to ACTIVE and SUPERSEDED sets.

## Phase 4 — Appraisals

- [ ] Implement the eligibility query and `POST /appraisals/preview`.
- [ ] Implement manual creation with snapshots, one-per-department-per-period, and employee validation.
- [ ] Implement `PUT /appraisals/:id/employees` (DRAFT only, fresh snapshots for added employees).
- [ ] Implement ratings bulk upsert with scale and criteria-set validation.
- [ ] Implement `appraisal-score.ts` and unit tests (mixed scales, missing ratings, rounding).
- [ ] Implement the workflow state machine, `TRANSITIONS` table, and transition service (`SELECT ... FOR UPDATE`, history row, audit row).
- [ ] Implement DRAFT soft delete (HR) and free the department/period for a new appraisal.
- [ ] Implement the day-1 scheduler: advisory lock, per-department transaction, idempotent, `SYSTEM` audit.
- [ ] Add the admin rerun endpoint `POST /scheduler/appraisals/run`.

## Phase 5 — Import and export

- [ ] Build the shared `ImportService` pipeline: file checks, parse, stop-at-first-error validation, single transaction, audit.
- [ ] Implement the employees importer (upsert matched by employee number).
- [ ] Implement the contracts importer (match by employee number + start date, overlap checks inside file and DB).
- [ ] Implement the assessment ratings importer (metadata match, scope/status checks, overwrite audit).
- [ ] Implement export writers and template endpoints with formula-injection sanitization.

## Phase 6 — Audit and retention

- [ ] Build `GET /audit-logs` with filters (user, entity, action, date range) and export (P1).
- [ ] Add the audit partition maintenance job and the documented purge procedure.

## Phase 7 — Frontend foundation

- [ ] Build the app store, typed hooks, and RTK Query `baseApi` with single-flight re-auth.
- [ ] Build the router (`createBrowserRouter`), layout, role-based menu, theme, and dayjs setup.
- [ ] Build auth: `authSlice`, `authApi`, Login page, `tokenStorage`, bootstrap, logout.
- [ ] Build error mapping (`ApiError`), global toasts via `App.useApp()`, `ErrorBoundary`, and 403/404 pages.

## Phase 8 — Frontend screens

- [ ] Build `shared/permissions` (`canAccessRoute`, `canWriteMaster`, `getAvailableActions`) with tests.
- [ ] Build Users, Departments, and Positions screens.
- [ ] Build Employees and Contracts screens with import/export toolbars.
- [ ] Build criteria list, read-only view, and DRAFT editor with the live weight total.
- [ ] Build the appraisal list, "needs my action" tab, and create wizard.
- [ ] Build the appraisal detail grid (sticky, keyboard, unsaved draft, completeness) with workflow actions and the history timeline.
- [ ] Build the `downloadFile` helper and the reusable `ImportModal` (first-error display).
- [ ] Build the audit trail screen with filters and expandable before/after values.

## Phase 9 — Testing, seed, deploy, docs

- [ ] Write backend unit tests: transitions, eligibility, criteria validation, audit masking, importer validation order.
- [ ] Write backend e2e tests: full DRAFT → COMPLETE workflow, scope isolation, scheduler idempotency, atomic imports, audit entry per write.
- [ ] Write frontend Vitest/RTL tests: permissions, score, grid, `ImportModal`.
- [ ] Add shared score-formula parity tests (same cases in both apps).
- [ ] Write the idempotent seed script: first admin from env and criteria set v1 (placeholder weights).
- [ ] Add the health endpoint, the production `migrate` script, and multi-stage Docker images.
- [ ] Sync docs (PRD, design docs, `CONVENTIONS.md`) and follow the PRD release plan for UAT, migration, and rollout.

---

## Dependencies and ordering

- Phase 0 gates everything. Phase 1 gates Phases 2–6. Phase 2 gates Phases 3–4 (criteria and appraisals need master data). Phase 4 gates the assessment parts of Phase 5 and most of Phase 8.
- Frontend Phases 7–8 can start once Phase 1 auth endpoints and the relevant backend endpoints exist; they do not need the backend tests to be finished.
- Phase 9 runs alongside, not only at the end: write unit tests with each backend feature.

## Open decisions

| # | Decision | Owner | Blocks |
|---|---|---|---|
| 1 | Keep or remove out-of-scope scaffold modules | Team | Resolved (Phase 0 complete) |
| 2 | Canonical backend structure (`src/<feature>` vs `src/modules`) | Team | Resolved: flat `src/<feature>` + `src/db` |
| 3 | Final criteria weights, scales, and score descriptions | HR | Seed data (Phase 9) |
| 4 | Contract type list | HR | Contracts (Phase 2) |
