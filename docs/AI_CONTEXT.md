# AI Context

## Project

cinematic-web is the Frontend for CINEMATIC.

Repositories:

- Frontend: https://github.com/HuyKunNe/cinematic-web
- Backend: https://github.com/HuyKunNe/cinema-system

Both repositories are read-only for the assistant.
The user implements and commits proposed changes.

## Working method

- Do not edit, create or delete repository files directly.
- Do not create branches, commits, pull requests or pushes.
- Do not modify Backend.
- Do not use Codex CLI.
- Provide Markdown guidance and complete copyable replacement blocks.
- Work in small, complete and reviewable rounds.
- Provide a manual verification checklist after every round.
- Provide a separate commit message after every round.
- Do not run tests, lint, type checking or build unless requested.
- After the user reports implementation or a commit, inspect latest main again.
- Do not treat proposed changes as applied until verified in source.

## Reading order

1. AGENTS.md and any applicable nested agent instructions.
2. README.md.
3. docs/CURRENT_STATUS.md.
4. docs/ARCHITECTURE.md.
5. Relevant API and design documentation.
6. package.json and current application code.
7. docs/design/reference/html-convert/README.md.
8. Relevant HTML/CSS reference pages.
9. Relevant Backend controllers, services, DTOs, enums and security.

Some older documents contain outdated assumptions.
Report discrepancies and follow current user instructions
and inspected source.

## Architecture

Preserve the existing stack and dependency versions.

Dependency direction:

app → features → shared infrastructure

- Vue Query owns server state.
- Pinia owns cross-route client state.
- Components own short-lived presentation state.
- Pages and components do not call Axios directly.
- Feature API composables wrap generated clients.
- Generated DTOs and clients remain under src/services/api/generated.
- Never edit generated files manually.
- Cross-feature imports use public exports or shared abstractions.
- Do not move existing files merely to match a proposed directory tree.

Orval currently uses axios-functions.
The existing API generation script is npm run api.

## UI source

Figma is not used in the current workflow.

Use HTML/CSS in docs/design/reference/html-convert.
Read its README for CSS ownership and responsive rules.

Use CSS variables for design values.
Reuse existing tokens or declare appropriate new tokens.
Keep page-specific content scoped with data-reference.
Load responsive rules after the applicable page styles.

Verify relevant screens manually at 390, 768, 1024 and 1440px.

Reference sample data is illustrative.
Application product data must come from verified Backend contracts.

## API source

Use this priority:

1. Current Backend controller, service, DTO, validation, enum and security.
2. Verified runtime OpenAPI.
3. Reviewed Frontend OpenAPI snapshots.
4. API inventory and other documentation.

Do not invent endpoints, fields, enums, permissions or response shapes.
Do not assume all successful responses share one envelope.

Use the shared HTTP infrastructure.
Use OAuth2/OIDC Authorization Code with PKCE.
Never add a Frontend client secret or submit passwords directly from Vue.

## Current seat implementation

The standalone S1 room-seats page exists in source.
Manual verification remains pending.

Its columns represent catalog ordering, not persisted coordinates.
Padding cells are presentation cells.

SeatResponse and UpdateSeatRequest do not expose matrix coordinates
or an independent column count.

RoomLayout APIs persist geometry and physical elements.
Do not confuse this contract with independent catalog matrix persistence.

The agreed matrix behavior includes:

- Seats sized 40px by 30px.
- Horizontal and vertical gaps of 40px.
- Empty cells within rows.
- Additional columns.
- Occupied-cell insertion shifting following seats right.
- No overwrite or swap.
- The Hàng heading outside the canvas.
- Physical elements on the separate room-layout screen.

The full editor and persistence remain incomplete.

## Current round

S1.1 — Remove superseded seat implementations and reconcile handoff documents.

Consult CURRENT_STATUS.md for application and verification status.
Do not restore the old dialog or temporary matrix implementation.

## Deferred scope

R28 Notification remains deferred.
Do not create its clients, DTOs, routes, stores or UI.

## Round output

For each round:

1. State the objective and affected files.
2. Give complete file contents or exact replacement blocks.
3. Explain relevant architecture and Backend data rules.
4. Give manual verification steps.
5. Give a separate commit message.
6. Wait for the user's implementation or commit report.
