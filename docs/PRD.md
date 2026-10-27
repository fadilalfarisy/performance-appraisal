# PRD: Employee Performance Appraisal System

**Status:** Draft v0.9
**Changes from v0.8:** Appraisal ratings are edited on a per-employee detail page for HEAD_DEPARTMENT and ADMIN, not inline in the appraisal table. The daily note sum is calculated over the employee's qualifying contract period (contract start to contract end), is informational, and is visible only to ADMIN and HEAD_DEPARTMENT. A renewed contract starts a new note window. When an appraisal is COMPLETE, authorized roles can download the result as `.xlsx` (employee rows × criteria columns, total score, comment).
**Changes from v0.7:** ADMIN has full access to every action in the system, including all appraisal workflow actions (create, edit employee list, rate, import ratings, every transition, send back, delete, and reopen) and daily activity notes.
**Changes from v0.6:** Criteria sets are now scoped per department with `DRAFT`, `ACTIVE`, and `ARCHIVED` statuses (one active set per department, plus an optional global set used as fallback). HR selects the criteria set when creating an appraisal; Supervisor and Head Department select it when recording a daily note. Active criteria may be edited only by ADMIN and only for code, name, description, scale, score descriptions, and form fields; weights and the criterion list are locked.
**Changes from v0.5:** Removes the contract status field (5.1). A contract is active between its start and end dates, and no two contracts for the same employee may overlap in time; appraisal eligibility (5.4) uses the contract end date only.
**Changes from v0.4:** Adds Daily Activity Notes (5.9): a per-day dynamic form generated from the criteria set, filled by HEAD DEPARTMENT and by the new SUPERVISOR role; the numeric sum appears on the appraisal as informational data. Adds the SUPERVISOR role (4) and its permissions (5.8).

---

## 1. Background and Problem

Performance appraisals are currently managed manually. This causes:

- Inconsistent criteria between periods, with no history of what was used.
- No clear approval flow or record of who approved or rejected an appraisal.
- Slow, error-prone data entry and consolidation by HR.
- No traceability of who changed what and when.

## 2. Goals

1. Provide a single system for employee master data and periodic performance appraisal.
2. Enforce a clear approval workflow with role-based access.
3. Keep full history of appraisal criteria through versioning.
4. Allow bulk data work through Excel import and export.
5. Provide a complete audit trail for accountability.

**Success metrics (proposed)**

- 100% of appraisals in a period completed inside the system.
- Appraisal cycle time reduced by a target agreed with HR (e.g. 30%).
- 0 untracked changes: every create, update, status change, import, and export appears in the audit trail.
- Bulk imports complete with a clear success or failure result.

## 3. Non-Goals (v1)

- Payroll, bonus, or promotion calculation from appraisal results.
- Employee-facing portal. Employees do not log in and cannot see their results.
- Email notifications (planned for a later version) to HR when an assessment is initiated, to Head Department when employees need assessment, and to Manager and General Manager when approval is needed.

## 4. Users and Roles

Each user has exactly one role. Roles do not automatically inherit permissions from lower roles; see the permission matrix (5.8).

| Role | Description |
|---|---|
| ADMIN | System owner with full access to every action in the system. Manages users, departments, positions, criteria, and system-wide settings. Also manages employees and contracts, performs every appraisal action (including every workflow transition), and manages daily activity notes. |
| HUMAN RESOURCE (HR) | Manages employee and contract data, criteria, and imports and exports. Creates appraisals in DRAFT and moves them to PENDING. |
| HEAD DEPARTMENT | Gives assessment (ratings) for employees in their own department while the appraisal is PENDING, and submits it. Also records daily activity notes for their own department. |
| SUPERVISOR | Records day-to-day activity notes for the employees whose supervisor they are. Not part of the appraisal approval flow. |
| MANAGER | Reviews SUBMITTED appraisals within their scope and approves them. |
| GENERAL MANAGER | Gives final sign-off: moves APPROVED appraisals to COMPLETE. Views all departments. |

**Data scope:** Head Department sees only their own department. Supervisor sees only the employees whose supervisor they are. Manager sees the departments assigned to them. General Manager, HR, and Admin see all.

## 5. Functional Requirements

Priority: **P0** must have, **P1** should have, **P2** nice to have.

### 5.1 Master Data (P0)

Create, read, update, and deactivate (soft delete) the following entities. Records used elsewhere are never physically deleted.

| Entity | Key fields (indicative) | Managed by |
|---|---|---|
| Department | code, name, head (employee), active flag | Admin |
| Position | code, name, level, active flag | Admin |
| Employee | employee number (unique), full name, gender, birth date, address, department, position, join date, status (active/inactive), supervisor (optional) | HR, Admin |
| Contract | employee, contract type (permanent, fixed-term, etc.), start date, end date (empty for permanent) | HR, Admin |

Acceptance criteria:
- Employee number is unique. Duplicate creation is rejected with a clear message.
- An employee can have multiple contracts over time, but no two contracts may overlap in time. A contract is active between its start and end dates; an empty end date means it stays active.
- Deactivated departments or positions cannot be assigned to new employees but remain visible on historical data.
- List screens support search, filter, sort, and pagination.

### 5.2 User Management (P0)

- Admin can create, edit, deactivate, and reset password for users.
- Each user has exactly one role. Head Department, Supervisor, and Manager users have one or more assigned departments.
- Login with username and password. JWT access token and refresh token expire after a configurable period.
- A user may optionally be linked to an employee record. A Supervisor must be linked to an employee record, because their scope is the employees whose supervisor is that employee.

Acceptance criteria:
- Deactivated users cannot log in, but their history remains in appraisals and the audit trail.
- Only Admin can manage users and assign roles.

### 5.3 Criteria Management with Versioning (P0)

Criteria define what employees are rated on. The initial set has five criteria: Quality of Work, Quantity of Work, Discipline, Responsibility, and Running of Instructions. The set can change later.

- Criteria are versioned **as a set per department**. Each department has its own version chain. A set with no department is a global legacy set and acts as a fallback for departments that do not have their own set.
- Each set has one of three statuses: `DRAFT`, `ACTIVE`, or `ARCHIVED`. A department may have at most one `ACTIVE` set. Activating a draft moves the previous active set of the same department to `ARCHIVED`.
- Each criterion has: code, name, description, rating scale (minimum and maximum, not fixed to 1-5), weight, display order.
- Each score level in a criterion's scale has a description that guides the assessor (e.g. 5 = "Consistently exceeds expectations").
- The criteria set also defines the daily activity note form: the form fields belong to the criteria set (not to an individual criterion) and come from reusable form-field definitions (see 5.9). These definitions are versioned with the criteria set.
- The weights of all criteria in a set must total **100%**. A set that does not total 100% can be saved as a draft but cannot be activated.
- A `DRAFT` set can be edited freely by ADMIN and HR, including weights, the criterion list, and form fields.
- An `ACTIVE` set can be edited only by ADMIN, and only its code, name, description, scale, score descriptions, and form fields. Its weights and criterion list (adding or removing criteria) are locked. An `ARCHIVED` set is read-only.
- Retiring a criterion from an `ACTIVE` set requires a new draft and activation; the old version stays in history as `ARCHIVED`.
- HR selects the criteria set to use when creating an appraisal. Supervisor and Head Department select the criteria set to use when recording a daily note. Only non-draft sets available to the department (department-specific or global) can be selected.
- Each appraisal and each daily note keeps a snapshot reference to the criteria set version it used, so past results never change.

Acceptance criteria:
- Activating a new set marks the previous active set of the same department as `ARCHIVED`.
- The system shows the version history of the criteria set with who changed it and when.
- Changing the active set does not affect existing appraisals or daily notes.
- Editing an `ACTIVE` set cannot change its weights or add/remove criteria.
- A department with no active set cannot create new appraisals until HR selects a global set or activates a department set.

### 5.4 Performance Appraisal (P0)

The appraisal is presented as a **table**: rows are employees, columns are criteria.

**Period and scope**
- An appraisal belongs to exactly **one department** and **one period**. A period is a month (stored as the first day of that month). Only one non-deleted appraisal can exist per department per period.
- The appraisal covers employees whose contract ends within the period month.

**Creating an appraisal: manual**
1. HR chooses a department, a period date, and the criteria set to use (an `ACTIVE` or `ARCHIVED` set available to that department, or a global set).
2. The system shows the list of eligible employees for that department.
3. HR can add or remove employees (same department, active only) and confirms.
4. The appraisal is created with status DRAFT and pins the selected criteria set.

**Creating appraisals: automatic (scheduler)**
- A scheduled job runs on **day 1 of every month** and creates a DRAFT appraisal for **every department** that has eligible employees.
- The job uses the latest `ACTIVE` criteria set of the department. If the department has none, it uses the global `ACTIVE` set. If neither exists, the department is skipped.
- The job targets contracts ending in the **following month**. The look-ahead is configurable.
- The job never creates duplicates: if an appraisal already exists for the department and period, it is skipped.
- Contracts without an end date (permanent) are not included.
- Audit entries for scheduler actions use the actor "SYSTEM".

**Eligibility**
- Employee is active, belongs to the department, and has a contract whose end date falls in the period month.
- An employee cannot appear in more than one open (not COMPLETE) appraisal for the same period.

**Table behavior**
- The appraisal table is **read-only**: rows are employees and columns are the criteria from the pinned criteria set.
- HEAD_DEPARTMENT (own department) and ADMIN can open a **per-employee detail page** from each row.
- The detail page contains the editable assessment form (rating per criterion plus the employee comment), the score rubric for each criterion (`scaleMin`–`scaleMax` and every score description), and the informational daily note sum.
- Each rating must be within that criterion's scale. The score guide for each level is shown next to the rating input.
- Optional comment per employee row (P1: comment per cell).
- Total score per employee is calculated automatically: each rating is normalized (`rating / maximum of that criterion's scale`), multiplied by the criterion weight, and summed to a score out of 100.
- Per employee, the **daily note sum** (see 5.9) is shown on the detail page. It is informational and does not change the total score.
- Ratings are editable only by Head Department (own department) and ADMIN, and only while the appraisal is PENDING.
- When the appraisal is **COMPLETE**, ADMIN, HR, Head Department (own department), Manager (scope), and General Manager can download the result as an `.xlsx` file. The sheet has one row per employee, columns for every pinned criterion, Total Score, and Comment.

**Snapshot**
- At creation, the appraisal stores for each employee: department, position, contract type, contract start date, and contract end date. Later master data changes do not alter it.
- The contract start and end dates define the employee's daily note window for this appraisal.

**Deletion**
- Appraisals are never physically deleted. In DRAFT, HR can **soft delete** (cancel) an appraisal. It is hidden from normal lists, kept in the database, and the action is audited.

Acceptance criteria:
- Rating outside the allowed scale is rejected.
- Saving in PENDING allows incomplete ratings; submitting requires all cells filled.
- Changing criteria after an appraisal is created does not change that appraisal's columns.
- Creating an appraisal for a department and period that already has one is blocked with a clear message.
- The daily note sum shown on the per-employee assessment matches the employee's notes inside the contract window and never changes the total score.
- A COMPLETE appraisal can be downloaded as `.xlsx` with the same employee rows and criteria columns as the assessment table.

### 5.5 Approval Workflow (P0)

Statuses: **DRAFT → PENDING → SUBMITTED → APPROVED → COMPLETE**

| Transition | Who | Notes |
|---|---|---|
| Create appraisal (DRAFT), edit employee list | HR, Admin | Only in DRAFT |
| DRAFT → PENDING | HR, Admin | Opens the appraisal for assessment |
| Edit ratings (in PENDING) | Head Department (own department), Admin | Admin can edit any department |
| PENDING → SUBMITTED | Head Department (own department), Admin | All ratings required |
| SUBMITTED → APPROVED | Manager (within scope), Admin | Ratings read-only |
| APPROVED → COMPLETE | General Manager, Admin | Final, locked |
| COMPLETE → APPROVED (reopen) | Admin | Comment mandatory, audited |
| Send back and reopen | Admin | Admin may use any send-back target allowed above |

Only one approval level per status.

**Rejection (send back)**

A comment is mandatory for every rejection or send-back. Allowed targets:

| Who | From | Can return to |
|---|---|---|
| Head Department | PENDING | DRAFT |
| Manager | SUBMITTED | PENDING, DRAFT |
| General Manager | APPROVED | SUBMITTED, PENDING, DRAFT |
| Admin | any status | any earlier status allowed by the row above |

- The reviewer can return the appraisal to any earlier status of the workflow, as listed above.
- After a send-back, the appraisal becomes editable according to the target status.

Acceptance criteria:
- Invalid transitions (e.g. DRAFT → COMPLETE) are blocked.
- Each transition records actor, time, from-status, to-status, and comment.
- COMPLETE appraisals are read-only for everyone until Admin reopens them.
- The status history is visible on the appraisal screen.
- Appraisal lists can be filtered by status so users can find items waiting for them.

### 5.6 Audit Trail (P0)

Record for every meaningful action:
- **Who:** user id, username, role, and employee number when the user is linked to an employee. Scheduler actions use "SYSTEM".
- **What:** action, entity, entity id, and before/after values for changes.
- **When:** timestamp.
- **Origin:** IP address (P1).

Covered actions: login and logout, create/update/deactivate of any master data, user and role changes, criteria set versioning, appraisal creation, edits, soft deletion, status transitions, rejections and reopening, daily note create/edit/delete, scheduler runs, and every import and export.

Rules:
- Sensitive values (passwords, password hashes, tokens) are **masked** in before/after data.
- Audit records cannot be edited or deleted through the application. No screen, API endpoint, or application role (including ADMIN) can modify or delete them.
- Audit records are retained for **12 months**. Records older than 12 months are removed only by an administrator working directly in the database, using a documented purge procedure (e.g. dropping monthly partitions or a reviewed script).
- The application's database user has insert and select permission only on the audit table (no update or delete).
- Each purge is recorded outside the audit table (date, operator, cutoff date, number of records removed).
- HR and Admin can search and filter by user, entity, action, and date range, and export the result (P1).

### 5.7 Excel Import and Export (P0 unless noted)

| # | Feature | Description |
|---|---|---|
| 1 | Export employees | Download employee list (respecting current filters) as `.xlsx`. |
| 2 | Import employees (update/sync) | Upload `.xlsx` to create new employees and update existing ones, matched by employee number. |
| 3 | Export contracts | Download contract list (respecting current filters) as `.xlsx`. |
| 4 | Import contracts | Upload `.xlsx` to create or update contracts, matched by employee number and contract start date. |
| 5 | Export appraisal result | Download appraisal results per period and department as `.xlsx`. |
| 6 | Export assessment template | Download the list of employees to assess, with one column per criterion in the appraisal's criteria set, as `.xlsx`. |
| 7 | Import assessment ratings | Upload the filled template to populate the appraisal table with ratings. |

**Template menu:** every import module has a "Download template" menu item that provides a file with the expected headers (and example rows). For assessment ratings, the template is the export in row 6.

**Common import rules**
- File checks first: `.xlsx` only, maximum file size and row count. Defaults are 5 MB and 5,000 rows, and both are set in `.env` so they can be changed without code changes.
- The system validates the whole file before saving anything.
- If any error is found, the **entire file is rejected** and the system shows **only the first error** that failed the file (row number, column, message).
- Imports run in a single transaction, so a failed import never leaves partial data.
- On success, show a summary: rows created, updated, skipped.
- Every import records file name, uploader, time, and result in the audit trail.

**Import employees (sync) specifics**
- Rows matched by employee number are updated; unmatched rows are created.
- Employees missing from the file are **not** deactivated automatically (an optional "deactivate missing" setting is P2).
- Department and position codes in the file must already exist, otherwise the file fails.

**Import assessment ratings specifics**
- Only Head Department can import, for their own department, and only while the appraisal is PENDING.
- The template embeds the appraisal id, period, and criteria set version. The import is rejected if they do not match the target appraisal.
- Ratings must be within each criterion's scale. Unknown employees or criteria are errors.
- Imported ratings overwrite existing cells for the same employee and criterion; the overwrite is recorded in the audit trail.

### 5.8 Permission Matrix

C = create, R = read, U = update, D = delete (soft), A = perform status transition, X = export/import, - = no access.

| Function | ADMIN | HR | HEAD DEPT | MANAGER | GM | SUPERVISOR |
|---|---|---|---|---|---|---|
| Department, position | CRUX | R | R (own dept) | R (scope) | R | R |
| Employee, contract | CRUX | CRUX | R (own dept) | R (scope) | R | R (own subordinates) |
| User management | CRU | - | - | - | - | - |
| Criteria set versioning (create draft, activate) | CRU | CRU | R | R | R | R |
| Edit DRAFT criteria content (criteria, weights, fields) | CRU | CRU | - | - | - | - |
| Edit ACTIVE criteria content (code, name, description, scale, score descriptions, fields) | U | - | - | - | - | - |
| Note form fields (DRAFT) | CRU | CRU | - | - | - | - |
| Note form fields (ACTIVE) | U | - | - | - | - | - |
| Create appraisal, edit employee list, soft delete (DRAFT) | CRU | CRU | - | - | - | - |
| DRAFT → PENDING | A | A | - | - | - | - |
| Give / edit ratings (PENDING) | U | - | U (own dept) | - | - | - |
| PENDING → SUBMITTED | A | - | A (own dept) | - | - | - |
| SUBMITTED → APPROVED | A | - | - | A (scope) | - | - |
| APPROVED → COMPLETE | A | - | - | - | A | - |
| Send back (see 5.5 table) | A | - | A (PENDING → DRAFT) | A | A | - |
| Reopen COMPLETE → APPROVED | A | - | - | - | - | - |
| View appraisals | R (all) | R (all) | R (own dept) | R (scope) | R (all) | R (own subordinates) |
| Export assessment template | X | X | X (own dept) | X (scope) | X | - |
| Import assessment ratings | X | - | X (own dept) | - | - | - |
| Export appraisal result | X | X | X (own dept) | X (scope) | X | - |
| Import / export employees and contracts | X | X | - | - | - | - |
| Audit trail | R | R | - | - | - | - |
| Daily activity notes (create / edit / delete) | CRUD | - | CRUD (own dept) | - | - | CRUD (own subordinates) |
| View individual daily notes | R | - | R (own dept) | - | - | R (own subordinates) |
| Daily note sum on appraisal | R | - | R (own dept) | - | - | - |

ADMIN has full access to every function in this matrix, including actions listed only for other roles.

### 5.9 Daily Activity Notes (P0)

Supervisors and Head Department record what an employee did each day. The note form is generated from the criteria set, and the numeric total appears on the appraisal as supporting information.

**Record**
- One note per employee per day. A unique key on employee and date prevents duplicates.
- A note belongs to a department and keeps a month period for reporting. The appraisal daily note sum uses the employee's contract window (5.4 / below), not the note month.
- Only **SUPERVISOR** (for employees whose supervisor they are) and **HEAD DEPARTMENT** (for their own department) can create, edit, and delete notes.
- There is no approval step. The author can edit a note; an edit replaces its values.
- Notes are never physically deleted (soft delete), and every create, edit, and delete is audited.

**Dynamic form**
- The form is generated from the criteria set selected by the Supervisor or Head Department when a note is created. The list contains non-draft sets available to the employee's department (department-specific or global).
- The form fields belong to the criteria set itself, so they are presented as a single flat form without per-criterion grouping.
- Supported input types include text, number, option (single and multiple choice), boolean, and date. The list is extensible; adding a type does not require changing existing forms.
- Editing a criteria set changes the form for **new** notes only. Existing notes keep the criteria set and values they were captured with.
- The selected criteria set is pinned to the note; editing the note uses the same set.
- `DRAFT` form-field definitions are managed by Admin and HR. `ACTIVE` form-field definitions are managed by Admin only (see 5.3 and 5.8).

**Sum on the appraisal**
- The **daily note sum** for an appraisal employee is the sum of all numeric (`NUMBER`) field values across that employee's notes in the appraisal department whose `recordDate` falls between the **contract start date and contract end date** of the contract that made the employee eligible.
- If the contract is renewed, the next appraisal uses the new contract's start date; notes from the previous contract are not included.
- A note with no numeric fields, or an employee with no notes in the window, contributes 0.
- The sum is shown on the per-employee detail page, visible only to ADMIN and HEAD_DEPARTMENT (own department).
- The sum does **not** change the appraisal rating score; the formula in 5.4 is unchanged.

**Access**
- A SUPERVISOR reads and writes notes only for employees whose supervisor is that supervisor's linked employee.
- HEAD DEPARTMENT reads and writes notes for their own department.
- ADMIN reads and writes every note in every department.
- Every other role (including HR, Manager, and General Manager) cannot open the individual notes or the per-employee assessment page.

Acceptance criteria:
- A second note for the same employee and the same day is rejected.
- A user who is not linked to an employee, or who is not the employee's supervisor, cannot create a note for that employee.
- The form shows the fields defined on the selected set, without per-criterion grouping.
- Values that break a field's rules (for example an out-of-range number or a missing required field) are rejected.
- The per-employee assessment shows the correct contract-window sum, and changing notes inside the window updates it.
- Notes written before a criteria-set change still show their original values and still count toward the sum.

## 6. Non-Functional Requirements

- **Security:** password hashing, role-based and department-scoped access enforced on the server for every endpoint, JWT expiry, no sensitive data in logs or audit values.
- **Data integrity:** soft delete for master data and appraisals; criteria set versions and appraisal snapshots are immutable after the appraisal is COMPLETE.
- **Performance:** list screens load within 2 seconds for 5,000 employees; imports of 1,000 rows finish within 30 seconds.
- **Usability:** the appraisal table supports keyboard navigation, sticky employee column and criteria header, and shows validation errors inline.
- **Compatibility:** latest two versions of Chrome, Edge, and Firefox; desktop-first, responsive down to tablet.
- **Retention:** audit trail kept for 12 months; appraisals are never deleted.
- **Compliance:** employee data is personal data; access is limited by role and logged.

## 7. Main User Flows

1. **Setup:** Admin creates users, departments, and positions → HR loads employees and contracts (manually or by import) → HR or Admin defines the criteria set.
2. **Appraisal creation:** either the scheduler creates DRAFT appraisals on day 1 of each month for all departments, or HR chooses a department and date manually. HR reviews the employee list and changes DRAFT to PENDING.
3. **Assessment:** Head Department fills the table (or downloads the template, fills it in Excel, and imports it back) and submits.
4. **Approval:** Manager approves or sends back with a comment → General Manager completes or sends back with a comment.
5. **Reporting:** HR exports appraisal results; HR or Admin reviews the audit trail when needed.
6. **Daily activity:** Supervisor or Head Department records a note for each employee every day using the form generated from the selected criteria set; the values accumulate and appear as the daily note sum on the department's appraisal.

## 8. Dependencies, Assumptions, and Risks

**Dependencies**
- Final criteria, rating scales, score descriptions, and weights from HR.
- Agreed Excel templates and column definitions.

**Risks**

| Risk | Mitigation |
|---|---|
| Messy Excel data causes failed imports | Downloadable templates, validation before saving, clear first-error message |
| Criteria change mid-period confuses users | Criteria set snapshot per appraisal; changes apply to new appraisals only |
| Users edit wrong department data | Server-side department scoping and audit trail |
| Scheduler creates duplicates or misses departments | One appraisal per department per period enforced by the database; scheduler runs are audited |
| Manual database purge of audit records is done by mistake or abused | Application has no delete rights on the audit table; purge follows a documented procedure and is recorded |
| Daily notes are entered against the wrong criteria version | Existing notes keep the values captured with their criteria version; the form for new notes follows the selected set |

## 9. Release Plan (proposed)

| Phase | Scope |
|---|---|
| Phase 1 | Users and roles, master data, audit trail foundation |
| Phase 2 | Criteria set versioning and its dynamic note form, daily activity notes, appraisal table, approval workflow, scheduler |
| Phase 3 | All Excel import/export and templates, reporting exports |
| Phase 4 | UAT with HR, data migration, pilot in one department, then full rollout |

## 10. Open Questions

None at this time.
