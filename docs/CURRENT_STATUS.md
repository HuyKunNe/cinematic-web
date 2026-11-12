# Current Status

## USER booking result follow-up — 2026-11-12

The booking-detail source now includes a non-polling showtime/movie/room/cinema
summary using existing generated context reads, after owner-scoped booking data
is validated. It labels current catalogue metadata separately from stored seat
fares. Detail status still follows Backend polling; the expiry clock updates
once per second. Terminal rejected/cancelled/expired orders can choose another
showtime. No USER payment initiation contract was found in current generated
clients or inspected Payment controllers/security; no simulated checkout added.

Verification is limited to syntax/diff/module transforms. No create/cancel/payment
mutations, browser interactions, tests, lint, typecheck or build were performed.

## USER profile follow-up — 2026-11-12

Current `/account` source now wires generated GET/PUT `/api/v1/users/me` after
checking CurrentUserController, profile DTOs/service and authenticated security.
It reads verified email and edits first/last names plus phone. Queries and response
identity checks are scoped to the authenticated subject. Email/username/password
are not editable in this form. The older customer account placeholder descriptions
below are historical audit findings, not the current implementation.

The Lumière form includes loading/retry, validation, pending, save feedback, undo,
owner isolation and responsive fields. No API mutations or browser/manual checks
were performed; tests, lint, typecheck and build were not run. See USER_ACCOUNT_FLOW.md.

## Last source inspection

2026-11-06 — roadmap tasks A0.1 and A0.2 (separate rounds).

A0.2 started from Frontend `8c081d0` with a clean working tree. The revisions and
uncommitted-file notes below describe the earlier A0.1 inspection.

Inspected local checkouts:

- Frontend: `E:/java/cinematic-web`, branch `main`, HEAD `667bfb94683c91c8c68d823e1e148093d01ae069`.
- Frontend origin: `https://github.com/HuyKunNe/cinematic-web.git`.
- Backend (read-only): `E:/java/cinema-system`, HEAD `ac0915521d5562d4836ab1d95a5a3883a835148a`.
- Backend origin: `https://github.com/HuyKunNe/cinema-system.git`.

No fetch was performed; these are local revisions, not a claim about the latest remote state.
The Frontend already had uncommitted changes in `package-lock.json` and generated
Movie/Inventory files. Backend had an uncommitted `note.md`. Those changes were
preserved. Findings below describe the inspected working tree, not just HEAD.

Recent source evidence includes:

- `576a110`: showtime projection and pricing selections.
- `a9ae417`: nested screening versions in movie create/update and refreshed showtime options.
- `e0abe47`: generated Payment refund API removal.
- `d4768fc`: customer header search connected to the movie catalog.
- `bb245d5`: read-only Admin booking detail with stored seat fares.

Source inspection and OpenAPI reads do not establish successful business operations,
browser behavior, persistence round trips or automated verification.

## Working constraints

- For this task, the user authorized Frontend working-tree edits. Backend remains read-only.
- Do not overwrite existing uncommitted changes, create commits or push.
- Do not run tests, lint, type checking, build or repository-wide formatting unless requested.
- Do not modify generated API files manually or add dependencies without approval.
- R28 Notification remains deferred; do not add its UI, routes or clients.

## Architecture and visual source

Use `package.json` and `package-lock.json` for actual dependency versions and scripts.
Bootstrap remains in `src/main.ts` and `src/App.vue`; routes are in `src/router/index.ts`.
Vue Query owns server state; Pinia owns cross-route client state; feature composables
own local editor behavior. Feature queries wrap the generated Axios clients and shared HTTP infrastructure.

`npm run api` invokes Orval with `orval.config.ts`, using `axios-functions` and runtime
OpenAPI at localhost ports 8081 through 8085. Reviewed snapshots are under `openapi/`.
No generation was performed during A0.1.

Use `docs/design/reference/html-convert/README.md`, relevant HTML/CSS references and
`src/styles/tokens.css`. The reference README and room-layout HTML/CSS were read in
this audit. No UI was changed or visually verified. Reference data is illustrative.

Some guidance is stale: `docs/DESIGN_SYSTEM.md` still calls Figma the visual source,
and `docs/AI_CONTEXT.md` still describes matrix persistence as absent. Follow the
current user instructions, `AGENTS.md`, HTML references and inspected source. Figma
was not accessed. Reconciliation of those documents is outside this A0.1 change.

## Implementation and verification ledger

“API wired” means a reachable page/component calls feature queries or mutations backed
by generated clients. It does not mean the operation was exercised against Backend.
Browser/manual interaction and automated checks were not run for any row in this audit.

| Area | Code present | API wired in source | Browser/manual | Automated checks |
| --- | --- | --- | --- | --- |
| Admin dashboard | Yes | Movie, cinema and schedule reads; not proof of complete reporting | Not run | Not run |
| Admin movies and genres | Yes | Reads and mutations, including nested screening versions | Not run | Not run |
| Admin cinemas, rooms and room formats | Yes | Management queries and mutations | Not run | Not run |
| Admin room seat catalog | Yes | Published seat-map reads and catalog seat activity changes | Not run | Not run |
| Admin room matrix | Yes | Load, create draft, save, publish and copy published layout | Not run | Not run |
| Admin pricing | Yes | List/detail, draft/configuration/fares, publish, lookup and previews | Not run | Not run |
| Admin showtimes | Yes | Day-range list, creation, pricing assignment and opening for booking | Not run | Not run |
| Admin bookings | Yes | Admin search/list and read-only detail | Not run | Not run |
| Admin payment operations | Generated lookup clients exist | No payment lookup/reconciliation UI wired in inspected booking pages | Not run | Not run |
| Admin users and promotions | Reference pages | No management integration in those routes | Not run | Not run |
| Customer home, movie catalog/detail | Yes | Movie/programme reads and header search | Not run | Not run |
| Customer cinemas | List page and cinema selection | Location/programme reads; no dedicated cinema-detail route | Not run | Not run |
| Customer booking start and seat selection | Yes | Context, seat/status reads and server quote; selection remains local | Not run | Not run |
| Customer login/callback | Yes | OIDC authorization code flow with PKCE | Not run | Not run |
| Customer standalone showtimes, account and booking history | Placeholders | No completed page integration | Not run | Not run |

## Admin movies and screening versions

Evidence:

- `src/features/movies/admin/components/AdminMovieScreeningFields.vue`.
- `src/features/movies/admin/components/AdminMovieEditorDialog.vue`.
- `src/features/movies/admin/schemas/admin-movie-screening.schema.ts`.
- `src/features/movies/admin/api/admin-movie-queries.ts`.

The editor already has a checkbox matrix for projection technology and image format.
New rows default to STANDARD and 2D. A selected combination can contain multiple
language configurations. Persisted definitions are disabled in the editor, while
activity can be changed. Existing rows retain their ID and expectedVersion.

Create/update request mappers send `screeningVersions` within the movie request.
Validation rejects empty lists and duplicate complete definitions, including format,
projection, audio language, presentation type and subtitle language. New movie
versions must be active. These are observed code paths, not verified save results.

A1.2 already has the matrix and STANDARD × 2D default in source. A source follow-up
after A0.2 inspected MovieScreeningVersion and MovieScreeningVersionService: the current
constructor/service accepts the two format enums and four projection enums independently,
with no extra combination restriction. The current matrix therefore matches that source
policy. This does not establish room compatibility or browser verification.

### A1.3 follow-up — 2026-11-06

Started from FE `7b2357f` with a clean working tree. Inspected Backend HEAD `34fafae`
read-only, including MovieScreeningVersion, MovieScreeningVersionService and MovieErrorCode.
Backend had an uncommitted MovieScreeningVersionController change; it was not modified.

Found and corrected a remaining validation mismatch: Backend's ScreeningVersionIdentity
compares trimmed audio/subtitle languages case-insensitively, while FE previously used
case-sensitive identity keys. The feature schema now lowercases only the comparison
key, so definitions differing only in language casing are rejected before submission.
The request retains the language spelling and all existing ID/expectedVersion/active fields.
Different language configurations, formats, projections and presentation types remain
distinct; the nonempty-list rule and nested create/update requests remain in place.

Added localized messages for the existing Backend codes MOVIE_SCREENING_VERSIONS_REQUIRED,
MOVIE_SCREENING_VERSION_ALREADY_EXISTS and MOVIE_SCREENING_VERSION_SET_INCOMPLETE.
No endpoints, generated models, component markup, styles or dependencies changed.

Verification in this follow-up was static source/diff review only; no tests, build,
lint, type-check, formatter, browser interactions or API mutations were run.
Manual follow-up (pending):

1. In create and edit, add two otherwise identical versions with audio language
   `English`/`english` and subtitle language `Việt`/`việt`; saving should report a duplicate.
2. Change audio or subtitle to a genuinely different language; both versions should
   remain valid. Repeat with different format/projection/presentation configurations.
3. Remove all new versions and confirm empty-list rejection. In edit, confirm persisted
   definitions remain read-only and saving keeps all IDs, expectedVersion and active states.
4. Verify create/update send one nested screeningVersions list and no follow-up version POST.
5. Confirm the three Backend error codes show the localized messages when returned.

## Admin room matrix and catalog

The October status describing a local-only matrix and geometry-only Backend is obsolete.

Evidence:

- `src/features/rooms/admin/pages/AdminRoomLayoutPage.vue`.
- `src/features/rooms/admin/components/AdminSeatMatrixEditor.vue`.
- `src/features/rooms/admin/composables/use-admin-seat-matrix.ts`.
- `src/features/rooms/admin/mappers/admin-room-matrix.mapper.ts`.
- `src/features/rooms/admin/api/admin-room-matrix-queries.ts`.
- `src/features/rooms/admin/api/admin-room-matrix-publication.ts`.
- `src/features/rooms/admin/api/admin-room-matrix-copy.ts`.

The page loads layout versions/content and has draft creation, save, publish and copy
from published layout mutations. It checks response identity/version/content,
refreshes relevant queries and requires reload after uncertain/conflicting results.
Unsaved-change route guards remain. Published content is read-only in the editor.

The mapper preserves row/column dimensions, reconstructs null cells from indexed
seats and sends matrix dimensions plus occupied positions. Empty rows and trailing
columns do not depend on seat catalog ordering. A COUPLE seat spans two columns;
only its starting position is sent. The second cell is reserved, not a second seat.
This supersedes the old one-cell description.

Backend source now includes `RoomLayoutMatrixInput`, `RoomLayoutMatrixResponse`,
`RoomLayoutMatrixService` and matrix publication/copy support. In the inspected DTOs:

- `CreateRoomLayoutRequest` defaults `{ roomId }` to an empty 6 × 6 matrix.
- `ReplaceRoomLayoutContentRequest` accepts `expectedVersion` and `matrix`.
- Matrix and legacy geometry representations are mutually exclusive.
- Matrix dimensions are explicit; occupied seats use rowIndex and columnIndex.

Do not restore geometry persistence or infer matrix positions from catalog numbering.
The seat catalog page remains a separate management capability.
`AdminRoomCapacityCell.vue` obtains capacity/seat counts through the published-seat-map
query used by `useAdminRoomSeatsQuery`. Full A2.4 summary coverage still needs review.
A2 is no longer blocked simply by absence of a matrix contract; persistence round trips,
publication validation, conflict behavior and summaries still require verification.

## Admin pricing and showtimes

Evidence is under `src/features/pricing/admin/` and `src/features/showtimes/admin/`.

Pricing has a routed Vue page, workflow creation, configuration editing, fare matrices,
published lookup and draft/version previews. Mutations call create/replace/publish
clients. Published quote lookup uses a read-only preview. Preview labels distinguish
unpriced cells from not-applicable cells and format priced values separately.
Audit A3 criteria individually before declaring the whole group complete, especially
ID preservation, zero prices, cancel/publish behavior and independent COUPLE fares.
COUPLE prices must remain per pair and may vary by ticket group, time band and format.

Showtime list data comes from `getShowtimesByTimeRange`; remaining filters and
pagination operate locally on the returned day data. Creation loads active movies,
rooms, screening versions, published pricing versions and published seat maps.
Version labels include projection technology and image format. Compatibility filtering
uses the room's `contentFormats`; it does not prove projection-technology compatibility.
Selection watchers clear/revalidate dependent IDs. Pricing assignment and explicit
opening-for-booking dialogs call Backend mutations. A full general edit form is not
established by these operations.

## Admin booking and payment boundary

`AdminBookingsPage.vue` and `admin-booking-queries.ts` use Admin booking list/search.
`AdminBookingDetailPage.vue` and `admin-booking-detail.ts` read stored booking and seat
fare data. The detail route requires ADMIN and does not recalculate historical prices.
Backend authorization and runtime 401/403 behavior still need verification.

Generated Payment lookup clients are not proof of UI integration. No payment
lookup/reconciliation flow is wired into the inspected Admin booking pages.
Refund clients were removed in `e0abe47`; do not reintroduce refund actions without
an approved Backend contract. Admin users/promotions remain reference routes.

## Customer integration boundary

`CinemasPage.vue` is a real API-backed list, not the old cinema placeholder. It supports
search, city filtering and shared cinema selection. No dedicated cinema-detail route
was found. The standalone showtimes, account and account-bookings routes remain placeholders.

Home and movie pages use programme queries; header search routes into the movie catalog.
Booking start and movie detail provide showtime selection. OIDC uses `response_type: code`
and `oidc-client-ts`; this is not evidence of a completed account/profile page.

`booking-queries.ts` currently combines active room catalog seats with showtime seat
statuses. It does not load the showtime's matrix snapshot. Seat selection is local;
`booking-seat-quote.ts` calls `quoteShowtimeSeats` and checks per-pair COUPLE units.
The UI explicitly states selected seats have not been held. Hold/release, booking
creation, payment initiation and payment-result flows are not completed by this quote.
Do not mark U2 complete or treat catalog-based positions as the showtime snapshot.

## Runtime OpenAPI check for A0.1

Read-only HTTP GETs succeeded on 2026-11-06, using the inputs in `orval.config.ts`.
The source service configuration declares the matching service names, default ports
and `/v3/api-docs`; Movie security permits that documentation endpoint.

| Runtime URL | Reported OpenAPI version | Inspected schemas |
| --- | --- | --- |
| `http://localhost:8081/v3/api-docs` | 3.0.1 | CreateMovieScreeningVersionRequest, SaveMovieScreeningVersionRequest, MovieScreeningVersionResponse |
| `http://localhost:8083/v3/api-docs` | 3.1.0 | ShowtimeScreeningVersionResponse, RoomLayoutMatrixInput, RoomLayoutMatrixResponse |

All four inspected screening-version schemas expose `projectionTechnology` with
STANDARD, IMAX, FOUR_DX and SCREEN_X, separately from `contentFormat` values 2D/3D.
Movie create/save version schemas default to STANDARD and 2D. Movie response requires
projectionTechnology; the inspected Inventory showtime-version schema has no required
list. These markers agree with the inspected DTOs/enums and current generated models.

This confirms the relevant schema is served locally. It does not identify the commit
of the running binaries: no runtime build revision was established. Do not label these
responses as exports from Backend HEAD or as a full contract/security audit. No mutation
or product-data request was performed during this check.

## Roadmap handoff and remaining work

A0.1 updated the source status and confirmed projection schemas in local runtime OpenAPI.

A0.2 ran `npm run api` using Orval 8.38.0 against all five configured local services.
All five reported success; generated content already matched HEAD, so no generated
source edits were needed. Static comparison found exact operation-ID/export matches:
Movie 19, User 7, Inventory 66, Booking 6 and Payment 5. No Notification paths were found.
The npm PowerShell wrapper emitted a prefix-path access warning, but Orval completed
with exit code 0. No dependencies were installed or changed.

Reviewed the screening-version and matrix request/response markers against Backend
DTOs/enums/controllers, plus Admin booking/payment lookup and Payment security.
Updated the API inventory and generation notes. Refreshed Movie/Inventory snapshots
with export timestamps, SHA-256, inspected source revision and explicit runtime limits.
The old Movie metadata placeholders and old Inventory export were replaced. The old
Inventory snapshot's sale-scopes/preview operations are absent from current runtime/source;
do not restore those endpoints based on the old snapshot.

Runtime build provenance remains unconfirmed: all five `/actuator/info` responses were
`{}`. Backend HEAD identifies inspected source, not the running binaries. The scoped
contract markers match source; this does not certify every DTO, permission or business
operation. See `docs/api/OPENAPI_GENERATION.md` and snapshot metadata for the review scope.
User/Booking/Payment were generated from live specs; no snapshots were added for them.

The A1.3 follow-up above fixes case-insensitive duplicate validation and missing error
messages. A1.1 generation and A1.2 matrix behavior already exist in source; their
presence does not imply browser verification. Next, audit A1.4 dependency resets and
compatibility against the actual room/version contract, then follow the roadmap order. Do not
reimplement the already-wired matrix/pricing/showtime/booking flows on the assumption
that the October status is current. Keep R28 Notification deferred.

## Verification and manual follow-up

Performed in A0.1:

- Read Git remotes, branches/status, local revisions and recent history.
- Read routes, feature components/queries/mappers, generated models, design guidance
  and relevant Backend controllers/DTOs/enums/security configuration without modifying Backend.
- Read the two local runtime OpenAPI documents and inspected the schema markers above.
- Reviewed the documentation diff and checked existing changed-file hashes for preservation.

Not performed: browser/manual interactions, responsive/accessibility checks, business
API mutations, Orval generation, tests, lint, type checking, build or formatting.
No historical automated or browser result was independently established by this audit.

Manual follow-up (pending, not results):

1. Establish runtime build provenance before claiming snapshots came from an exact BE
   commit. All five Orval inputs were reachable and generation completed in A0.2.
2. Exercise movie create/edit with multiple language variants, ID/version preservation,
   empty/duplicate rejection and immutable persisted definitions.
3. Save/reload matrix drafts with empty rows/columns and COUPLE seats; verify publication,
   copy, conflict/reload handling and unsaved-change guards.
4. Verify pricing draft/publish/cancel, zero/unpriced/not-applicable states and different
   COUPLE fares across ticket groups, time bands and 2D/3D.
5. Verify showtime dependency resets, compatibility errors and stored booking fares.
6. Check relevant screens at 390, 768, 1024 and 1440px before claiming visual completion.
