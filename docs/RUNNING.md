# Running the Project

Employee Performance Appraisal System — a pnpm monorepo (Node.js 24).

```
apps/backend    NestJS REST API (/api) + Drizzle + PostgreSQL
apps/frontend   React 18 + Vite + Ant Design + RTK Query
packages/types  @appraisal/types — shared API enums and request/response types
```

---

## 1. Prerequisites

- **Node.js 24**
- **pnpm 12** — enable via Corepack: `corepack enable` (the repo pins `pnpm@12.6.0`)
- **Docker** (optional) — for the PostgreSQL container
- **PostgreSQL 16** (if you don't use Docker)

> Use `pnpm` only. Never `npm` or `yarn`.

---

## 2. Install

From the repository root:

```bash
pnpm install
```

This installs all workspace projects and links `@appraisal/types`.

---

## 3. Environment files

Copy the examples and adjust as needed. Real `.env` files are gitignored.

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

**Backend (`apps/backend/.env`)**

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | API port |
| `TZ` | `Asia/Jakarta` | Scheduler / period dates |
| `DATABASE_URL` | `postgresql://appraisal:appraisal@localhost:5432/appraisal` | Must match the compose service |
| `JWT_SECRET` | a 32+ char secret | Access-token secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_SECRET` | a different secret | Optional; falls back to `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `CORS_ORIGIN` | `http://localhost:5173` | Frontend origin |
| `SWAGGER_ENABLED` | `true` | Set `false` in production |
| `SCHEDULER_ENABLED` | `true` | Day-1 appraisal job |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | `admin` / `secret` | Used by the seed script only |

Env values are **validated at boot**; the app refuses to start if required ones are missing.

**Frontend (`apps/frontend/.env`)**

| Variable | Example | Notes |
|---|---|---|
| `VITE_HOST_API` | `http://localhost:3000/api` | API base URL |
| `VITE_APP_NAME` | `Appraisal` | Window/layout title |

---

## 4. Database

Start PostgreSQL (Docker):

```bash
pnpm db:up        # docker compose up -d postgres
```

Apply migrations:

```bash
pnpm --filter backend migrate          # dev (ts-node)
# production images use:  pnpm --filter backend migrate:prod
```

Seed the first admin user and criteria set v1 (idempotent — safe to re-run):

```bash
pnpm --filter backend seed
```

Generate dummy data — 300 employees plus the departments, positions, and
contracts they depend on (idempotent; existing employee numbers are skipped):

```bash
pnpm --filter backend seed:employees                          # 300 (default)
SEED_EMPLOYEE_COUNT=500 pnpm --filter backend seed:employees  # custom count
```

Stop the database:

```bash
pnpm db:down
```

### Migrations

- The schema lives in `apps/backend/src/db/schema.ts`.
- Generate SQL with `pnpm --filter backend exec drizzle-kit generate --name <name>` (add `--custom` for raw SQL).
- Never edit an existing migration once it has been applied.

---

## 5. Run in development

Run both apps together (parallel):

```bash
pnpm dev
```

Or individually:

```bash
pnpm dev:be        # backend  → http://localhost:3000/api
pnpm dev:fe        # frontend → http://localhost:5173
```

- API base: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api` (when `SWAGGER_ENABLED=true`)
- Health check: `http://localhost:3000/api/health`
- Frontend: `http://localhost:5173`

Log in with the seeded admin (`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`) at `/login`.

---

## 6. Build

```bash
pnpm build                 # pnpm -r build: types → backend → frontend (topological order)
pnpm --filter backend build
pnpm --filter frontend build
```

`@appraisal/types` builds first; if you change a shared type, rebuild it or run
`pnpm --filter @appraisal/types dev` in a separate terminal.

---

## 7. Tests

```bash
pnpm test                  # backend (Jest) + frontend (Vitest)
pnpm --filter backend test
pnpm --filter frontend test
```

- Backend unit tests are `*.spec.ts` next to the source.
- Frontend tests are `*.spec.ts` under `src/`.
- The backend **e2e** suite (`pnpm --filter backend test:e2e`) needs the PostgreSQL container running.

---

## 8. Lint and format

```bash
pnpm lint                  # ESLint across the workspace
pnpm format                # Prettier across the workspace
```

Run `pnpm lint && pnpm build` before opening a pull request.

---

## 9. Docker (self-hosted)

Both apps ship multi-stage images. Build with the **repository root** as context:

```bash
docker build -f apps/backend/Dockerfile  -t appraisal-backend  .
docker build -f apps/frontend/Dockerfile -t appraisal-frontend .
```

- The frontend image serves static files through nginx, with SPA fallback and `/api` proxied to the `backend` service.
- Run migrations against the deployed database with the backend image: `node dist/db/migrate.js`.

---

## 10. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| App exits with "Environment validation failed" | A required env var is missing — check `apps/backend/.env`. |
| `ECONNREFUSED` to Postgres | Container not running: `pnpm db:up`. |
| Every request returns 401 | Log in first; the access token is held in memory and the refresh token in `sessionStorage`. A hard refresh re-authenticates automatically. |
| `@appraisal/types` type errors after editing shared types | Rebuild it: `pnpm --filter @appraisal/types build`. |
| Tables missing | Migrations not applied: `pnpm --filter backend migrate`. |
| Cannot log in after seeding | Confirm the seed ran and check the `SEED_ADMIN_*` values. |
