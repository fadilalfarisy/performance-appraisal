# Testing Strategy — NestJS Best Practices
**Project:** performance-appraisal-backend (NestJS + Drizzle)

---

## 1. Testing Philosophy
- Tests are first-class: every new feature or bugfix must include tests that cover the happy path and at least one meaningful edge case or failure mode.
- AI-generated changes should include tests in the same change/pr — do not add code without tests that validate it.
- Prefer deterministic, fast, and isolated tests. Reserve slow integration/e2e tests for flows that exercise multiple components and external dependencies.

---

## 2. Test Types & Tools
| Type        | Tool / Pattern                         | Scope / Purpose |
|-------------|-----------------------------------------|-----------------|
| Unit        | Jest + @nestjs/testing (TestingModule)  | Services, providers, utility functions. Fast, mocked dependencies.
| Integration | Jest + Supertest + Test.createTestingModule | Controllers + pipes/guards + repository code. Run against a test DB (in-memory or container).
| E2E         | Jest + Supertest / CI test containers   | Full app boot (app.init()) exercising HTTP stack, auth, DB migrations; used sparingly in CI.
| Test DB     | Testcontainers (Postgres) or ephemeral DB | Real DB behavior for integration/e2e tests; alternatively, use a dedicated test Postgres instance and reset schema between runs.

Scripts (package.json): use npm run test (unit), npm run test:e2e (e2e), npm run test:cov for coverage.

---

## 3. Unit testing best practices (services, utils)
- Scope: test a single unit in isolation (e.g., a service class). Mock all external dependencies (repositories, HTTP clients, queues).
- Use @nestjs/testing's Test.createTestingModule to build a TestingModule and override providers with mocks via module.overrideProvider(MyRepo).useValue(mock).
- Keep unit tests fast and deterministic. Avoid touching the DB or network.
- Test behavior, not implementation details. Assert on outputs, exceptions, and interactions (spy calls).

Example: unit test for a UsersService
```ts
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  const mockUsersRepo = { findById: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: mockUsersRepo }],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('returns a user when repository finds one', async () => {
    mockUsersRepo.findById.mockResolvedValue({ id: 'abc', username: 'alice' });
    const user = await service.getById('abc');
    expect(user.username).toBe('alice');
    expect(mockUsersRepo.findById).toHaveBeenCalledWith('abc');
  });
});
```

Mocking tips
- For complex providers, create small factory helpers that return a typed mock object.
- Use jest.spyOn(instance, 'method').mockResolvedValue(...) to selectively mock behavior while retaining other real methods.
- Prefer explicit mocks over jest.auto-mocking to keep tests readable.

---

## 4. Integration tests (controllers, pipes, guards, repository methods)
- Purpose: exercise a slice of the stack (controller → service → repository) with realistic wiring. Use Drizzle repository code to execute queries against a test DB.
- Strategy options:
  - Lightweight: Create a TestingModule, instantiate the controller and mock only external services, but use the real repository implementation with a test database connection.
  - Full-stack: Boot the Nest application (module.createNestApplication) and use Supertest against app.getHttpServer(); this tests guards, pipes, interceptors, and global filters.
- Use a dedicated test database. Options:
  - Testcontainers (recommended for CI): spin up a fresh Postgres container per CI job.
  - Local ephemeral DB: create a test schema and run migrations before tests, rollback or truncate between tests.
  - In-memory strategies are not available for Postgres; prefer Testcontainers or a disposable Postgres instance.

Example: controller integration test using Supertest
```ts
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UsersController (integration)', () => {
  let app;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    // Optionally seed test DB here
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users creates a user', async () => {
    const res = await request(app.getHttpServer()).post('/users').send({ username: 'bob', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });
});
```

DB lifecycle
- Before integration/e2e tests: run schema setup/migrations (for Drizzle, invoke the schema SQL or use migration tooling).
- Between tests: either run each test in a transaction and roll it back, or truncate relevant tables to ensure isolation.
- Avoid relying on global state between tests.

---

## 5. E2E tests & CI
- E2E tests should boot the full app and exercise real auth flows and DB interactions.
- Run e2e tests in CI using a test container (Testcontainers or service container) to mirror production behavior.
- Keep E2E suites focused and limited in number; they are slower and flaky tests hurt throughput.
- Use environment variables (.env.test) to configure test DB and credentials. Do not commit secrets.

Example CI workflow snippet (high level):
- Start Postgres service (or Testcontainer)
- Run DB migrations/seeds
- Run npm run test:e2e

---

## 6. Testing async code, schedulers, and jobs
- For scheduled tasks (@nestjs/schedule), unit-test the job handlers directly by calling the service method and mocking time-based functions with jest.useFakeTimers when needed.
- For background tasks that interact with queues or external APIs, mock the connectors in unit tests and write a small integration test validating end-to-end message handling with a test queue in CI if necessary.

---

## 7. Testing third-party integrations
- Mock external API clients in unit tests. Keep recorded fixtures for integration tests if the external API is stable and allowed by terms.
- For LLMs or paid services, never call the real API from CI. Use mocks or a local stub that returns canned responses.

---

## 8. Quality gates & coverage
- Coverage targets (guideline):
  - Services & repositories: 80% line coverage
  - Controllers & pipes: 70%
  - E2E: exercise critical flows, coverage measured but lower threshold acceptable
- Prefer meaningful tests over artificially raising coverage numbers. CI should fail on uncovered critical modules.

---

## 9. Test ergonomics & developer experience
- Provide test helpers: factories for test data, token helpers for auth, test DB setup/teardown scripts.
- Keep tests readable: Arrange-Act-Assert, avoid complex setup in each test; factor common setup into beforeEach/fixtures.
- Make it easy to run a single test or test file locally (npm run test -- path/to/file).

---

## 10. What AI Should Always Do
- When generating a new endpoint, include unit tests for the service and an integration test for the controller in the same change.
- Add regression tests when fixing bugs.
- Mock external services and avoid committing secrets or real API keys in tests.
- Prefer explicit, small test suites over broad, brittle tests; flag any flakiness and suggest improvements.

---

If desired, can scaffold a test helper in src/test-utils/ (factories, token helper, test DB scripts), or add GitHub Actions job examples for running Testcontainers in CI.