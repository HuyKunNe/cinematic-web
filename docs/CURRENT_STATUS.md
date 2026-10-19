# Current Status

## Last source inspection

2026-10-19

Inspected revisions:

- Frontend main: 3d47e0f
- Backend main: dc6209debcd6b7cf350f1e9d2b2d71a8ad5adfc7

These revisions identify inspected source.
They do not establish successful browser or automated verification.

## Working constraints

- Both repositories are read-only for the assistant.
- The user applies and commits proposed changes.
- Do not run tests, lint, type checking, build or formatting unless requested.
- Do not modify generated API files manually.
- Do not treat proposed changes as applied until confirmed in source.

## Application architecture

Use package.json and package-lock.json for dependency versions.

Current foundations include:

- Vue and TypeScript.
- Vite and Vue Router.
- Pinia and TanStack Vue Query.
- Axios and Orval.
- oidc-client-ts.
- Tailwind CSS and Reka UI.
- VeeValidate and Zod.

Application bootstrap is in src/main.ts and src/App.vue.
Routes are composed in src/router/index.ts.

Vue Query owns server state.
Pinia owns cross-route client state.
Feature composables own local editor behavior.

Orval uses axios-functions.
Its current inputs are runtime OpenAPI URLs.
Reviewed snapshots also exist under openapi/.

## Visual source

Use docs/design/reference/html-convert and its README.

Preserve shared Admin navigation and shell styling.
Use existing tokens instead of a separate palette.
Do not use Figma unless explicitly requested.

Reference sample data is illustrative and must not become
unverified application data.

## Implemented application areas

Customer source includes:

- Home and cinema-scoped programme selection.
- Movie listing and movie detail.
- Booking start and local seat selection.
- OIDC login and callback handling.

Admin source includes:

- Navigation and dashboard.
- Movie and genre management.
- Cinema management.
- Room management.
- Dedicated room seat catalog management.
- Table-based room layout editing.

These entries describe source implementation, not verified runtime behavior.

## Room seat catalog

AdminRoomSeatsPage remains separate from the layout editor.

It supports:

- Room and cinema context.
- Reads of managed catalog seats.
- Grouped catalog presentation.
- Seat-range creation.
- Seat activity updates.

Catalog ordering is not the persisted position of a seat in the new matrix.
Catalog activity is separate from per-showtime ShowSeat status.

## Room layout design reference

Implemented in reference files:

- docs/design/reference/html-convert/admin-room-layout.html
- docs/design/reference/html-convert/admin-room-layout.css
- docs/design/reference/html-convert/admin-room-layout.js

The reference uses an HTML table and local JavaScript state.
It starts with an empty 6 × 6 matrix.
Its save and publish controls do not call APIs.

## Vue matrix editor

Implemented source:

- src/features/rooms/admin/pages/AdminRoomLayoutPage.vue
- src/features/rooms/admin/components/AdminSeatMatrixEditor.vue
- src/features/rooms/admin/composables/use-admin-seat-matrix.ts

Behavior:

- Empty 6-row, 6-column initialization.
- Row labels A through Z, then AA, AB.
- Row headers use th with scope="row".
- No numbered column header.
- Screen above the table.
- Add-row and add-column actions at matrix edges.
- Insert and delete rows or columns.
- Keep the matrix rectangular.
- Preserve empty cells between seats.
- Delete a seat without removing its cell.
- Renumber occupied cells from 1 through n within each row.
- Default new seats to STANDARD.
- Support STANDARD, VIP, COUPLE and ACCESSIBLE.
- Update seat and matrix statistics.
- Provide field errors, keyboard focus and horizontal scrolling.
- Warn before leaving a changed matrix.

Each seat occupies one table cell in the current UI.

Editor state exists only in memory.
Save and publish are disabled.
Existing Backend layouts are not loaded.

## Removed legacy editor

The application no longer uses the old room-layout:

- Canvas/SVG object editor.
- Ruler and preview zoom.
- Free-position dragging.
- Geometry inspector and physical element forms.
- Draft initialization through canvas dimensions.
- Seat geometry initialization and row movement mappers.
- Feature-specific layout queries used by that editor.
- Global canvas page and responsive styles.

Generated Backend clients remain because they represent existing contracts.
Their presence does not mean the new matrix editor uses them.

## Backend matrix integration boundary

The inspected Backend has not yet migrated to the table matrix model.

Current contracts include:

- CreateRoomLayoutRequest:
  roomId, canvasWidth and canvasHeight.
- ReplaceRoomLayoutContentRequest:
  expectedVersion, seats and elements.
- Seat inputs:
  existing seatId and geometry.
- Content responses:
  layout metadata, seat snapshots and element geometry.

These contracts do not directly represent:

- Independent row and column counts.
- Entirely empty rows or columns.
- A new seat created by entering a number into a matrix cell.
- Matrix-owned changes to numbering and seat type.

Do not send the frontend SeatMatrixDocument to these endpoints.
Do not restore geometry persistence as a workaround.

## Next integration work

After a Backend matrix contract is implemented and inspected:

1. Review the runtime OpenAPI and source revision.
2. Regenerate affected API clients.
3. Define DTO-to-editor and editor-to-request mappers.
4. Load matrix dimensions and cells.
5. Create drafts with the agreed defaults.
6. Save full matrix content with revision handling.
7. Integrate publication and validation errors.
8. Verify empty cells and empty trailing rows/columns survive reload.

The matrix API fields and endpoint behavior must come from Backend source.
No proposed transport shape is treated as an implemented contract.

## Other remaining work

- Admin showtime management and showtime creation integration.
- Admin booking and user management integration.
- Customer cinema and showtime pages.
- Account and booking history.
- Booking creation and payment completion.
- Reconciliation of older architecture, roadmap and API documents.

Admin showtimes, bookings, users, promotions and showtime creation
still use reference pages.

Customer cinema, showtime, account and booking history routes
still include placeholders.

R28 Notification remains deferred.

## Verification

No tests, lint, type checking or build were run in this documentation round.

Browser verification remains pending.
Use manual checks at 390, 768, 1024 and 1440px.
Do not mark persistence complete while editor data remains in memory.
