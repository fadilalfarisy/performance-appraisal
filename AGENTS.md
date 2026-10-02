# AGENTS.md

## Overview
Employee Performance Appraisal System. pnpm workspaces monorepo (Node.js 24).

- `apps/backend`: NestJS 11, TypeScript 5.7, PostgreSQL via Drizzle ORM. REST API under `/api`.
- `apps/frontend`: React 18, TypeScript 5.7, Vite 7, Ant Design 5, Redux Toolkit (RTK Query), react-router-dom 6, dayjs.

## Source of truth (read before changing behavior)
- `docs/PRD.md`: what the product does. Highest authority.
- `docs/DESIGN-BACKEND.md`: how the backend is built (data model, workflow, auth, imports, audit).
- `docs/DESIGN-FRONTEND.md`: how the frontend is built (routes, appraisal table, auth, imports).
- `docs/CONVENTIONS.md`: naming, structure, and code style for both apps.
- If the PRD and the code disagree, ask which is correct before changing either.

## Commands
Always use `pnpm`. Never use `npm` or `yarn`.

- Install: `pnpm install` (from the repo root only)
- Run a script in one app: `pnpm --filter <backend|frontend> <script>`
- Dev: `pnpm --filter backend dev`, `pnpm --filter frontend dev`
- Build all: `pnpm -r build`
- Lint all: `pnpm -r lint`
- Backend tests: `pnpm --filter backend test` (unit), `pnpm --filter backend test:e2e` (Supertest, needs the docker-compose PostgreSQL)
- Migrations (dev): `pnpm --filter backend exec drizzle-kit generate` (add `--custom` for raw SQL)

Check each app's `package.json` for exact script names if a command fails.

## Domain rules (do not break)
- Roles: `ADMIN`, `HR`, `HEAD_DEPARTMENT`, `MANAGER`, `GENERAL_MANAGER`. One role per user.
- Appraisal status: `DRAFT → PENDING → SUBMITTED → APPROVED → COMPLETE`. Allowed transitions, who may do them, and send-back targets are in PRD 5.5 and 5.8.
- Only Head Department edits ratings, only in `PENDING`, only for their own department.
- Every send back and every reopen requires a comment.
- One non-deleted appraisal per department per period (month).
- Criteria are versioned as a whole set. An active or superseded set is never edited or deleted. Weights total exactly 100.
- Master data and appraisals are never hard deleted (soft delete only).
- Every write, status change, import, and export creates an audit entry. Audit rows are never updated or deleted by the app; sensitive values (passwords, tokens) are masked.
- Excel imports: validate the whole file first, reject the whole file on any error, report only the first error, commit in one transaction.
- The score formula (`Σ rating / scale_max × weight`) lives in one function per app and is tested with the same cases.

## Backend conventions (apps/backend)
- Module per feature: module, controller (HTTP only), service (rules), repository (Drizzle queries), DTOs.
- Only repositories import Drizzle tables. Always filter soft-deleted rows with the `notDeleted()` helper.
- Validate input with DTOs (`class-validator`, `class-transformer`). Import `PartialType` and similar helpers from `@nestjs/swagger`, not `@nestjs/mapped-types`.
- Document every endpoint with `@nestjs/swagger` decorators.
- Auth: `@nestjs/passport` + `passport-jwt` for access tokens, `JwtService` from `@nestjs/jwt` for signing and verifying (HS256 pinned, separate secrets). Do not import `jsonwebtoken` directly. Global `JwtAuthGuard`, with `@Public()`, `@Roles()`, and `ScopeService` for department scope.
- Enforce role and department scope on the server for every endpoint. Out-of-scope records return 404.
- Appraisal status changes go only through the transition rules table and the workflow service. Never set `status` directly.
- Write the change and its audit entry in the same transaction.
- Configuration through `ConfigService` with validated env, never `process.env` directly.
- Scheduled jobs use `@nestjs/schedule`, must be idempotent, and are protected by the advisory lock.
- Use `exceljs` for Excel; sanitize cells starting with `=`, `+`, `-`, `@` on export.
- Error responses follow the shared format (`statusCode`, `code`, `message`, `details`).

## Database (Drizzle ORM)
- Define schema in `src/database/schema`, generate migrations with `drizzle-kit generate`.
- Things Drizzle cannot express (exclusion constraint, partitioned `audit_logs`, grants, partial indexes) go in custom SQL migrations.
- Never edit or delete an existing migration, never hand-edit `meta/`, never use `drizzle-kit push` on shared databases.
- Production migrations run with the `migrate.ts` script, not `drizzle-kit`.
- The app's database user has only `INSERT` and `SELECT` on `audit_logs`.

## Frontend conventions (apps/frontend)
- Functional components with hooks only.
- Server data goes through RTK Query (`baseApi.injectEndpoints`). No axios. Redux slices hold only auth, unsaved grid edits, and small UI state; never copy server data into slices.
- Keep Redux state serializable: dates are strings, never `dayjs` objects.
- Tokens: access token in memory only, refresh token in `sessionStorage`. Token refresh is single-flight.
- Use Ant Design components and `@ant-design/icons`. Show messages with `App.useApp()`.
- Routing uses `createBrowserRouter`; route table drives the menu and role access.
- UI permission checks go through `shared/permissions` (mirrors PRD 5.8). The backend stays the authority.
- Dates: use the helpers in `shared/utils/dates.ts`; date-only values are strings, never `new Date()`. Keep a single `dayjs` version installed.
- Call the API through the shared client with `VITE_HOST_API` as base URL; never hardcode URLs.
- Downloads use `downloadFile`; every import uses the shared `ImportModal`.
- No `any`, no `dangerouslySetInnerHTML`.
- Follow `react-hooks` and `react-refresh` lint rules.

## Testing
- Backend: Jest + ts-jest (`*.spec.ts` next to source), Supertest for e2e.
- Frontend: Vitest + React Testing Library (add when set up).
- Keep these tests green and update them when rules change: permission matrix (table-driven on both apps), transition rules table, score calculation, import validation order, audit masking.
- Add or update tests for any behavior you change.
- Before finishing, run lint, build, and tests for the packages you touched.

## Environment
- Backend `.env`: database, JWT secrets and expiry, `PORT`, `TZ`, `CORS_ORIGIN`, import limits, scheduler settings (see design-backend section 6).
- Frontend `.env`: `VITE_HOST_API`, `VITE_APP_NAME`, `VITE_IMPORT_MAX_FILE_SIZE_MB`, `VITE_DISPLAY_TZ`.
- Never commit `.env` files or secrets. Add new variables to `.env.example` and the design config tables.

## Documentation sync
- If a task changes a requirement, update the PRD first (version and change log), then the design docs, then code and tests, in the same change.
- Keep the "Based on: PRD vX.Y" line in each design doc equal to the PRD version.
- Do not copy PRD text into other docs; refer to PRD section numbers.
- When changing roles, permissions, statuses, or transitions, update every copy: PRD matrix, backend permissions and transition table, frontend `shared/permissions`, and their tests.
- Before finishing, search the repo for old terms or versions you replaced.

## Do not
- Add `package-lock.json` or `yarn.lock`.
- Edit files in `dist/` or other build output.
- Edit existing DB migrations.
- Update or delete audit records from application code.
- Hard delete master data or appraisals.
- Add new dependencies without asking first (prefer what is already installed; `helmet`, logging, and date libraries are intentionally not installed).
- Disable ESLint rules or TypeScript strictness to make errors go away.
- Change the `/api` prefix, auth flow, or workflow rules without asking.

## Workflow
- Small, focused changes. Do not refactor unrelated code.
- Format with Prettier and fix ESLint issues before finishing.
- Run `pnpm -r lint && pnpm -r build` before declaring a task done.
- Docker is used for containers. Do not change Dockerfiles or compose files unless the task requires it.