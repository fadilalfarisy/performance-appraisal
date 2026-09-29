# Technical Design Document (TSD)
**Project:** TaskFlow
**Version:** 1.0
**Related:** 01-prd.md

---

## 1. Tech Stack

| Layer              | Choice                           | Reason                                                                                                                                     |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend            | Node.js + NestJS (TypeScript)    | Modular, opinionated framework that maps to the project's current structure (modules, controllers, providers). Enables DI and testability. |
| Database           | PostgreSQL                       | Relational data model for employees, contracts, reports, and RBAC.                                                                         |
| ORM                | Drizzle ORM (pg-core)            | Lightweight TypeScript-first query/DDL with explicit schema in src/db/schema.ts; used throughout codebase.                                 |
| Auth               | JWT (passport-jwt + @nestjs/jwt) | Token-based auth with NestJS guards and JWT strategy implemented in src/auth.                                                              |
| Scheduler          | @nestjs/schedule                 | For recurring tasks (present in dependencies).                                                                                             |
| Testing            | Jest                             | Unit and integration testing (see package.json scripts).                                                                                   |
| Formatting/Linting | Prettier + ESLint                | Present in devDependencies — use existing configs for consistency.                                                                         |
| Language           | TypeScript                       | Strong typing across modules, DTOs, and database layer.                                                                                    |

**Locked decisions — update this doc if these choices change.**

---

## 2. Component Architecture

This repository uses a NestJS modular architecture. Each feature is organized as a Nest module exposing controller(s), service(s), and repository abstractions when needed. Key characteristics:

- Main entry: src/main.ts bootstraps the Nest application and loads AppModule (src/app.module.ts).
- Modules: each feature (auth, users, employees, departments, criteria, positions, roles, permissions, daily-records, assessments, reports, tasks, db, common) is implemented as a Nest module (src/<feature>/*).
- Controllers expose REST endpoints; services implement business logic; repositories contain DB access logic.
- Shared/common utilities (decorators, filters, interceptors, DTOs, validators) live in src/common/ and are reused across modules.
- Database access is encapsulated in src/db with schema definitions (src/db/schema.ts) and a DB module (src/db/db.module.ts).

Component flow (high level):

Client → HTTP request → Nest Controller → Service → Repository/DB (Drizzle) → Response

---

## 3. Folder structure (project-relevant)

- src/
  - src/app.module.ts, src/main.ts — application bootstrap
  - src/auth/ — authentication: jwt.strategy.ts, jwt-auth.guard.ts, auth.service.ts, auth.controller.ts
  - src/users/ — users controller, service, repository, DTOs, interfaces
  - src/employees/ — employee service, repository, controller, contracts.repository.ts
  - src/departments/, src/criteria/, src/positions/, src/roles/, src/permissions/ — feature modules with DTOs and repositories
  - src/daily-records/, src/assessments/, src/reports/ — input sources and reporting modules
  - src/db/ — Drizzle schema (schema.ts), db.module.ts, seed.ts
  - src/common/ — decorators, interceptors, filters, utilities
  - src/tasks/ — scheduled/background tasks module(s)

Config and scripts
- package.json — build, start, test, seed scripts (npm run seed uses ts-node to run src/db/seed.ts)

If adding agents or automation, prefer agents/ or tools/agents/ at repository root and document in docs/ and AGENTS.md.

---

## 4. Database Schema (overview)

The database schema is defined programmatically in src/db/schema.ts using Drizzle ORM pg-core. Key domain models (high level):

- users, roles, permissions, role_permissions — RBAC tables with many-to-many role-permission mapping.
- employees, departments, positions, contracts — employee HR model with enums for status, contract types, and gender.
- parent_criteria, child_criteria — appraisal criteria hierarchy (parent/child) with weights and versioning fields.
- daily_records — time-series input records for employees (scores, notes, supervisor references).
- reports, report_approvals, assessments — appraisal report lifecycle and approvals with statuses (DRAFT, PENDING, SUBMITTED, APPROVED, GM_REVIEW, DONE, REJECTED).
- dynamic_inputs — extensible metadata for forms and dynamic fields used by appraisal flows.

The schema uses:
- typed UUID primary keys via drizzle's uuid helper
- enums (pgEnum) for constrained status/gender/type fields
- base timestamp fields (created_at, updated_at, is_deleted, deleted_at) for soft deletes and auditing
- indices for common query patterns (username, nip, created_at desc, foreign keys)
- explicit relations wired via drizzle's relations helper

Refer to src/db/schema.ts for exact column definitions and relations.

---

## 5. API & Typical Endpoints

The codebase exposes REST endpoints via NestJS controllers. Representative endpoints (based on controllers under src/):

- Auth: POST /auth/signin, POST /auth/signup, (JWT flows guarded by jwt-auth.guard)
- Users: GET /users, GET /users/:id, POST /users, PATCH /users/:id
- Employees: GET/POST/PATCH for employees and contract management endpoints
- Departments/Positions/Criterion/Reports: CRUD and domain-specific operations for appraisal flows
- Daily records: POST /daily-records to ingest scores; GET for supervisor review
- Reports/Assessments: endpoints to generate, submit, approve, and fetch appraisal reports

All controllers use DTOs and class-validator for input validation; responses typically follow a consistent response-util in src/common/utils/response.util.ts.

---

## 6. Key Technical Decisions & Rationale (current)
- NestJS modules provide clear separation of concerns and make DI/testability straightforward.
- Drizzle ORM was chosen for a TypeScript-first schema and explicit SQL control while keeping type-safety.
- RBAC implemented via roles/permissions tables to allow flexible access control; users reference roles.
- Soft-delete & auditing fields are used across tables (is_deleted, deleted_at, created_at, updated_at).
- DTO + class-validator centralizes input validation and reduces duplicate checks in services.

---

## 7. Non-Functional Considerations
- Security: passwords are stored hashed (bcrypt present in dependencies). Use environment variables and @nestjs/config for secrets; never commit credentials.
- Observability: add structured logging (use NestJS logger or a structured logger) and include contextual IDs for multi-step operations.
- Performance: add indices where needed (schema.ts already contains indices for common lookups). Use pagination for large list endpoints.
- Testing: Jest is configured; add unit tests for services and controllers and integration tests using test DB and mocked dependencies.

---

If further adjustments are needed (for example to add detailed ER diagrams, sequence diagrams for report approval flows, or a mapping of DTOs to DB tables), indicate which area to expand and a focused update will be provided.