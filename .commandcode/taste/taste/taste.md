# Taste
- Treats the PRD as the canonical source of truth when documentation conflicts; when docs are out of sync, resolve the conflicts against the PRD rather than the stale design docs. Confidence: 0.6
- Wants coding conventions (naming, file/folder structure, code style) documented in a dedicated markdown doc covering both backend and frontend, grounded in industry best practices and common usage rather than ad-hoc rules. Confidence: 0.5
- Prefers a detailed, phased TODO/plan (broken down by build phase and dependency order, grounded in the PRD/design docs) laid out before implementation starts. Confidence: 0.45
- Wants planning/TODO artifacts persisted as versioned markdown docs in the repo (e.g. `docs/PLANNING.md`) with trackable checkboxes, rather than only living in ephemeral tool/task-panel state. Confidence: 0.55
- Strongly dislikes guessing: when requirements are ambiguous, expects the agent to investigate existing code/docs for grounding and ask explicit clarifying questions before making changes, rather than assuming. Confidence: 0.7
- Treats the documented conventions doc as the authoritative standard for structure and naming, and expects the code to be refactored to conform to it (e.g. "fix canonical backend structure based on conventions.md"). Confidence: 0.6
- Prefers unused/out-of-scope scaffold code be removed rather than left in place, and authorizes deleting modules that aren't needed for the project being built. Confidence: 0.5
- Wants request/response types shared between backend and frontend via a common package under `packages/`, synced through the monorepo workspace as a single source of truth, rather than duplicated per app. Confidence: 0.5
