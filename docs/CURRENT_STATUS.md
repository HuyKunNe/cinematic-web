# Current Status

## Last updated

2026-09-28

## Repository

Frontend:

https://github.com/HuyKunNe/cinematic-web

Backend:

https://github.com/HuyKunNe/cinema-system

Figma:

https://www.figma.com/design/u8UwhKxDdk5qvK4WezjJnQ/Cinema-Web-UI-Cinematic-Dark?node-id=3-2

## Current phase

```text
F0 — Project foundation and documentation
```

## Verified state

- A new frontend repository has been selected.
- The frontend is intended to be created using npm.
- The frontend codebase has not yet been verified after scaffolding.
- The backend already exists in a separate repository.
- Figma is the source of truth for UI implementation.
- The repository must be treated as read-only by AI assistants.
- The user manually applies and commits proposed changes.

## Decisions

- Vue 3 with TypeScript and Vite
- Architecture: `app → modules → shared`
- Tailwind CSS with semantic CSS variables
- Reka UI for accessible headless primitives
- Vue Router for routing
- Pinia for client/application state
- TanStack Vue Query for server state
- Axios for HTTP
- Orval for OpenAPI client generation
- VeeValidate and Zod for forms
- oidc-client-ts for Authorization Code with PKCE
- MSW for API mocks when needed
- No hardcoded Figma values in templates or arbitrary classes

## Pending verification

- Current frontend branch and commit
- Whether Vue/Vite has been initialized
- Node and npm versions
- Final dependency versions
- Figma pages and node inventory
- Backend OpenAPI availability
- Gateway OpenAPI aggregation
- Confirmed OIDC client ID
- Confirmed redirect URIs
- Confirmed CORS configuration

## Current blockers

No technical blocker is confirmed.

Implementation must not begin until the repository and Figma audit are completed.

## Next step

```text
F0.1 — Audit the new repository and approve the Vue project scaffold.
```

Expected output:

- Repository status
- Proposed npm scaffold command
- Proposed dependency list
- Proposed folder structure
- Proposed configuration files
- No file changes before approval

## Verification status

Not run:

- Unit tests
- Lint
- Type check
- Build

## Handoff prompt

```text
Continue the cinematic-web frontend project.

Read, in order:

1. AGENTS.md
2. docs/CURRENT_STATUS.md
3. docs/ROADMAP.md
4. docs/ARCHITECTURE.md
5. docs/DESIGN_SYSTEM.md
6. docs/API_INTEGRATION.md
7. README.md

Then inspect the current frontend Git state and the Figma file.

Treat the repository as read-only.

Do not edit files, install dependencies, commit, push, run tests, run lint,
run type-check or run build.

Report the current state and propose exactly one next roadmap item.
Wait for approval.
```
