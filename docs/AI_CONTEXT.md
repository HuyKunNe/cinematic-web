# AI Context

## Project

Cinematic Web is the frontend for the Cinema Booking System.

Repositories:

- Frontend: https://github.com/HuyKunNe/cinematic-web
- Backend: https://github.com/HuyKunNe/cinema-system

Both repositories are read-only for the assistant.
The user applies and commits proposed changes.

## Working method

- Do not create, edit, delete or rename repository files directly.
- Do not create branches, commits, pull requests or pushes.
- Do not modify Backend.
- Provide implementation guidance through Markdown code blocks.
- Prefer complete replacement files.
- Include a manual verification checklist and proposed commit message.
- Do not run tests, lint, type checking, build or formatting unless requested.
- Inspect latest main after the user reports a commit.
- Distinguish inspected implementation from proposed implementation.
- Do not claim browser verification from source inspection.

## Reading order

1. AGENTS.md and applicable nested instructions.
2. README.md.
3. docs/CURRENT_STATUS.md.
4. Relevant application source and package.json.
5. Relevant design references.
6. Relevant Backend source.
7. API documentation and reviewed OpenAPI snapshots.

Current user instructions and inspected source take precedence over
outdated documentation.

## Architecture

Dependency direction:

app → features → shared infrastructure

- Vue Query owns server state.
- Pinia owns cross-route client state.
- Feature components and composables own local editor state.
- Pages and components do not call Axios directly.
- Feature API composables wrap generated clients.
- Generated clients and DTOs remain under src/services/api/generated.
- Never edit generated files manually.
- Cross-feature imports use public exports or shared abstractions.
- Do not add dependencies without authorization.
- Preserve existing bootstrap and router locations.

## Design source

Use docs/design/reference/html-convert.

Read the reference README for stylesheet ownership.
Preserve the Admin shell, sidebar, topbar and breadcrumb.
Do not use Figma unless explicitly requested.

Static reference content is illustrative.
Use verified Backend data for application product content.

Use existing application tokens in Vue.
Reference HTML tokens and application tokens do not always share names.

Application examples:

- --border-width-thin
- --control-height-md
- --font-family-display
- --opacity-disabled

Do not restore removed canvas styles to support the table editor.

## Authentication and APIs

Use the shared HTTP client.
Authentication uses OIDC Authorization Code with PKCE.
Never add a frontend client secret or submit passwords directly from Vue.

Contract priority:

1. Current Backend controller, service, DTO, entity and validation.
2. Verified runtime OpenAPI.
3. Reviewed OpenAPI snapshots.
4. API inventory and other documentation.

Do not invent endpoints, DTO fields, enums or response envelopes.
Orval currently uses axios-functions and runtime OpenAPI inputs.

## Room seat catalog

AdminRoomSeatsPage manages the existing seat catalog.

Catalog ordering is separate from the new room layout matrix.
Do not persist matrix cells by renaming catalog seats or updating their
activity status.

Preserve catalog queries, seat-range creation and activity updates
unless a separate task changes those capabilities.

## Current room layout editor

AdminRoomLayoutPage now mounts AdminSeatMatrixEditor.

Core files:

- src/features/rooms/admin/pages/AdminRoomLayoutPage.vue
- src/features/rooms/admin/components/AdminSeatMatrixEditor.vue
- src/features/rooms/admin/composables/use-admin-seat-matrix.ts

The legacy canvas editor, ruler, drag composable, geometry mappers,
feature layout queries and canvas styles have been removed.

Do not reintroduce:

- Canvas or SVG layout editing.
- Free-position seat dragging.
- X/Y, width/height or rotation inspectors.
- Zoom, page ruler or grid origin anchored to A1.
- Physical element editing in the seat matrix.

## Matrix rules

- New matrices contain 6 rows and 6 columns.
- All initial cells are null.
- Each row has the same number of cells.
- Row labels are derived from row order: A through Z, then AA, AB.
- No numbered column header is shown.
- The screen is above the matrix.
- Add-column action is beside the final column.
- Add-row action is below the final row.
- Row and column insertion creates empty cells.
- Column changes affect every row.
- Deleting a seat sets its cell to null.
- Deleting a row or column removes its contained seats.
- At least one row and one column remain.

An occupied cell contains a UI seat with number and seatType.
This UI model is not a Backend request DTO.

## Seat numbering and types

- Numbers are positive safe integers.
- Duplicate numbers are rejected within the same row.
- Different rows may reuse numbers.
- After insertion or deletion, occupied cells are numbered 1 through n
  from left to right, ignoring empty cells.
- The entered number is validated before insertion; the resulting
  number is determined by cell position.
- New seats use STANDARD.

Existing types:

- STANDARD
- VIP
- COUPLE
- ACCESSIBLE

The current table represents each seat in one cell.
COUPLE does not introduce colspan or remove adjacent cells.

## Persistence boundary

The current matrix is local, in-memory editor state.
Save and publish actions are disabled.
Existing saved layouts are not loaded into this editor.

The inspected Backend still uses geometry-based room layout contracts.
Do not send the matrix UI model to those endpoints.
Do not infer matrix dimensions from seat numbers or geometry.
Do not use localStorage as a substitute for Backend persistence.

Before enabling persistence:

1. Inspect the new Backend matrix contract.
2. Review actual OpenAPI and regenerate affected clients.
3. Add feature queries and DTO/UI mappers.
4. Support loading, saving, revision conflicts and publication.
5. Preserve empty cells, empty rows and trailing empty columns.
6. Keep manual verification status explicit.

## Deferred scope

R28 Notification remains deferred.
Do not scaffold its routes, clients, stores or UI.

## Round output

For each implementation round:

1. State the objective and affected files.
2. Provide complete files or explicitly requested replacement blocks.
3. Explain architecture and data boundaries.
4. Provide manual verification steps.
5. State checks that were not run.
6. Provide a proposed commit message.
