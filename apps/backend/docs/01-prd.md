# Product Requirements Document (PRD)
**Project:** TaskFlow — Simple Task Management App
**Version:** 1.0
**Last Updated:** 2026-08-26
**Owner:** [Your Name]

---

## 1. Overview

### Problem Statement
Freelancers and small teams juggle tasks across sticky notes, chat threads, and half-used apps. They need a lightweight tool to track tasks without the overhead of enterprise project management software.

### Goal
Build a simple, fast task manager where users can create, organize, and complete tasks — usable within 30 seconds of signup, no onboarding required.

### Why Now
Existing tools (Asana, Jira, Monday) are overkill for individuals and 2-5 person teams. There's a gap for something as simple as a to-do list but with basic collaboration.

---

## 2. Target Users & Personas

**Primary Persona: "Solo Sara"**
- Freelance designer, works alone
- Needs: quick task capture, due dates, simple prioritization
- Pain point: existing tools have too many features she never uses

**Secondary Persona: "Team Lead Tom"**
- Manages a 3-person remote team
- Needs: assign tasks to teammates, see who's doing what
- Pain point: Slack threads for task tracking get lost

### User Stories
- As a user, I want to create a task in under 5 seconds so I don't lose my train of thought.
- As a user, I want to set a due date so I don't forget deadlines.
- As a team lead, I want to assign a task to a teammate so responsibility is clear.
- As a user, I want to mark a task complete and see it disappear from my active list.
- As a user, I want to filter tasks by status (todo/in-progress/done) so I can focus.

---

## 3. Scope

### In Scope (MVP)
- User signup/login (email + password)
- Create, edit, delete tasks
- Task fields: title, description, due date, status, assignee
- Task list view with filter by status
- Assign tasks to team members (within same workspace)
- Basic workspace (one workspace per team, invite by email)

### Out of Scope (v1)
- Subtasks / task dependencies
- File attachments
- Calendar/Gantt view
- Mobile app (web-responsive only for now)
- Third-party integrations (Slack, Google Calendar, etc.)
- Recurring tasks
- Notifications/reminders (email or push)

---

## 4. Functional Requirements

| ID   | Requirement                                                                             | Priority |
| ---- | --------------------------------------------------------------------------------------- | -------- |
| FR-1 | User can sign up with email + password                                                  | Must     |
| FR-2 | User can log in / log out                                                               | Must     |
| FR-3 | User can create a task with title (required), description, due date, assignee           | Must     |
| FR-4 | User can edit any field of a task they created or are assigned to                       | Must     |
| FR-5 | User can delete a task they created                                                     | Must     |
| FR-6 | User can change task status (todo → in-progress → done)                                 | Must     |
| FR-7 | User can view a list of all tasks in their workspace, filterable by status and assignee | Must     |
| FR-8 | User can invite a teammate to their workspace via email                                 | Should   |
| FR-9 | User can see a count of tasks per status (e.g. "5 todo, 2 in-progress")                 | Could    |

---

## 5. Non-Functional Requirements
- Page load under 2 seconds on standard broadband
- Support up to 50 users per workspace (MVP scale)
- Passwords hashed and stored securely (never plaintext)
- Responsive design: usable on desktop and tablet (mobile not prioritized in v1)

---

## 6. Edge Cases & Error Handling
- Creating a task with an empty title → block submission, show inline error
- Deleting a task that another user is currently editing → last-write-wins, show a "this task was updated" notice on conflict
- Inviting an email that's already a member → show "already in workspace" message, no duplicate invite
- Due date set in the past → allow it, but visually flag as overdue

---

## 7. Success Metrics
- 70% of new signups create at least 1 task within first session
- Average task creation time under 10 seconds
- Weekly active users retain at 40%+ after 4 weeks

---

## 8. Open Questions
- Do we need role-based permissions (admin vs member) in v1, or is everyone equal?
- Should deleted tasks be soft-deleted (recoverable) or hard-deleted?