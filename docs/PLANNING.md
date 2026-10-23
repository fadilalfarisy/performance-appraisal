# Implementation Planning: Employee Performance Appraisal System

**Based on:** PRD v0.6, `DESIGN-BACKEND.md` v0.4, `DESIGN-FRONTEND.md` v0.4, and `CONVENTIONS.md` v1.0.
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
- [x] Configure monorepo scripts (`build`/`lint`/`format`/`test`/`dev`/`db:up`/`db:down`) and add `docker-compose.yml` (PostgreSQL 16) for dev and e2e.
- [x] Refresh `.env.example` for both apps: backend points at the compose database (`postgresql://appraisal:appraisal@localhost:5432/appraisal`) with `NODE_ENV`/`TZ`; frontend uses `VITE_HOST_API=http://localhost:3000/api` and `VITE_APP_NAME`.
- [x] Add CI (`.github/workflows/ci.yml`): install, `pnpm -r lint`, `pnpm -r build`, `pnpm -r test`, with a PostgreSQL service.
- [x] Apply the shared Prettier/ESLint config to `apps/frontend` (`.prettierrc` + `eslint-config-prettier`), matching `CONVENTIONS.md` section 6.

## Phase 1 — Backend foundation

- [x] Build `ConfigModule` with `class-validator` env validation; read config through `ConfigService`, never `process.env`.
- [x] Build the Drizzle database module (pg Pool + transaction helper) and `src/db/schema.ts`.
- [x] Generate base migrations plus custom SQL for things Drizzle cannot express: contract exclusion constraint, partitioned `audit_logs`, partial unique indexes, grants, `btree_gist`. (Generated; not yet applied — needs a running Postgres.)
- [x] Build the common layer: `notDeleted()` helper, pagination, shared error format, global exception filter, response interceptor.
- [x] Build `AuditService` with central masking and same-transaction recording.
- [x] Build the auth module: login, access/refresh signing (HS256), refresh rotation, reuse detection, logout. (Frontend auth wiring is Phase 7.)
- [x] Add guards and context: global `JwtAuthGuard`, `RolesGuard`, `@Public()`/`@Roles()`/`@CurrentUser()`, request context via `nestjs-cls`.
- [x] Implement `ScopeService` and the `permissions.ts` data structure driven by the PRD 5.8 matrix.
- [x] Configure auth rate limiting, CORS, and Swagger (disabled or protected in production).

## Phase 2 — Master data

Approach: full PRD alignment (PRD fields, not just behavior), done in stages so the build stays green. Migrations were reset and regenerated from the redesigned schema.

- [x] Build the Departments module: CRUD, soft delete, `code`, head employee, active flag, audit, `@Roles(ADMIN)`.
- [x] Build the Positions module: CRUD, soft delete, `code`, `level`, active flag, audit.
- [x] Build the Employees module: `employee_number` (partial-unique among non-deleted), superior link, join date, soft delete, search/filter/sort/pagination, audit, department scope.
- [x] Build the Contracts module: standalone `/contracts` CRUD, `contract_type`, date-based no-overlap rule (exclusion constraint + 422 `CONTRACT_OVERLAP`), soft delete, audit. (Contract status was removed in PRD v0.6.)
- [x] Build the Users module: CRUD, deactivate (`PATCH /users/:id/status`), reset password, full name, optional linked employee, department assignment, `@Roles(ADMIN)`, audit.
- [x] Permission matrix covered by a table-driven unit test (`src/common/permissions/permissions.spec.ts`); the live-DB e2e version is deferred until Postgres is available in CI.

## Phase 3 — Criteria versioning

- [x] Add schema and repository for `criteria_sets`, `criteria`, `criteria_scale_descriptions` (unique version per department group, one-ACTIVE partial unique index per group, `scale_min < scale_max` and `weight > 0` checks, unique `(set, code)` and `(criterion, score)`).
- [x] Create DRAFT set (version = max + 1 per department, copies the group's active set) with DRAFT/ACTIVE/ARCHIVED editing rules.
- [x] Activation: weights total 100, `scale_min < scale_max`, every score level described, unique codes; archive the previous set in the same department group and activate in one transaction (audited).
- [x] Version history (`GET /criteria-sets`) and department-scoped ACTIVE/ARCHIVED statuses; ACTIVE edits are limited to ADMIN content fields.

## Phase 4 — Appraisals

- [x] Implement the eligibility query and `POST /appraisals/preview`.
- [x] Implement manual creation with snapshots, one-per-department-per-period (partial unique index), and employee validation.
- [x] Implement `PUT /appraisals/:id/employees` (DRAFT only, fresh snapshots for added employees).
- [x] Implement ratings bulk upsert with scale and criteria-set validation.
- [x] Implement `appraisal-score.ts` and unit tests (mixed scales, missing ratings, rounding).
- [x] Implement the workflow state machine, `TRANSITIONS` table, and transition service (`SELECT ... FOR UPDATE`, history row, audit row).
- [x] Implement DRAFT soft delete (HR), which frees the department/period for a new appraisal.
- [x] Implement the day-1 scheduler: advisory lock, per-department transaction, idempotent, `SYSTEM` audit.
- [x] Add the admin rerun endpoint `POST /scheduler/appraisals/run`.

## Phase 5 — Import and export

- [x] Build the shared `ImportService` pipeline: file checks, parse, stop-at-first-error validation, single transaction, audit.
- [x] Implement the employees importer (upsert matched by employee number).
- [x] Implement the contracts importer (match by employee number + start date, overlap checks inside file and DB).
- [ ] Implement the assessment ratings importer (metadata match, scope/status checks, overwrite audit).
- [~] Implement export writers and template endpoints with formula-injection sanitization (employees and contracts done; assessment template/result pending).

## Phase 6 — Audit and retention

- [ ] Build `GET /audit-logs` with filters (user, entity, action, date range) and export (P1).
- [ ] Add the audit partition maintenance job and the documented purge procedure.

## Phase 7 — Frontend foundation

- [x] Build the app store, typed hooks, and RTK Query `baseApi` with single-flight re-auth (shared refresh promise, access token in memory, refresh in `sessionStorage`).
- [x] Router (`createBrowserRouter`), layout, role-based menu, theme (`ConfigProvider`), and dayjs setup (present from the scaffold, reviewed).
- [x] Auth: `authSlice` (access in memory), `authApi` (`/auth/signin`, `/auth/refresh`, `/auth/me`, `/auth/logout`), Login page, `tokenStorage`, app bootstrap (restore session via refresh + me), logout.
- [x] Error mapping (`ApiError`), global toasts via `App.useApp()` (message bridge), route error element, and a 403 page (`/403`); 404 handled by the route error element.

## Phase 8 — Frontend screens

- [x] `shared/permissions` — implemented as `src/permissions/appraisalPermissions.ts` (`getAvailableActions`, `canWriteMaster`); unit tests deferred until Vitest is added (Phase 9).
- [x] Users, Departments, and Positions screens (present from earlier phases).
- [x] Employees and Contracts screens (present); import/export toolbars pending Phase 5.
- [x] Criteria list, read-only view, and DRAFT editor with the live weight total (Phase 3).
- [x] Appraisal list, "needs my action" tab, and create wizard (department + month → preview → create).
- [x] Appraisal detail grid with workflow actions and the status-history timeline (rating edits + total score; sticky/keyboard/completeness refinements still to polish).
- [x] `downloadFile` helper and the reusable `ImportModal` (used by the employees and contracts screens).
- [ ] Audit trail screen — blocked on Phase 6 (`GET /audit-logs`).

## Phase 9 — Testing, seed, deploy, docs

- [x] Backend unit tests: transitions, criteria validation, audit masking, score, importer validation order (contracts), dashboard summary.
- [ ] Backend e2e tests: full DRAFT → COMPLETE workflow, scope isolation, scheduler idempotency, atomic imports, audit entry per write — requires a live Postgres (blocked; no Docker here).
- [x] Frontend Vitest tests: permissions and score (parity with the backend). Grid and `ImportModal` tests pending (need RTL + Phase 5).
- [x] Add shared score-formula parity tests (same cases in both apps).
- [x] Write the idempotent seed script: first admin from env (`SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD`) and criteria set v1 (placeholder weights).
- [x] Add the health endpoint (`GET /api/health`), the production `migrate` script, and multi-stage Docker images (backend + frontend with nginx). Dockerfiles are unverified (no Docker here).
- [~] Sync docs to PRD v0.6 (`DESIGN-BACKEND.md` v0.4, `DESIGN-FRONTEND.md` v0.4); the PRD release plan for UAT, migration, and rollout is still pending.

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
