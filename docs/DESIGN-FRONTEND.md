# Frontend Design: Employee Performance Appraisal System

**Based on:** PRD v0.4, `DESIGN-BACKEND.md` v0.3, and the installed dependencies in `apps/frontend/package.json`
**Scope:** `apps/frontend` only (React 18, Vite 7, TypeScript 5.7, Redux Toolkit, Ant Design 5, `@ant-design/icons`, dayjs, react-router-dom 6).
**Status:** Draft v0.3 (aligned with installed dependencies and PRD v0.4)

---

## 1. Decisions that go beyond the PRD

The PRD and backend design do not specify these, so this document decides them. Review them first.

| # | Decision | Reason |
|---|---|---|
| 1 | Server data is handled by **RTK Query** (part of `@reduxjs/toolkit`). No axios, no hand-written fetch thunks. | No extra dependency; caching, loading and error states, and tag invalidation come built in. |
| 2 | Access token lives **in memory only** (Redux state). Refresh token is kept in `sessionStorage`. | Works with the current backend design (tokens in JSON bodies) without backend changes. Closing the tab ends the session. Upgrade path: httpOnly cookie for the refresh token, which needs a backend change (see section 18). |
| 3 | Token refresh is **single-flight**: only one refresh request at a time; other 401 requests wait for it. | The backend rotates refresh tokens and revokes all tokens on reuse. Two parallel refresh calls would log the user out. |
| 4 | Redux holds only auth state, unsaved grid edits, and small UI state. Server data is never copied into slices. | One source of truth for server data (the RTK Query cache). |
| 5 | Nothing non-serializable goes in Redux: dates are ISO strings, never `dayjs` objects. | Redux Toolkit's serializability check and predictable state. |
| 6 | Permission checks in the UI mirror the backend rules (roles, status, department scope) in one tested module. The backend remains the authority. | Hide or disable actions the user cannot perform; still handle 403 and 404 gracefully. |
| 7 | Routing uses `createBrowserRouter` (data router). | Needed for `useBlocker` (warn about unsaved ratings). |
| 8 | List screens keep page, sort, filters, and search in the **URL query string**. | Back button, refresh, and shared links keep the same view. |
| 9 | UI language is English; no i18n library. | Not required by the PRD. Text stays in components for now. |
| 10 | API types are written by hand from the Swagger contract. | Fewer tools for v1. Generating types from OpenAPI is an option later. |
| 11 | Dependency hygiene: TypeScript on a stable 5.7.x (not a beta range), `@types/node` 24 to match the backend, and exactly one `dayjs` version installed. | A beta compiler is unpredictable; a second `dayjs` copy would leave the plugins unapplied to Ant Design date pickers. |

## 2. Tech stack and dependencies

### 2.1 Installed packages

| Concern | Package | Version range |
|---|---|---|
| UI framework | `react`, `react-dom` | `^18.3.1` |
| Component library | `antd` | `^5.21.6` |
| Icons | `@ant-design/icons` | `^5.5.1` |
| State and server data | `@reduxjs/toolkit` (includes RTK Query), `react-redux` | `^2.5.0`, `^9.2.0` |
| Routing | `react-router-dom` | `^6.28.0` |
| Dates | `dayjs` (plugins `customParseFormat`, `utc`, `timezone` ship with it) | `^1.11.13` |
| Build | `vite`, `@vitejs/plugin-react` | `^7.1.5`, `^4.3.3` |
| Language | `typescript`, `@types/react`, `@types/react-dom`, `@types/node` | see 2.2 |
| Lint | `eslint` 9, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` | |

Forms use the Ant Design `Form` that comes with `antd`. File upload and download use the browser's `fetch`/`Blob` and Ant Design `Upload`. The dev proxy is a Vite built-in.

### 2.2 Version rules

| Package | Rule |
|---|---|
| `typescript` | Use stable `^5.7.3`. Do not use the `5.7.0-beta` range |
| `@types/node` | Use `^24.0.0` to match the Node 24 used by the backend (only use a newer major if the runtime really is newer) |
| `dayjs` | Keep one version in the tree. Check with `pnpm why dayjs` after install. Ant Design's date components use dayjs, so a second copy would not get the plugins from section 9 |
| `vite` | 7.x needs Node 20.19+ or 22.12+; Node 24 is fine |
| `@vitejs/plugin-react` | The lockfile must resolve to a 4.x release that supports Vite 7 (4.7 or newer) |
| `react` | Stay on 18 until Ant Design, Redux, and the router are verified with a newer React |
| `globals` | Align with the backend (`^17`) |

### 2.3 Not installed, and how the design handles it

| Missing | Handling |
|---|---|
| axios | RTK Query `fetchBaseQuery` |
| Form library | Ant Design `Form` |
| lodash | Small `useDebounce` hook in `shared/hooks` |
| Drag and drop | Up and down buttons for criteria order |
| i18n | English UI text, no library |
| Prettier | **Recommended:** add `prettier` and `eslint-config-prettier` so formatting matches the backend |
| Test tools | **Recommended**, see 2.4 |

### 2.4 Test tooling to add (dev dependencies)

```bash
pnpm --filter frontend add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Use a Vitest release that supports Vite 7. Vitest reads `vite.config.ts` (`test: { environment: 'jsdom', setupFiles: [...] }`). Unit tests for permissions, scoring, and dates also run without jsdom. Add `test` and `test:watch` scripts to `package.json`.

## 3. Project structure

```
apps/frontend/
  index.html
  vite.config.ts                # dev proxy /api → backend
  src/
    main.tsx
    app/
      App.tsx                   # ConfigProvider, AntD <App>, RouterProvider
      store.ts                  # configureStore, typed hooks
      router.tsx                # route table (also drives the menu)
      providers/                # theme, dayjs setup, auth bootstrap
    config/
      env.ts                    # typed import.meta.env
      constants.ts              # roles, statuses, date formats
    features/
      auth/                     # authSlice, authApi, LoginPage, tokenStorage
      users/
      departments/
      positions/
      employees/
      contracts/
      criteria/                 # list, history, set editor
      appraisals/               # list, create wizard, detail (grid), workflow
      audit/
    shared/
      api/                      # baseApi, baseQuery with reauth, error mapping, download helper
      components/               # AppLayout, PageHeader, DataTable, ImportModal, StatusTag, ConfirmAction, ErrorBoundary
      hooks/                    # useTableQuery (URL state), useDebounce, useUnsavedChanges
      permissions/              # role constants, can(), getAvailableActions()
      utils/                    # dates, score, period, format
      types/                    # API types, Page<T>, ApiError
    pages/                      # NotFound, Forbidden
```

Feature folders follow the same shape:

```
features/employees/
  employeesApi.ts               # RTK Query endpoints (injectEndpoints on baseApi)
  EmployeesPage.tsx             # list + toolbar
  EmployeeFormDrawer.tsx
  types.ts
```

Rules:
- Pages compose components and call hooks. Business rules live in `shared/permissions`, `shared/utils`, or the backend.
- A feature never imports another feature's components. Shared pieces move to `shared/`.

## 4. Configuration

| Variable | Example | Purpose |
|---|---|---|
| `VITE_HOST_API` | `/api` | API base URL. In development a Vite proxy forwards `/api` to the backend, so no CORS is needed |
| `VITE_APP_NAME` | `Appraisal` | Title in layout and tab |
| `VITE_IMPORT_MAX_FILE_SIZE_MB` | `5` | Early client check; backend value (`IMPORT_MAX_FILE_SIZE_MB`) is authoritative |
| `VITE_DISPLAY_TZ` | `Asia/Jakarta` | Time zone for displaying timestamps |

`env.ts` reads and validates these once at startup. A `.env.example` is committed; real `.env` files are not.

## 5. Data layer (RTK Query)

### 5.1 Base API

- One `baseApi = createApi({ baseQuery: baseQueryWithReauth, tagTypes: [...], endpoints: () => ({}) })`.
- Each feature adds endpoints with `baseApi.injectEndpoints`.
- `fetchBaseQuery` sets `baseUrl = VITE_HOST_API` and adds `Authorization: Bearer <accessToken>` from the store.
- Tag types: `User`, `Department`, `Position`, `Employee`, `Contract`, `CriteriaSet`, `Appraisal`, `AuditLog`.

### 5.2 Re-authentication

```
request ──401──► is a refresh already running?
                    ├─ yes → wait for it
                    └─ no  → start refresh (one shared promise)
                 refresh ok  → store new tokens → retry the original request once
                 refresh fail → clear session → redirect to /login
```

- `/auth/login` and `/auth/refresh` themselves never trigger a refresh.
- Retry only once per request to avoid loops.

### 5.3 Errors

The backend error format (`statusCode`, `code`, `message`, `details`) is normalized into an `ApiError` object by one function.

| Status | UI behavior |
|---|---|
| 400 | Field errors from `details` are shown inline on the form |
| 401 | Handled by re-auth; if it fails, go to login with a "session expired" message |
| 403 | Forbidden page (route level) or message toast (action level) |
| 404 | Not found page (route level) or message |
| 409 | Message with the conflict reason (e.g. employee number exists, appraisal already exists for this department and month) |
| 422 | Message with the business rule text; for imports see section 11 |
| network / 5xx | Generic error notification with a retry option |

Global toasts use the Ant Design `App` context (`App.useApp()`), not static `message` calls, so they follow the theme.

### 5.4 Cache invalidation

| Action | Invalidates |
|---|---|
| Create, update, deactivate master data | List tag and item tag of that entity |
| Import (employees, contracts) | The entity's list tag |
| Save ratings, assessment import | `Appraisal` item tag |
| Workflow transition, send back, reopen | `Appraisal` item and list tags (status and history change) |
| Activate criteria set | `CriteriaSet` list, active set, and appraisal "create" previews |

## 6. Authentication and session

1. **Login:** `POST /auth/login` → `{ accessToken, refreshToken, user }`. Access token goes to Redux; refresh token goes to `sessionStorage` through `tokenStorage.ts` (every read and write wrapped in try/catch).
2. **App start (bootstrap):** if a refresh token exists, call `/auth/refresh`, then `GET /auth/me`, while a full-page spinner shows. If anything fails, show the login page.
3. **Requests:** the access token is attached automatically; renewal follows section 5.2.
4. **Logout:** call `/auth/logout`, clear Redux auth and `sessionStorage`, reset the API cache (`baseApi.util.resetApiState()`), go to `/login`.
5. **Deactivated user or role change:** the next API call returns 401 or 403; the session is cleared.
6. After login, the user returns to the page they originally requested (`from` in router state).

## 7. Routing, menu, and permissions

### 7.1 Routes

| Route | Page | Roles |
|---|---|---|
| `/login` | Login | public |
| `/appraisals` | Appraisal list (home) | all |
| `/appraisals/new` | Create appraisal wizard | HR |
| `/appraisals/:id` | Appraisal detail (table, actions, history) | all (scope) |
| `/employees` | Employees | all (read), ADMIN and HR write |
| `/contracts` | Contracts | all (read), ADMIN and HR write |
| `/departments` | Departments | all (read), ADMIN write |
| `/positions` | Positions | all (read), ADMIN write |
| `/criteria` | Criteria sets (versions) | all (read), ADMIN and HR write |
| `/criteria/:id` | Criteria set view or editor | all (read), ADMIN and HR edit DRAFT |
| `/users` | User management | ADMIN |
| `/audit-logs` | Audit trail | ADMIN, HR |
| `/403`, `*` | Forbidden, Not found | |

The route table holds `path`, `element` (lazy loaded with `React.lazy`), `roles`, `menuLabel`, `menuIcon`. The same table builds the side menu, so a role never sees a menu item it cannot open.

### 7.2 Guards

- `RequireAuth`: redirects to `/login` when there is no session.
- `RequireRole`: shows the 403 page when the role is not allowed.

### 7.3 Permission module (`shared/permissions`)

Pure functions, unit tested with a table that mirrors PRD section 5.8:

- `canAccessRoute(role, route)`
- `canWriteMaster(role, entity)`: employee and contract → ADMIN, HR; department and position → ADMIN; criteria → ADMIN, HR
- `getAvailableActions(user, appraisal)`: returns which of these the user may do now:
  `moveToPending`, `editRatings`, `submit`, `approve`, `complete`, `sendBack(targets[])`, `reopen`, `editEmployeeList`, `softDelete`, `importRatings`

`getAvailableActions` uses the same rules as the backend transition table (status + role + department scope). Examples:

| Status | Role | Actions |
|---|---|---|
| DRAFT | HR | edit employee list, move to PENDING, delete (soft) |
| PENDING | HEAD_DEPARTMENT (own dept) | edit ratings, import ratings, submit, send back → DRAFT |
| PENDING | HR | (no action; HR cannot send back) |
| SUBMITTED | MANAGER (scope) | approve, send back → PENDING or DRAFT |
| APPROVED | GENERAL_MANAGER | complete, send back → SUBMITTED, PENDING, or DRAFT |
| COMPLETE | ADMIN | reopen → APPROVED |

Department scope: the user's departments come from `GET /auth/me`. If the backend later returns the allowed actions in the appraisal response, the UI should use that and keep this module only as a fallback.

### 7.4 Menu by role

| Menu item | ADMIN | HR | HEAD DEPT | MANAGER | GM |
|---|---|---|---|---|---|
| Appraisals | ✓ | ✓ | ✓ | ✓ | ✓ |
| Employees, Contracts | ✓ | ✓ | ✓ (read) | ✓ (read) | ✓ (read) |
| Departments, Positions | ✓ | ✓ (read) | ✓ (read) | ✓ (read) | ✓ (read) |
| Criteria | ✓ | ✓ | ✓ (read) | ✓ (read) | ✓ (read) |
| Users | ✓ | | | | |
| Audit trail | ✓ | ✓ | | | |

## 8. Layout and visual conventions

- Ant Design `Layout`: collapsible `Sider` with the menu, a header (app name, user name and role, logout), a content area with `Breadcrumb` and `PageHeader`.
- Desktop-first. The sider collapses automatically below the `lg` breakpoint; tables scroll horizontally inside their own container (`scroll={{ x: 'max-content' }}`); minimum supported width is tablet.
- One `ConfigProvider` sets theme tokens (primary color, border radius, compact density for tables).
- Status colors are defined once in `StatusTag`:

| Status | Tag color |
|---|---|
| DRAFT | default (grey) |
| PENDING | gold |
| SUBMITTED | blue |
| APPROVED | cyan |
| COMPLETE | green |

- Destructive or irreversible actions (send back, complete, reopen, soft delete, activate criteria set) use a confirm dialog. Send back and reopen require a comment before the confirm button is enabled.
- All buttons that call the API show a loading state and are disabled while the request runs, to prevent double submits.
- Icons come from `@ant-design/icons` only.

## 9. Dates and time

| Kind | API format | Display |
|---|---|---|
| Calendar date (join date, contract dates) | `YYYY-MM-DD` string | `DD MMM YYYY` |
| Period | `YYYY-MM-01` string | `MMMM YYYY` (e.g. "March 2027") |
| Timestamp (created, audit, history) | ISO 8601 with offset | `DD MMM YYYY HH:mm` in `VITE_DISPLAY_TZ` |

Rules:
- Setup in one place: `dayjs.extend(customParseFormat, utc, timezone)` and default timezone from env.
- Date-only values are parsed and formatted as strings with `dayjs(value, 'YYYY-MM-DD')`. They are never passed through `new Date()` (avoids off-by-one day errors across time zones).
- Period pickers use `DatePicker picker="month"` and send the first day of the month.
- Helpers in `shared/utils/dates.ts` (`formatDate`, `formatPeriod`, `formatDateTime`, `toApiDate`, `toApiPeriod`) are the only place that formats dates.
- Ant Design 5 date components use dayjs natively, so no adapter is needed. This only works with a single installed `dayjs` version (section 2.2).

## 10. Screens

### 10.1 Common list screen

Used by employees, contracts, departments, positions, users, appraisals, audit logs, and criteria sets.

- `PageHeader` with title and primary actions (create, import, export).
- Filter bar (search `q`, selects, date ranges) → URL query string.
- Ant Design `Table`: server-side pagination, sort, `rowKey = id`, status tags, row actions.
- `useTableQuery` hook: reads and writes `page`, `pageSize`, `sort`, `q`, and filters from `useSearchParams`, debounces search (300 ms), and returns params for the RTK Query hook.
- Create and edit forms open in a `Drawer` (long forms) or `Modal` (short forms) with Ant Design `Form`. Deactivate uses a confirm dialog.

### 10.2 Master data

| Screen | Notes |
|---|---|
| Employees | Filters: department, position, status, search. Form: employee number, name, gender, birth date, address, department, position, join date, status, superior (searchable select). Toolbar: Import, Export, Download template (ADMIN, HR only) |
| Contracts | Filters: employee, type, status, end-date range. Form shows a clear error when the backend rejects overlapping active contracts. Toolbar as above |
| Departments | Code, name, head (employee select), active flag. Write for ADMIN only |
| Positions | Code, name, level, active flag. Write for ADMIN only |

Deactivated departments and positions are hidden in the selects of new records and shown (marked "inactive") on existing ones.

### 10.3 User management (ADMIN)

- Table: username, name, role, departments, linked employee, active.
- Form: username, full name, password (create only), role, departments (multi-select, visible and required only for HEAD_DEPARTMENT and MANAGER), optional linked employee, active.
- Reset password: modal where the admin enters a new password (assumption, see section 18).
- Deactivate with confirm.

### 10.4 Criteria sets

- `/criteria`: table of versions: version, status tag (ACTIVE, DRAFT, SUPERSEDED), effective date, created by, activated by and when, note. Button "New draft from active version" for ADMIN and HR.
- `/criteria/:id` for ACTIVE or SUPERSEDED: read-only view of criteria, scales, and score descriptions.
- `/criteria/:id` for DRAFT (ADMIN, HR): editor.
  - Table of criteria: code, name, description, scale min, scale max, weight, order (up and down buttons).
  - Expandable row per criterion: one text input per score level (from min to max) for the score description. The inputs follow the scale when min or max changes.
  - Live **weight total** indicator: green at exactly 100, red otherwise.
  - "Save draft" and "Activate" buttons. Activate is disabled until the validation passes (total 100, `min < max`, all score descriptions filled, unique codes); the backend repeats the checks. Activation asks for confirmation and explains that new appraisals will use this version.

### 10.5 Appraisal list (home)

- Filters: status, department, period range, search.
- Columns: department, period, status tag, number of employees, criteria set version, source (manual or scheduled), last updated.
- **"Needs my action" quick tab**, based on the role:

| Role | Shows status |
|---|---|
| HR | DRAFT |
| HEAD_DEPARTMENT | PENDING |
| MANAGER | SUBMITTED |
| GENERAL_MANAGER | APPROVED |
| ADMIN | COMPLETE (for possible reopening) |

- HR sees a "Create appraisal" button. ADMIN sees "Run scheduler now" (`POST /scheduler/appraisals/run`) with a confirm dialog and the result summary.
- Scope is applied by the backend; Head Department only receives their own departments.

### 10.6 Create appraisal wizard (HR) `/appraisals/new`

1. **Department and month:** active department select and month picker.
2. **Preview:** `POST /appraisals/preview` returns eligible employees (contract ending in that month). Table with checkboxes (all selected by default). "Add employee" opens a search of active employees of the same department that are not in the list.
3. **Confirm:** summary (department, period, number of employees, criteria set version) and a Create button. On success, go to the appraisal detail page in DRAFT.

Edge cases shown clearly:
- 409 because an appraisal already exists for that department and month.
- No active criteria set (link to `/criteria`).
- Preview returns no employees (Create is disabled with an explanation).

### 10.7 Appraisal detail `/appraisals/:id`

Layout:

```
┌──────────────────────────────────────────────────────────────┐
│ Dept: Production   Period: March 2027   Criteria set v3      │
│ Steps: DRAFT ─ PENDING ─ SUBMITTED ─ APPROVED ─ COMPLETE     │
│ [Save] [Import ratings] [Export template] [Submit] [Send back]│
├──────────────────────────────────────────────────────────────┤
│ Employee      │ Quality │ Quantity │ Discipline │ ... │ Total │
│ (sticky left) │ (20%)   │ (20%)    │ (20%)      │     │ score │
│ ──────────────┼─────────┼──────────┼────────────┼─────┼───────│
│ 1001 Budi     │  [ 4 ]  │  [ 5 ]   │  [ 3 ]     │     │ 78.00 │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│ Tabs: Status history (timeline with comments) │ Info         │
└──────────────────────────────────────────────────────────────┘
```

- Header shows department, period, criteria set version, status tag, and the five-step `Steps` component for the current status.
- The **action bar** is built from `getAvailableActions` (section 7.3). Buttons that do not apply are not shown.
- **Status history:** Ant Design `Timeline` with from → to status, actor, time, and comment (send backs and reopen are highlighted).
- Rejection comments are also shown in a banner at the top when the latest history entry is a send back to the current status, so the assessor sees why the appraisal returned.

**Actions**

| Action | Dialog |
|---|---|
| Move to PENDING (HR) | Confirm |
| Submit (Head Department) | Saves unsaved edits first; blocked with a message and highlighted cells if any rating is missing |
| Approve, Complete | Confirm |
| Send back | Select target status (only the allowed ones) + required comment |
| Reopen (Admin) | Required comment |
| Delete (HR, DRAFT) | Confirm; explains that the appraisal is hidden, not erased |
| Edit employee list (HR, DRAFT) | Modal with add and remove, same rules as the wizard |

### 10.8 Audit trail (ADMIN, HR)

- Filters: user, entity, action, date range (`RangePicker`), search.
- Table: time, user, role, action, entity, entity id.
- Expandable row shows before and after values as read-only formatted JSON. Masked values appear as the backend returns them.
- Export is P1 and uses the same download helper.

## 11. Excel import and export

### 11.1 Download helper

`downloadFile(path, params)` in `shared/api`:
1. Calls the API with the current access token (and the same re-auth rule as section 5.2).
2. Reads the response as a `Blob`.
3. Takes the file name from `Content-Disposition` (fallback: a name built in the UI).
4. Triggers the browser download and shows loading and error states on the button.

Used by all exports and template downloads.

### 11.2 `ImportModal` (one reusable component)

Props: title, template download path, upload endpoint, accepted columns hint, optional extra context (e.g. the appraisal id).

Flow:
1. **Download template** button (required by the PRD for every import module).
2. `Upload.Dragger`, accepts only `.xlsx`, single file, size checked against `VITE_IMPORT_MAX_FILE_SIZE_MB` before upload. `beforeUpload` returns `false` and the file is posted as `multipart/form-data` on confirm.
3. While uploading, buttons are disabled and a progress state is shown.
4. **Success:** summary `created / updated / skipped` and refresh of the list.
5. **Failure (422):** the whole file was rejected. Show an error alert with the **first error only**: row number, column, message. Text: "The file was not imported. Fix this error and upload again." Nothing was saved.
6. Other errors (size or row limit, wrong header) show the backend message.

Use cases:

| Place | Import | Export / template |
|---|---|---|
| Employees page | Import employees (ADMIN, HR) | Export employees (current filters), template |
| Contracts page | Import contracts (ADMIN, HR) | Export contracts (current filters), template |
| Appraisal detail | Import ratings (Head Department, PENDING only) | Export assessment template, export result |

Assessment flow in the UI: Head Department downloads the **assessment template**, fills ratings in Excel, and uploads it in `ImportModal`. On success, the appraisal is reloaded and imported cells are visible in the table. If the table has unsaved edits, the user must save or discard first, because imported ratings overwrite cells.

## 12. Appraisal table (grid) in detail

### 12.1 Columns and rows

- Rows: `appraisal_employees`. First columns (fixed left): employee number and name, with department, position, and contract end date available in a tooltip (snapshot values).
- Criteria columns are **generated from the appraisal's own criteria set**, not from the current active set. The title shows name and weight; a popover on the header shows the criterion description and the score guide.
- Last columns: total score (fixed right) and optional comment per employee row.
- Sticky header and sticky first column (`Table` `sticky` and `fixed`). The table scrolls horizontally if there are many criteria.

### 12.2 Cell editing

- Each editable cell is an `InputNumber` with `min = scale_min`, `max = scale_max`, `precision = 0`, no step buttons.
- Next to the focused cell, the score description for the entered value is shown (from `criteria_scale_descriptions`), so assessors rate against the guide.
- **Keyboard:** Tab and Shift+Tab move across cells; Enter and arrow up and down move between rows; Escape reverts the cell. Implemented with a ref map keyed by `rowId:criterionId`.
- Read-only cells render plain numbers. Missing values show an empty marker.
- Validation: out-of-range values are blocked at input and also marked inline if pasted.

### 12.3 Unsaved edits

- Edits are stored in a slice `appraisalDraft`:
  `{ [appraisalId]: { ratings: { [rowId:criterionId]: number | null }, comments: { [rowId]: string } } }`. Only changed cells are stored.
- The table shows draft values over server values and marks changed cells.
- **Save** sends only changed cells with `PUT /appraisals/:id/ratings` (partial saves are allowed in PENDING), then invalidates the appraisal tag and clears the draft for that appraisal.
- `useUnsavedChanges` uses `useBlocker` and `beforeunload` to warn before leaving with unsaved edits.
- If the server rejects a rating (e.g. out of range), the error is mapped to the cell.

### 12.4 Score display

- `calculateScore(rating[], criteria[])` in `shared/utils/score.ts` uses the same formula as the backend: `Σ (rating / scale_max × weight)`, rounded to 2 decimals, and returns nothing while any rating is missing.
- The table shows the live value as a preview while editing. After saving, the value from the server replaces it.
- Both implementations are tested with the same cases (mixed scales, missing values, rounding).

### 12.5 Completeness

- A counter shows "filled / total cells". Missing cells are highlighted when the user tries to submit.
- Submit is available only when all cells are filled and nothing is unsaved (the button saves first).

### 12.6 Size

A department appraisal is expected to have tens of rows and about five criteria, so no virtualization is used. If rows grow past roughly 200, switch on Ant Design's virtual table.

## 13. Forms and validation

- Ant Design `Form` with `rules` for required fields, lengths, and formats. Rules mirror backend DTO constraints but never replace them.
- Server field errors (400) are applied with `form.setFields`.
- Shared form helpers: `required`, `maxLength`, `dateRange`, and unique-check messages for 409.
- Selects for departments and positions load once (`pageSize = 100`) and are cached by RTK Query. Employee selects use server-side search.

## 14. Error, empty, and loading states

- Route level `ErrorBoundary` with a friendly message and a reload button.
- Tables show Ant Design `Empty` with a hint (e.g. "No appraisals match these filters").
- Skeletons for detail pages; `Spin` for tables; full-page spinner only on app bootstrap.
- A 404 or 403 on a detail page (for example an out-of-scope appraisal) shows the corresponding page, not a toast.

## 15. Performance and build

- Route level code splitting with `React.lazy` and `Suspense`.
- Ant Design is imported by component (ES modules, tree-shaken by Vite); no global CSS import beyond the `reset` and theme setup.
- Vite `manualChunks` splits `react`, `antd`, and `@ant-design/icons` vendor chunks.
- Production build is static files. Serve with a reverse proxy (for example nginx) with SPA fallback to `index.html` and `/api` proxied to the backend, so the app and API share one origin (no CORS in production).
- Docker: multi-stage image (build with pnpm, run with nginx); `VITE_*` values are set at build time.

## 16. Testing strategy

| Level | What |
|---|---|
| Unit (Vitest) | `calculateScore`, `getAvailableActions` (every status and role, table-driven from PRD matrix 5.8), `canAccessRoute`, date helpers (period, date-only strings), `ApiError` mapping, `tokenStorage` fallbacks |
| Component (React Testing Library) | `ImportModal` (template download, size check, first-error display), appraisal grid (edit, keyboard, unsaved warning, missing-cell highlight), send back dialog (comment required) |
| Later (optional) | Playwright for login, full appraisal flow, and import happy path against a test backend |

Priority when time is short: permissions, score, grid, import modal, re-auth. Tooling setup is in section 2.4.

## 17. Security notes

- Access token only in memory; refresh token in `sessionStorage`; neither is logged or placed in URLs.
- No `dangerouslySetInnerHTML`; user text is always rendered as text (React escapes it). Excel formula injection is handled by the backend on export.
- UI permission checks are a convenience; every rule is enforced by the backend.
- On logout or session failure, the RTK Query cache is cleared so a following user never sees earlier data.
- No secrets in `VITE_*` variables (they are public in the bundle).

## 18. Assumptions about the backend (to confirm)

| # | Assumption | If different |
|---|---|---|
| 1 | Login and refresh return `{ accessToken, refreshToken, user }`; `GET /auth/me` returns role and department ids | Adjust `authApi` and bootstrap |
| 2 | `GET /appraisals/:id` returns status, department, period, criteria set version, the criteria (with scales and score descriptions), the employee rows with snapshots, ratings, comments, and total scores | The grid needs all of this in one call |
| 3 | 400 errors put field messages in `details` as `{ field: string[] }` | Adjust error mapping |
| 4 | Import failures return 422 with `details: { row, column, message }` | Adjust `ImportModal` |
| 5 | File responses include `Content-Disposition` with a file name | Fall back to a generated name |
| 6 | List endpoints accept `page`, `pageSize`, `sort`, `q`, and filters such as `departmentId`, `status`; list endpoints for departments and positions allow `pageSize = 100` | May need a lightweight lookup endpoint |
| 7 | `POST /users/:id/reset-password` takes a new password from the admin | If it generates a temporary password, show it once in a modal |
| 8 | `POST /scheduler/appraisals/run` returns a summary (created, skipped, failed) | Show a generic success message |
| 9 | **Optional improvement:** `GET /appraisals/:id` also returns `allowedActions` for the current user | Removes duplicated rules from the UI |
| 10 | **Optional improvement:** refresh token in an httpOnly, SameSite cookie instead of the JSON body | Needs backend changes (cookie handling, `credentials: 'include'`, CSRF review); then `sessionStorage` is dropped |

## 19. Risks and open points

| Item | Note |
|---|---|
| Duplicated browser tab copies `sessionStorage` | Both tabs share one refresh token; after rotation the other tab's token becomes a reuse and the backend may revoke the session. Acceptable for v1; the cookie option removes the issue |
| UI permission rules drift from the backend | Mitigated by a shared table-driven test of the PRD matrix and, ideally, `allowedActions` from the API |
| Large departments make the grid slow | Virtual table is the fallback (section 12.6) |
| Excel import errors reported one at a time | By design (PRD: first error only); users may need several attempts. Revisit if HR finds it slow |
| Placeholder criteria data | The grid is generic, so no frontend change is needed when HR finalizes criteria |