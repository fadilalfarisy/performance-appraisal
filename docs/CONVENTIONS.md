# Coding Conventions: Employee Performance Appraisal System

**Based on:** PRD v0.4, `DESIGN-BACKEND.md` v0.3, `DESIGN-FRONTEND.md` v0.3, and the current `apps/*` source.
**Scope:** naming, file and folder structure, and code style for `apps/backend` and `apps/frontend`.
**Status:** Draft v1.0

**Precedence:** the PRD wins on behavior, the design docs win on architecture, and this document standardizes naming, structure, and style. If they disagree, fix the doc here first, then the code.

---

## 1. Principles

- **Consistency beats preference.** Follow the rules below even when another style is familiar.
- **One name per concept.** The same entity keeps the same name from database to API to UI. Do not invent synonyms.
- **Explicit over clever.** Clear names, small functions, no abbreviations the team has not agreed on.
- **Types are documentation.** `strict` TypeScript everywhere. No `any`, no untyped cells crossing a boundary.
- **Enforce in tooling.** Prettier formats, ESLint checks, TypeScript type-checks. "It passes lint" is the bar, not a style review.
- **Tooling is pnpm.** Never `npm` or `yarn` (see `AGENTS.md`). Run scripts per app: `pnpm --filter <backend|frontend> <script>`.

---

## 2. Monorepo layout

```
performance-appraisal/
  apps/
    backend/          # NestJS REST API (/api)
    frontend/         # React SPA
  packages/
    types/            # @appraisal/types: shared API enums, envelope, request/response types
  docs/               # PRD, design docs, this file
  AGENTS.md
  pnpm-workspace.yaml
```

- `apps/*` are independent deployables. A package never imports from another app; shared code moves to `packages/*`.
- Root scripts run across the workspace (`pnpm -r build`, `pnpm -r lint`). Install only from the repo root.
- `apps/backend` currently uses a flat feature layout with `src/db`; `apps/frontend` uses `src/features`. Keep each app internally consistent.

**Shared API types (`@appraisal/types`)**

- `packages/types` is the single source of truth for the API contract: the shared enums (`UserRole`, `GenderEnum`, `ContractStatus`, `EmployeeStatus`, `CriteriaType`, `ColumnEmployee`), the `ApiResponse` envelope and `PaginationMeta`, and every request/response type.
- Both apps depend on it via `"@appraisal/types": "workspace:*"`. It is a built package (dual CJS + ESM output with `.d.ts`), so it works for the CJS backend and the ESM frontend.
- Backend DTO classes `implements` the matching shared request interface (validation decorators stay on the class); response payloads and enums are re-exported from the package rather than re-declared.
- Frontend RTK Query endpoints are typed with `ApiResponse<XResponse>` and the shared `CreateXRequest`/`UpdateXRequest` types; enum shims under `src/constants/enum` re-export from the package.
- Naming: `<Verb><Entity>Request`, `<Entity>Response`, `<Entity>Query`. Timestamps on response types are ISO `string` (the wire format).
- Build order matters: `pnpm -r build` builds `@appraisal/types` first (topological order). After changing a shared type, rebuild it — or run `pnpm --filter @appraisal/types dev` while developing.

---

## 3. General naming (TypeScript)

| Kind | Convention | Example |
|---|---|---|
| Variables, parameters, functions | `camelCase` | `departmentId`, `findActiveEmployee` |
| Classes, interfaces, type aliases, enums | `PascalCase` | `EmployeesService`, `Employee`, `Gender` |
| Enum members | `UPPER_SNAKE_CASE` | `EmployeeStatus.ACTIVE` |
| Constants (module-level, immutable) | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE` |
| Booleans | `is` / `has` / `can` / `should` prefix | `isActive`, `canEditRatings` |
| Async functions | verb, returns a Promise | `approveAppraisal()` |
| Files (backend, non-React) | `kebab-case` | `create-user.dto.ts` |
| Files (frontend, React components) | `PascalCase` | `UserForm.tsx` |
| Files (frontend, other) | `camelCase` | `dateUtils.ts`, `usersApi.ts` |

- No abbreviations except widely known ones (`id`, `url`, `api`, `dto`). Prefer `department` over `dept`.
- Name by meaning, not by type: `employees`, not `employeeListArray`.
- Do not prefix interfaces with `I`. `Employee`, not `IEmployee`.
- Singular for one item, plural for a collection. Types name one item; arrays and endpoints use the plural.

---

## 4. Backend conventions (`apps/backend`)

NestJS 11, TypeScript 5.7 (strict), Drizzle ORM, PostgreSQL. One module per feature.

### 4.1 Structure

```
apps/backend/src/
  main.ts                     # bootstrap: /api prefix, ValidationPipe, Swagger, CORS
  app.module.ts
  app.controller.ts           # health-style root endpoints only
  app.service.ts
  common/                     # cross-cutting, feature-agnostic
    decorators/               # <name>.decorator.ts
    filters/                  # <name>.filter.ts
    guards/                   # <name>.guard.ts
    interceptors/             # <name>.interceptor.ts
    exceptions/               # <name>.exception.ts
    query/                    # query.dto.ts (shared pagination/search DTO)
    utils/                    # <name>.util.ts
  db/
    schema.ts                 # Drizzle tables
    db.module.ts
    db.type.ts
    seed.ts
  <feature>/                  # plural, kebab-case: users, roles, departments, daily-records
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
    <feature>.repository.ts
    dto/                      # request/response DTOs
    interfaces/               # domain types
    enums/                    # feature enums
  test/                       # Supertest e2e tests
```

Rules:

- A feature folder is self-contained. Cross-feature reuse lives in `common/`, never by importing another feature's internals.
- Controllers contain HTTP only. Business rules live in services. Only repositories touch Drizzle.
- Keep feature folders **plural** and subfolders **plural** (`dto/`, `interfaces/`, `enums/`). The current singular variants (`interface/`, `enum/`, `position/`) are inconsistent; new code uses the plural form.

### 4.2 File naming

| File | Pattern | Example |
|---|---|---|
| Module | `<feature>.module.ts` | `users.module.ts` |
| Controller | `<feature>.controller.ts` | `users.controller.ts` |
| Service | `<feature>.service.ts` | `users.service.ts` |
| Repository | `<feature>.repository.ts` | `users.repository.ts` |
| Sub-resource repository | `<sub-resource>.repository.ts` | `contracts.repository.ts` |
| Create DTO | `dto/create-<entity>.dto.ts` | `dto/create-department.dto.ts` |
| Update DTO | `dto/update-<entity>.dto.ts` | `dto/update-department.dto.ts` |
| Query DTO | `dto/<entity>-query.dto.ts` | `dto/department-query.dto.ts` |
| Response DTO | `dto/<entity>-response.dto.ts` | `dto/department-response.dto.ts` |
| Domain interface | `interfaces/<entity>.interface.ts` | `interfaces/employee.interface.ts` |
| Enum | `enums/<name>.enum.ts` | `enums/gender.enum.ts` |
| Guard / strategy / decorator | `<name>.guard.ts`, `.strategy.ts`, `.decorator.ts` | `roles.guard.ts`, `jwt.strategy.ts` |
| Unit test | `<name>.spec.ts` (next to source) | `departments.service.spec.ts` |

- One primary export per file; the file name matches the export in kebab-case.
- Do not suffix files with `.types.ts` on the backend; use `interfaces/` or `dto/`.

### 4.3 Class and symbol naming

| Symbol | Convention | Example |
|---|---|---|
| Feature class | `<Feature>` | `UsersController`, `UsersService`, `UsersRepository`, `UsersModule` |
| DTO | `Create<Entity>Dto`, `Update<Entity>Dto`, `<Entity>QueryDto`, `<Entity>ResponseDto` | `CreateUserDto` |
| Interface | `<Entity>` | `Employee`, `Contract` |
| Enum | `<Name>` (members UPPER_SNAKE) | `Gender.MALE` |
| Guard | `<Name>Guard` | `RolesGuard`, `JwtAuthGuard` |
| Decorator | `<name>()` camelCase function | `@CurrentUser()` |

### 4.4 DTOs and validation

- Validate every input with `class-validator` and `class-transformer`; the global `ValidationPipe` uses `whitelist` and `forbidNonWhitelisted`.
- Document every endpoint and DTO field with `@nestjs/swagger` (`@ApiTags`, `@ApiOperation`, `@ApiProperty` / `@ApiPropertyOptional`).
- Import `PartialType`, `OmitType`, and similar helpers from `@nestjs/swagger`, not `@nestjs/mapped-types`.
- DTOs are for transport only. Never return a raw database row; map to a response DTO.

### 4.5 Repository and data rules

- Only repositories import Drizzle tables and build queries.
- Always filter soft-deleted rows through the shared helper (`notDeleted()`); never hand-write `deleted_at IS NULL` in a service.
- Database naming: tables `snake_case` plural, columns `snake_case`, TypeScript fields `camelCase` (`department_id` → `departmentId`).
- Roles are a fixed enum (`UserRole` in `users/enums/user-role.enum.ts`, mirrored by the `user_role` database enum) stored on `users.role`. There is no roles or permissions CRUD; permission rules live in code (`permissions.ts`), not in tables.
- Soft delete only (`deleted_at` / `deleted_by`). Master data and appraisals are never hard deleted.
- Write the change and its audit entry in the same transaction.

### 4.6 Routes, errors, and config

- All routes live under the global `/api` prefix. Route segments are `kebab-case` plural: `/api/appraisal-status-history`, `/api/daily-records`.
- Error responses use the shared shape `{ statusCode, code, message, details }`; `code` is `UPPER_SNAKE_CASE` (`APPRAISAL_INVALID_TRANSITION`).
- Use the shared HTTP status mapping: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found (also out-of-scope), 409 conflict, 422 business rule.
- Read configuration through `ConfigService`; never use `process.env` directly. Add new variables to `.env.example` and the design config tables.
- Enforce role and department scope on the server for every endpoint. Out-of-scope records return 404.

### 4.7 Tests

- Jest + ts-jest. Unit tests are `*.spec.ts` next to the source; e2e tests use Supertest under `test/`.
- Keep these suites green and update them when rules change: permission matrix, transition rules, score calculation, import validation order, audit masking.

---

## 5. Frontend conventions (`apps/frontend`)

React 18, TypeScript 5.7 (strict), Vite 7, Redux Toolkit (RTK Query), Ant Design 5, react-router-dom 6, dayjs.

### 5.1 Structure

```
apps/frontend/src/
  main.tsx
  app/                        # store.ts, typed hooks.ts, providers
  api/                        # apiSlice.ts (RTK Query base, re-auth)
  components/                 # shared UI (AppLayout, DataTable, ImportModal, ...)
  constants/                  # enums/, options/, roleAccess.ts
  features/<feature>/         # plural, kebab-case: users, employees, departments
    <feature>Api.ts           # injectEndpoints on apiSlice
    index.ts                  # barrel exports
    pages/                    # route-level screens
    components/               # feature-only components
  styles/                     # global css, theme tokens
  utils/                      # dates, errors, strings, score
```

Rules:

- Features never import another feature's components. Shared pieces move to `components/`, `utils/`, or `constants/`.
- Feature folders are **plural** (`users`, `employees`). The current singular folders (`position`, `report`, `permission`) should converge to plural; mixed pairs like `position`/`positionsApi.ts` are the cases to fix first.
- `app/` holds app wiring only (store, hooks, providers). Route tables drive the menu and access.

### 5.2 File naming

| File | Pattern | Example |
|---|---|---|
| API slice | `<feature>Api.ts` | `usersApi.ts`, `contractApi.ts` |
| Feature barrel | `index.ts` | `features/users/index.ts` |
| Page component | `PascalCase.tsx` | `User.tsx`, `CreateUser.tsx`, `UpdateUser.tsx` |
| Shared/feature component | `PascalCase.tsx` | `UserForm.tsx`, `EmployeeSearch.tsx` |
| Hook | `use<Name>.ts` | `useDebounce.ts`, `useTableQuery.ts` |
| Utility | `<name>Utils.ts` | `dateUtils.ts`, `errorUtils.ts` |
| Redux slice | `<name>Slice.ts` | `authSlice.ts` |
| Constants / enums | `<name>.enum.ts`, `<name>.ts` | `constants/enum/gender.enum.ts` |
| Types | `types.ts` (per feature) | `features/employees/types.ts` |
| Test | `<Name>.test.tsx` | `UserForm.test.tsx` |

### 5.3 Components

- Function components with hooks only. One component per file, default or named export, file name matches the component.
- UI text is English; no i18n library. Show messages with `App.useApp()`, never static `message` calls.
- Use Ant Design components and `@ant-design/icons` only. Import AntD by component so Vite can tree-shake.
- No `any`, no `dangerouslySetInnerHTML`. Render user text as text so React escapes it.

### 5.4 Hooks

- Custom hooks start with `use`, live in a feature's folder or `shared`/`hooks`, and return a stable, typed shape.
- Read and write list state (page, sort, filters, search) through the URL via the shared `useTableQuery` hook, so back/refresh/share keep the same view.

### 5.5 Server data (RTK Query)

- All server data goes through `apiSlice.injectEndpoints`. No axios, no hand-written fetch thunks.
- Endpoint names: `get<Thing>`, `get<Thing>ById`, `create<Thing>`, `update<Thing>`, `delete<Thing>`. Generated hooks are `useGet<Thing>Query`, `useCreate<Thing>Mutation`, etc.
- Tag types are PascalCase plural (`Users`, `Employees`, `Departments`) and are declared once in `apiSlice`.
- Never copy server data into a Redux slice. Slices hold only auth, unsaved grid edits, and small UI state.
- Tokens: access token in memory only, refresh token in `sessionStorage`; refresh is single-flight.

### 5.6 Redux slices and state

- Keep state serializable: dates are ISO strings, never `dayjs` objects.
- Slices live in their feature (`features/auth/authSlice.ts`) and use the typed hooks from the app store.

### 5.7 Constants, utilities, and types

- Role/status/permission constants live in `constants/`; permission checks go through `shared/permissions` and mirror the PRD matrix. The backend stays the authority.
- Dates use the helpers in `utils/dateUtils.ts`; date-only values are strings (`YYYY-MM-DD`), never `new Date()` for calendar dates.
- API types are written by hand from the Swagger contract and kept per feature in `types.ts`.
- Call the API through the shared client with `VITE_HOST_API` as the base URL. Never hardcode URLs.

### 5.8 Styling

- Styling is Ant Design tokens plus `styles/theme.ts` (one `ConfigProvider`). No global CSS beyond reset and theme setup.
- Status colors are defined once (a `StatusTag` component), not per screen.

### 5.9 Tests

- Vitest + React Testing Library; tests are `*.test.tsx` next to the source (add tooling as a dev dependency first, per `DESIGN-FRONTEND.md` 2.4).
- Cover permissions, scoring, date helpers, and the import modal; mirror the backend score and permission cases.

---

## 6. Formatting and linting

- **Prettier is the single source of formatting truth.** The repo standard is `apps/backend/.prettierrc`:

  ```json
  { "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100, "tabWidth": 2, "arrowParens": "always" }
  ```

  Add the same config to `apps/frontend` so both apps match.
- **ESLint 9** (flat config) in both apps. Never disable a rule to silence an error; fix the code or record the exception in this document.
- **TypeScript `strict`** in both apps; no `any`, no `@ts-ignore` without a linked issue.
- Run `pnpm -r lint && pnpm -r build` before declaring any task done.

---

## 7. Git, branches, and commits

- **Branches:** `<type>/<short-kebab-topic>`, e.g. `feat/appraisal-import`, `fix/contract-overlap`, `docs/conventions`.
- **Commits:** Conventional Commits — `<type>(<scope>): <subject>`, imperative, subject ≤ 72 chars.
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.
  - Scope is the app or feature: `feat(backend): ...`, `fix(frontend): ...`.
  - The body explains *why*, not *what*. Reference the issue when one exists.
- Keep changes small and focused. Do not refactor unrelated code in the same commit.
- Commit only when the task asks for it. Never commit `.env` files or secrets.

---

## 8. Documentation sync

- If a task changes a requirement: update `docs/PRD.md` first (version and change log), then `DESIGN-BACKEND.md` / `DESIGN-FRONTEND.md`, then code and tests, in the same change.
- Keep each design doc's "Based on: PRD vX.Y" line equal to the PRD version.
- When roles, permissions, statuses, or transitions change, update every copy: PRD matrix, backend permissions and transition table, frontend `shared/permissions`, and their tests.
- Before finishing, search the repo for old terms or versions you replaced.

---

## 9. Quick reference

**Backend file suffixes**

| Concern | Suffix |
|---|---|
| Module / controller / service / repository | `.module.ts` / `.controller.ts` / `.service.ts` / `.repository.ts` |
| DTO | `.dto.ts` (`create-`, `update-`, `-query`, `-response`) |
| Domain type | `.interface.ts` |
| Enum | `.enum.ts` |
| Guard / strategy / decorator / filter / interceptor | `.guard.ts` / `.strategy.ts` / `.decorator.ts` / `.filter.ts` / `.interceptor.ts` |
| Utility | `.util.ts` |
| Unit test | `.spec.ts` |

**Frontend file suffixes**

| Concern | Suffix |
|---|---|
| Component / page | `.tsx` (PascalCase) |
| API slice | `Api.ts` |
| Hook | `use*.ts` |
| Slice | `Slice.ts` |
| Utility | `Utils.ts` |
| Enum / constant | `.enum.ts` / `.ts` |
| Barrel | `index.ts` |
| Test | `.test.tsx` |

**Casing**

| Layer | Casing |
|---|---|
| Database table / column | `snake_case` plural |
| Backend folder | `kebab-case` plural |
| TypeScript symbol | `camelCase` / `PascalCase` |
| REST route | `kebab-case` plural under `/api` |
| React component | `PascalCase` |
| RTK Query tag | `PascalCase` plural |
| Env variable | `UPPER_SNAKE_CASE` |
| Error code | `UPPER_SNAKE_CASE` |

---

## 10. Do not

- Use `npm` or `yarn`; use `pnpm` from the repo root.
- Add a dependency without asking first (see `AGENTS.md`).
- Import Drizzle tables outside a repository, or write to `audit_logs`.
- Hard delete master data or appraisals (soft delete only).
- Edit existing migrations, files in `dist/`, or build output.
- Set an appraisal `status` directly; go through the transition table and workflow service.
- Disable ESLint rules or loosen TypeScript strictness to make errors go away.
- Change the `/api` prefix, the auth flow, or workflow rules without asking.
