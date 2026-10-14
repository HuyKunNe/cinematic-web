# Current Status

## Last audited

2026-10-14

## Audited source

- Frontend main: 9d81421
- Backend main: dc6209debcd6b7cf350f1e9d2b2d71a8ad5adfc7

The room-seats reference alignment and room-layout preview are present
in the audited Frontend source.

These commits identify the source inspected before inspector draft creation.
Manual browser verification remains unconfirmed.

## Technology and architecture

Use package.json and package-lock.json as the version authority.

The existing stack includes Vue, TypeScript, Vite, Vue Router,
Pinia, TanStack Vue Query, Axios, Orval, oidc-client-ts,
Tailwind CSS, Reka UI, VueUse, VeeValidate and Zod.

Dependency direction:

app → features → shared infrastructure

Rules:

- Vue Query owns server state.
- Pinia owns cross-route client state.
- Pages and components must not call Axios directly.
- Feature API composables wrap generated clients.
- Generated API files must not be edited manually.
- Cross-feature imports use public exports or shared abstractions.
- Do not add dependencies or change architecture without authorization.

Application bootstrap currently resides in src/main.ts and src/App.vue.
Routes are currently composed in src/router/index.ts.
Do not move these files merely to match a proposed directory tree.

Orval currently uses axios-functions.
The existing generation script is npm run api.
Current inputs are runtime OpenAPI URLs declared in orval.config.ts.
Reviewed snapshots also exist under openapi/.

## Visual source

Use docs/design/reference/html-convert.

Read its README before implementing a screen.

Reference CSS ownership:

- reference-tokens.css: design tokens.
- reference-base.css: reset and accessibility.
- admin-unified.css: Admin shell.
- admin-components.css: shared Admin components.
- Page CSS: page-specific content scoped with data-reference.
- reference-responsive.css: responsive rules, loaded last.

Reuse existing CSS variables.
Declare new design values as tokens.

Static reference content is illustrative.
Do not treat sample movies, seats, prices or statistics as application data.

Figma is not used in the current workflow.

## Implemented source code

Customer:

- Home and cinema-scoped programme selection.
- Movie listing and movie detail.
- Booking start and seat selection grouped by row.
- OIDC login and callback integration.

Admin:

- Navigation and dashboard.
- Movie and genre management.
- Cinema management.
- Room management.
- Dedicated room-seats page.
- Seat catalog presentation grouped by row.
- Seat-range creation.
- Seat activity updates.

These entries describe existing source code.
Manual browser verification remains unconfirmed.

## S1 — Standalone room-seats page

Status: IMPLEMENTED IN SOURCE — MANUAL VERIFICATION PENDING

Verified in the audited Frontend commit.

Current flow:

1. Open Admin navigation: Phòng và ghế.
2. Select a cinema.
3. Open the room action menu.
4. Select Ghế của phòng.
5. Manage the room's seat catalog on the dedicated page.

Implemented behavior:

- Route: /admin/rooms/:roomId?/seats.
- AdminLayout owns the header, sidebar and breadcrumb.
- Cinema and room selectors update the route.
- Direct room URLs load room and cinema context from Backend.
- Managed-seat reads include active and inactive seats.
- Catalog seats are grouped by row and sorted for presentation.
- Seat width is 40px and height is 30px.
- Horizontal seat gap is 40px.
- Vertical row gap is 40px.
- The Hàng heading and row labels remain outside horizontal scrolling.
- Seat details use Backend catalog data.
- Seat activity updates use the existing seat update contract.
- AdminSeatRangeForm owns seat-range creation.
- Page responsive CSS is loaded after page CSS.

Current presentation files:

- src/features/rooms/admin/pages/AdminRoomSeatsPage.vue
- src/features/rooms/admin/components/AdminSeatRangeForm.vue
- src/features/rooms/admin/mappers/admin-seat-catalog.mapper.ts
- src/styles/admin-room-seats.css
- src/styles/admin-room-seats-responsive.css

## Matrix data boundary

The current page presents catalog ordering.

Displayed columns are not persisted room coordinates.
Padding cells at row ends are presentation cells.
Seat numbers must not be interpreted as saved matrix positions.

The agreed full matrix editor must support:

- Empty cells within a row.
- Additional columns even when the current width equals the largest row.
- Dropping onto an occupied cell shifts the target and subsequent seats right.
- No overwrite or swap.
- The Hàng heading outside the canvas.
- Row labels aligned with seat rows.
- Physical room elements configured on a separate screen.

These editing and persistence capabilities are not implemented
in the active S1 page.

SeatResponse has no matrix row index, column index or column count.
UpdateSeatRequest cannot save matrix positions.

Backend RoomLayout content can persist seat geometry and physical elements.
This is a separate layout contract, not an independent seat-catalog
matrix contract.

Do not introduce matrix persistence through seat updates,
seat-number inference or localStorage.

## S1.1 — Superseded seat implementation cleanup

Status: IMPLEMENTATION PROVIDED — APPLICATION PENDING

Scope:

- Remove the unused AdminRoomSeatsDialog.vue.
- Remove the unused temporary AdminSeatMatrix.vue.
- Remove admin-seat-matrix.css.
- Remove old seat-dialog CSS from admin-rooms.css.
- Remove tokens used only by the old seat dialog.
- Reconcile CURRENT_STATUS.md and AI_CONTEXT.md with current source.

The active standalone page and its API behavior remain the S1 baseline.

Only mark S1.1 applied after inspecting the user's new commit.
Only mark browser verification complete after the user reports its result.

## Verified Backend constraints

Inventory:

- Management reads include inactive records when active is omitted.
- Inventory administration requires inventory:manage.
- Seat-range creation requires an active room.
- Seat updates require seatNumber, rowLabel, seatType and active.
- Catalog seat activity and per-showtime ShowSeat state are separate.

Room layouts:

- Draft creation, content reads, content replacement and publication exist.
- Content replacement replaces all seats and elements.
- Empty arrays clear the corresponding content.
- expectedVersion refers to layout.version, not layout.layoutVersion.
- Geometry uses logical layout units.
- Publication requires at least one seat and one SCREEN.
- Publication validates geometry bounds and prohibited overlaps.
- Publishing does not bind a layout to showtimes.

Movies:

- Movie catalog pagination and filters exist.
- Movie metadata updates and editorial Hero APIs exist.

Booking:

- Booking creation returns 202 Accepted.
- Booking responses use the Backend response envelope.
- Do not assume every service uses the same success response shape.

## Remaining implementation

- Full seat matrix editing and persistence.
- Physical room layout editor.
- Admin showtime integration.
- Admin booking and user integration.
- Customer cinema and showtime pages.
- Account and booking history.
- Completion of booking and payment flows.

Admin showtimes, bookings, users, promotions and showtime creation
currently use AdminReferencePage.

The Admin room-layout route implements layout-version reads,
saved-content preview, object inspection and preview zoom.

The page follows the reference editor structure:
heading, status notice, toolbar, canvas and inspector.

Inspector draft creation has been proposed.
Application and manual verification remain pending.

Content editing, saving, publication and seat matrix persistence
remain incomplete.

Customer cinemas, showtimes, account and booking history
currently use placeholders.

R28 Notification remains deferred.
Do not scaffold its routes, clients, DTOs, stores or UI.

## Documentation follow-up

DESIGN_SYSTEM.md, ROADMAP.md, API_INTEGRATION.md,
DEFERRED_FEATURES.md and parts of ARCHITECTURE.md
still contain outdated assumptions.

Examples include Figma requirements, foundation progress,
API generation paths and unavailable movie APIs.

Current user instructions and inspected source take precedence.
Reconcile the remaining documents in a separate focused round.

## Verification policy

No tests, lint, type checking or build were run during this audit.

Provide manual verification steps after every round.
Do not claim runtime success from source inspection alone.

## Active round — Create room layout drafts from the inspector

Status: IMPLEMENTATION PROVIDED — APPLICATION PENDING

Scope:

- Create an empty draft through the generated API client.
- Validate canvas dimensions against the Backend request constraints.
- Receive the layout revision number from Backend.
- Update the room's layout-list cache from the response.
- Select the created draft and load its content.
- Keep the existing reference workspace structure.
- Prevent navigation while the create request is pending.
- Preserve inputs after request failure.
- Require explicit list reload before another create attempt after failure.
- Do not automatically retry creation.

No content replacement or publication is implemented in this round.

No automated checks were run.
Manual verification remains pending.
