# AGENTS.md
Instructions for AI coding assistants (Claude Code, Cursor, etc.) working on this repo.
Read this before generating any code.

---

## Project Description
- Repository: performance-appraisal-backend
- Short: A NestJS (TypeScript) backend for a performance appraisal system. Key features implemented in src/ include authentication (JWT), user and employee management, departments, positions, role-based access control (roles/permissions), appraisal criteria (parent/child), daily records ingestion, reports and approvals, and assessment flows. Database schema is defined in src/db/schema.ts using Drizzle ORM (pg-core).
Full context: `/docs/01-prd.md` (what/why) and `/docs/02-technical-design.md` (how).

## Tech Stack (do not change without updating 02-technical-design.md)
- Backend: Node.js + NestJS (TypeScript) — modular, DI, and testable framework used throughout src/
- Database: PostgreSQL with Drizzle ORM (pg-core) — schema defined in src/db/schema.ts
- Auth: JWT via passport-jwt and @nestjs/jwt (implemented in src/auth)
- Testing: Jest (unit and integration tests)
- Formatting/Linting: Prettier + ESLint (devDependencies present)
- Language: TypeScript (strict typings preferred)

## File Structure
```
src/                      → application source (NestJS modules)
  src/main.ts             → application bootstrap
  src/app.module.ts       → root module wiring feature modules
  src/auth/               → authentication (jwt.strategy.ts, guards, DTOs)
  src/users/              → users controller, service, repository, DTOs
  src/employees/          → employees, contracts repository
  src/departments/, src/criteria/, src/positions/, src/roles/, src/permissions/ → feature modules
  src/daily-records/, src/assessments/, src/reports/ → appraisal flows and reporting
  src/db/                 → Drizzle schema (schema.ts), db.module.ts, seed.ts
  src/common/             → shared decorators, filters, interceptors, utils
  src/tasks/              → scheduled/background jobs
docs/                     → PRD, TSD, agent guidance, and operational docs
AGENTS.md                 → top-level agent guidance summary
docs/agents.md            → agents-focused context and patterns
```

## Coding Conventions

**General**
- Follow NestJS idioms: modules, controllers, services, and providers. Keep controllers thin and delegate business logic to services.
- Use TypeScript with strict typings. Avoid `any`; prefer explicit interfaces and types.
- Naming: camelCase for variables and functions, PascalCase for classes and controllers, kebab-case for filenames.
- Prefer named exports for library code; default exports are acceptable for small single-purpose files.
- Run formatting and linting: npm run format and fix lint warnings before committing.

**DTOs & Validation**
- Use class-validator and class-transformer for DTO validation. Place DTOs in src/<feature>/dto.
- Enable the global ValidationPipe in src/main.ts to enforce DTO validation at controller boundaries.

**Backend**
- Controllers must be thin and orchestrate services; services implement business rules and coordinate repositories.
- Encapsulate DB access in repository classes (files named *.repository.ts) that use Drizzle queries.
- Use NestJS HttpException (or custom exceptions) and the common exception filters to produce a consistent error response shape.

**Database**
- Database schema is defined in src/db/schema.ts using Drizzle ORM; prefer repository methods for queries.
- Avoid raw SQL in controllers; if raw SQL is necessary, isolate it behind repository code with tests and careful review.
- Use soft-delete fields (is_deleted, deleted_at) and created_at/updated_at for auditing.

**Tests**
- Write unit tests with Jest for services and controllers. Add integration tests that exercise repository methods against a test database or mocked DB layer.
- Place tests near the modules they cover (e.g., src/users/users.service.spec.ts).


## Common Patterns to Use

**API client call (frontend):**
```ts
// /client/src/api/tasks.ts
export async function getTasks(filters: TaskFilters): Promise<Task[]> {
  const res = await fetch(`/api/tasks?${buildQuery(filters)}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new ApiError(await res.json());
  return (await res.json()).data;
}
```

**Route handler (backend):**
```ts
// /server/src/routes/tasks.ts
router.post('/tasks', authenticate, async (req, res, next) => {
  try {
    const task = await taskController.create(req.user.id, req.body);
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
});
```

## What NOT to Do
- Don't introduce a new state management library (Redux, Zustand) — React Context is sufficient at this scale
- Don't add new npm dependencies without checking if the stdlib or existing deps already cover it
- Don't hardcode secrets — always use `process.env`, reference `.env.example` for required keys
- Don't write raw SQL — prefer Drizzle ORM via repository methods; if raw SQL is necessary, isolate it in a repository layer and include tests.

## When Unsure
If a requirement is ambiguous, check `/docs/01-prd.md` first. If still unclear, flag it as a question in your response rather than guessing.