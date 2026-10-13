# Current Status

## Last audited

2026-10-13

## Audited source

- Frontend main:
  8abf4e3511c66e3d81ff9e25a40dd08a3161e019
- Backend main:
  dc6209debcd6b7cf350f1e9d2b2d71a8ad5adfc7

This audit records source-code findings.
It does not claim browser verification or successful runtime integration.

Both repositories are read-only for the assistant.
The user applies and commits proposed changes.

## Technology and architecture

- Vue, TypeScript, Vite, Vue Router, Pinia and TanStack Vue Query.
- Axios, Orval, oidc-client-ts, Tailwind CSS and Reka UI.
- VeeValidate and Zod for existing form validation.
- Preserve versions from package.json and package-lock.json.
- Dependency direction:
  app → features → shared infrastructure.
- Vue Query owns server state.
- Pinia owns cross-route client state.
- Pages must not call Axios directly.
- Generated API files must not be edited manually.

Orval currently uses axios-functions.
Feature composables wrap generated clients with Vue Query.
The existing generation script is npm run api.

## Visual source

Use docs/design/reference/html-convert.

Follow its README for CSS ownership:
tokens, base, admin shell, shared admin components,
page-scoped content and responsive rules.

Static reference data is illustrative.
Figma is not the implementation source for the current workflow.

## Implemented source code

Customer:

- Home and cinema-scoped programme selection.
- Movie listing and movie detail.
- Booking start and seat selection as a list grouped by row.
- OIDC login and callback integration.

Admin:

- Navigation and dashboard.
- Movie and genre management.
- Cinema management.
- Room management.
- Seat-range creation and seat activity updates.

These entries describe existing code, not completed manual verification.

## Remaining implementation

- Runtime seat matrix.
- Physical room layout editor.
- Admin showtime integration.
- Admin booking and user integration.
- Customer cinema and showtime pages.
- Account and booking history.
- Completion of booking/payment flows.

Admin showtimes, bookings, users and promotions currently use
AdminReferencePage.

Customer cinemas, showtimes, account and booking history currently
use placeholders.

ADMIN_ROOM_LAYOUT currently uses a placeholder and has a matrix title.
The future implementation must distinguish the seat matrix from
physical room geometry.

## Seat matrix baseline

- Seat width: 40px.
- Seat height: 30px.
- Horizontal seat gap: 40px.
- Vertical row gap: 40px.
- Empty cells may exist within a row.
- Additional columns are allowed.
- Dropping onto an occupied position shifts the target seat and
  subsequent seats right; it must not overwrite or swap seats.
- The "Hàng" heading stays outside the canvas.
- Physical room elements belong to the separate layout editor.

The reference matrix exists.
S1 provides a standalone page showing the actual seat catalog in a matrix.
Application and manual verification are pending.

The full position editor and matrix persistence remain incomplete.
The previous temporary dialog editor proposal is superseded.
Application and manual verification are pending.

The matrix stylesheet is loaded by AdminSeatMatrix.vue.
It is not imported globally by main.css.
SeatResponse does not contain matrix coordinates or column count.
Do not infer persisted positions from seat numbers.

## Backend contract findings

- Movie catalog pagination and filters exist.
- Movie metadata includes backdropUrl and ageRating.
- Editorial Hero APIs exist.
- Inventory management reads include inactive records.
- Inventory administration requires inventory:manage.
- Room layout APIs support draft content and publication.
- Replacing room layout content replaces both seats and elements.
- expectedVersion refers to layout.version, not layoutVersion.

These findings supersede older documentation that describes these
contracts as unavailable.

R28 Notification remains deferred.

## Previous round — Home recovery button

Status: IMPLEMENTED IN SOURCE — MANUAL VERIFICATION PENDING

Verified at frontend main:
331dd1d454aa2cccd3325e36cd4dccda8743ae67

HomePage imports the existing AppButton.
Manual browser verification has not been confirmed.

## Previous round — Home recovery button

Status: IMPLEMENTED IN SOURCE — MANUAL VERIFICATION PENDING

Verified at frontend main:
331dd1d454aa2cccd3325e36cd4dccda8743ae67

## Active round — S1 standalone room seats page

Status: IMPLEMENTATION PROVIDED — APPLICATION PENDING

The earlier M1 dialog-matrix proposal is superseded.

Scope:

- Dedicated Admin room-seats route.
- Room list navigation opens the dedicated page.
- Existing AdminLayout owns header, sidebar and breadcrumb.
- Cinema and room selectors support direct URLs and browser navigation.
- Room/cinema context is loaded from Backend.
- Managed seats include active and inactive records.
- Catalog is grouped by row and rendered in matrix form.
- Seat dimensions are 40px by 30px.
- Horizontal and vertical gaps are 40px.
- Row labels remain outside the horizontal scrolling canvas.
- Seat details and activity updates use actual Backend data.
- Seat-range creation is moved from the old dialog into a feature form.
- The old room-seats dialog is removed.
- Responsive page rules are loaded after page CSS.

Data boundary:
The displayed columns are catalog ordering, not persisted coordinates.
Padding cells at row ends are presentation cells.
They must not be treated as physical empty positions.

Persistence gap:
SeatResponse does not expose matrix dimensions or row/column positions.
The existing seat update request cannot save matrix positions.
Room layout content owns physical geometry and elements.

Drag/drop, insertion shifts and independent column creation are not
implemented in S1. They require an explicit matrix persistence contract.
Do not mark the full seat editor complete.

Room layout remains a separate placeholder route.
R28 remains deferred.

Manual verification is pending.
No tests, lint, type checking or build were run.

## Documentation follow-up

AI_CONTEXT, DESIGN_SYSTEM, ROADMAP, API_INTEGRATION and parts of
ARCHITECTURE still contain outdated assumptions.

Reconcile them in a separate documentation round.
Current user instructions and current source code take precedence.
