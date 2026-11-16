# Current Status

## USER schedule URL state — 2026-11-16

Change Showtime from the seat map opens `/showtimes` with the original movie and
cinema-local date, in movie mode. CustomerSchedule now reads its mode, movie,
cinema, date and content-format controls from URL query state, so reload and
Back/Forward restore the selected filters. Cinema lookup uses existing active
catalogue data; header city changes release an incompatible pinned cinema.

Embedded cinema schedules retain their fixed cinema, update only their existing
page query and ignore hidden format filters. Initial movie fallback no longer
pushes navigation automatically. Duplicate navigation is ignored, navigation
failures remain visible, controls lock while updating/checking and format becomes
part of the scope checked before booking. No API contract or business state change.

Manual checks: future-dated booking → Change Showtime; select both schedule modes,
movie/cinema/date/format; reload and Back/Forward; change header city; clear movie;
embedded cinema date selection; repeated date selection and navigation failures.
No tests/lint/typecheck/build or browser verification performed; no BE/generated/
reference edits, database changes, commits or pushes.

## USER movie-detail schedule filters — 2026-11-16

Movie detail now has the reference format selector alongside cinema/date, within
the reference-style filter bar. Uses generated screening-version content-format
values, derives available options from returned bookable showtimes and provides
an All Formats action when the selected format has no matching slot. Slot captions
include actual format, audio language, presentation and existing room details.

Date, cinema and format use URL query parameters (`date`, `cinema`, `format`) for
reload/sharing and Back/Forward. Active cinema links are resolved from the public
catalogue and synchronized with location selection; changing header city releases
an incompatible pinned cinema. Re-selecting the same filter avoids duplicate
navigation errors. Selection still rechecks availability and the selected format
before continuing through the existing booking/auth flow.

The view still shows the selected cinema rather than aggregating all cinemas in
the city; no new endpoint or fabricated showtime state was introduced. Manual
checks: valid shared URL, date/format/cinema changes, Back/Forward, header city,
empty format, repeated day selection, API errors and booking recheck. No tests,
lint/typecheck/build or browser verification performed; no BE/generated/reference
edits, database changes, commits or pushes.

## USER trailer dialog — 2026-11-16

Hero, shared movie cards (home/catalog/search) and movie detail now use one Reka
trailer dialog following the reference modal title/player/close/action layout.
Uses the existing MovieResponse.trailerUrl and poster, with direct MP4/WebM/Ogg
video or YouTube embed URL according to the official player documentation. Other
HTTP(S) sources retain an original-link fallback; no demo clip or captions are
invented. Player resources mount only after the user opens the dialog and unmount
on close/navigation. Hero auto-advance pauses while the dialog is open, and the
clicked film is snapshotted to avoid switching videos during catalogue updates.

Includes native-video loading/error feedback, keyboard close/focus through Reka,
responsive scrolling dialog and original-source link if embedding is unavailable.
YouTube load does not imply playback success; provider restrictions remain visible
in the embedded player, with original link available. No autoplay or extra SDK.

Manual checks: open from hero/card/detail, close via button/Escape/outside click,
focus return, hero pause/resume, route change stops playback, valid/unavailable
video, YouTube links and unsupported source fallback, desktop/mobile. No tests,
lint/typecheck/build or browser/media runtime verification performed. No BE/API
contract/generated/reference edits, database changes, commits or pushes.

## USER booking status tabs — 2026-11-16

The regenerated customer booking list now supports repeated status parameters.
Integrated this contract after checking BookingController and the repository-backed
status filter before pagination. Added Reka tabs: All, Confirmed and Unfinished
(all current booking statuses other than CONFIRMED). No per-page client filtering
or fabricated counts. Query keys include normalized status sets; response validation
checks owner, requested page and selected statuses.

Selection and page are URL-backed on `/account/bookings?tab=confirmed` or
`?tab=unfinished&page=2`; changing tab resets page. Includes error/retry, empty
filtered results, an All action and keyboard/mobile tab navigation. Existing
detail/payment/cancel flows are retained. Reference's Upcoming/Past labels remain
deferred: status filtering alone cannot classify by showtime/check-in correctly.

Manual checks: all/confirmed/unfinished, repeated status query parameters and
server totals, pagination reset, Back/Forward, filtered empty results, account
switch and cancellation then list refresh. No tests/lint/typecheck/build or browser
verification performed; no generated/BE edits, database changes or commits/pushes.

## USER global search — 2026-11-16

Added `/search?q=...` matching Lumière's search heading, keyword form and separate
movie/cinema results. Reuses the existing public movie catalogue mapper/query,
CatalogMovieCard, cinema catalogue and AppPagination; matching accepts Vietnamese
with or without accents. Search covers the available system catalogue rather than
the currently selected cinema, and cinema matches include city/address.

Query and independent result pages are URL-backed (`q`, `page`, `cinemaPage`) for
Back/Forward. Movie query accepts an optional enabled flag (existing callers keep
the default); blank search does not trigger it. Header search now opens/focuses
the new search form after page loading; footer links to search. Includes partial
API failures with retry, empty state, mobile layout and no fabricated results.

Manual checks: header search, submit accented/unaccented keywords, movie/cinema
detail links, independent pagination, Back/Forward, reload shared URL, clear query,
API failures and mobile focus. No tests/lint/typecheck/build or browser verification
performed; existing generated-client changes were preserved without edits.

## USER experiences — 2026-11-16

Added `/experiences`, linked from desktop/mobile primary navigation, footer and
cinema detail. Follows Lumière's numbered experience tile grid (3/2/1 columns).
Available room types, formats and cinema links are derived from active cinemas
and their active-room APIs, reusing existing room query keys. No mock cinema,
availability, pricing or unsupported bed-room type is introduced. Descriptions
avoid unverified equipment/amenity claims.

Includes initial loading, cinema-catalog errors, partial room-query errors with
retry, empty data and retained successful results. Existing APIs require one room
request per cinema; there is no new endpoint. Manual checks: `/experiences`,
navigation on desktop/mobile, card cinema links → detail → schedule, empty room
data and partial failures. No tests/lint/typecheck/build or browser verification
performed; no BE/generated/reference changes, commits or pushes.

## USER support pages — 2026-11-16

Added `/support`, `/support/guide`, `/support/contact` with Lumière's support
heading, sticky sidebar, grouped FAQ and guide panel. FAQ uses Reka Accordion;
mobile navigation scrolls horizontally. Operational copy follows the real flow:
authentication, server hold deadline, quote recheck, payment processing and
confirmed-booking ticket access, without demo limits, prices or policies.

Contact shows published cinema details through existing public cinema APIs;
there is no fake support submission or demo hotline/email. Footer links now open
all three pages; unconfirmed booking results link to contact. Legal/demo policy
pages remain excluded because demo copy is not a production policy.

Manual checks: footer navigation; expand FAQ with keyboard; guide → booking;
contact cinema selection, valid tel/mail links, empty contact fields and API
retry; mobile sidebar and loading. No test/lint/typecheck/build or browser
verification performed; no BE/generated/reference edits, commits or pushes.

## USER cinema detail — 2026-11-16

Added `/cinemas/:cinemaId`, linked from the cinema list, following Lumière's
cinemaDetail cover, information panels and movie-grouped schedule. Cinema,
amenities, active rooms and bookable schedules use existing generated APIs.
The cover uses the existing illustration because CinemaResponse has no cover
image. Missing contact/directions data is not invented. Includes invalid/inactive
cinema, loading, retry, empty schedules and mobile layouts.

CustomerSchedule is extracted from ShowtimesPage and reused through the home
feature's public export; the normal schedule keeps its filters, while cinema
detail pins the cinema and shows the date strip. Choosing a slot rechecks current
availability before the existing booking route. Login error initialization now
respects the explicit sign-in redirect failure flag used by the route guard.

Manual checks: cinema list → detail → change date → select a slot; verify the
cinema remains pinned even if the header city changes; check inactive/invalid IDs,
API errors, empty amenities/rooms, mobile and keyboard focus. Existing login
redirect failure should still show its error and retry. No test/lint/typecheck/
build or browser/runtime verification performed; no BE/generated/reference edits.

## USER payment processing screen — 2026-11-13

Pay now switches draft checkout into the reference processing view immediately
while quote/create is running, keeping the request component mounted. After BE
returns an ID, `/booking/processing/:bookingId` continues owner-scoped booking and
payment reads. The shared BookingProcessing view follows resultPage's spinner,
heading/copy and mobile sizes; no artificial success or minimum wait. Errors return
to checkout/retry or show recovery controls, with idempotent payload preserved.
Results still require authoritative BE status; ticket access requires CONFIRMED.
Syntax/diff checks only; no tests/build/typecheck, browser or payment transactions.

## USER seat-to-checkout navigation — 2026-11-13

Continue on the seat page now navigates directly to
`/booking/checkout?showtimeId=...`, without a review modal, quote or create mutation
on the seat page. Draft checkout owns quote review, provider selection and consent;
only its explicit confirmation submits a booking. Session-scoped selection restores
on Back/reload by owner/showtime. Existing idempotent requests are retained unchanged.
Prices are rechecked and changes require confirmation again. Async quote callbacks
cannot submit after leaving the page. A one-use in-memory payment intent carries
explicit consent through the created-order route to the real provider URI once ready;
it is not restored by URL/reload and is cleared on account changes/navigation.
Checkout/result/ticket routes for existing orders remain supported; no demo cap of 8.
Verification: Vue/TS/CSS syntax and diff checks only; no tests, lint, build, typecheck,
browser/payment transaction was performed in this change.

## USER checkout/result/ticket UI — 2026-11-12

Checkout and result now use a dedicated BookingOrderPage following Lumière
checkout/result structure instead of the account order-management view. A new
authenticated `/booking/ticket/:bookingId` displays confirmed booking information
in the reference ticket layout, with browser printing and links from confirmed
orders. No fabricated QR or ticket-usage data is issued. Unconfirmed ticket
routes go to result after a successful booking read; final checkout states also
go to result. Payment result remains distinct from booking confirmation.
Generated/source VNPAY/MOMO provider selection is captured before creating an
order, preserved during retry and shown on checkout. No eight-customer demo cap.
Tests, lint, typecheck, build, browser/payment/print runtime checks were not run.
See USER_BOOKING_FLOW.md for contract limitations and manual checks.

## USER payment checkout integration — 2026-11-12

Current source/generated now include the authenticated owner checkout read API.
FE wires it through a booking feature query and payment panel, with dedicated
`/booking/checkout/:bookingId` and `/booking/result/:bookingId` routes sharing the
existing order view. Old detail links remain supported. Pending payment preparation,
provider handoff, success awaiting booking confirmation, failures/expiry/reconciliation,
retry and deadline gates are handled without simulating payment or issuing QR codes.
The seat page adds a mobile recap with the same checkout action instance.

No demo limit of eight customers is imposed. Quote allows up to 100 seat units;
Booking service's configurable maximum (default 10 units) remains authoritative.
Food, discounts, guest lookup and ticket/QR issuance still lack inspected contracts;
the full reference journey is not complete. See USER_BOOKING_FLOW.md for gaps and checks.
Verification is syntax/diff only; no tests, build, typecheck, browser or payment transaction.
The older statement below that no customer checkout endpoint exists is superseded.

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

| Area                                                       | Code present                   | API wired in source                                                  | Browser/manual | Automated checks |
| ---------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------- | -------------- | ---------------- |
| Admin dashboard                                            | Yes                            | Movie, cinema and schedule reads; not proof of complete reporting    | Not run        | Not run          |
| Admin movies and genres                                    | Yes                            | Reads and mutations, including nested screening versions             | Not run        | Not run          |
| Admin cinemas, rooms and room formats                      | Yes                            | Management queries and mutations                                     | Not run        | Not run          |
| Admin room seat catalog                                    | Yes                            | Published seat-map reads and catalog seat activity changes           | Not run        | Not run          |
| Admin room matrix                                          | Yes                            | Load, create draft, save, publish and copy published layout          | Not run        | Not run          |
| Admin pricing                                              | Yes                            | List/detail, draft/configuration/fares, publish, lookup and previews | Not run        | Not run          |
| Admin showtimes                                            | Yes                            | Day-range list, creation, pricing assignment and opening for booking | Not run        | Not run          |
| Admin bookings                                             | Yes                            | Admin search/list and read-only detail                               | Not run        | Not run          |
| Admin payment operations                                   | Generated lookup clients exist | No payment lookup/reconciliation UI wired in inspected booking pages | Not run        | Not run          |
| Admin users and promotions                                 | Reference pages                | No management integration in those routes                            | Not run        | Not run          |
| Customer home, movie catalog/detail                        | Yes                            | Movie/programme reads and header search                              | Not run        | Not run          |
| Customer cinemas                                           | List page and cinema selection | Location/programme reads; no dedicated cinema-detail route           | Not run        | Not run          |
| Customer booking start and seat selection                  | Yes                            | Context, seat/status reads and server quote; selection remains local | Not run        | Not run          |
| Customer login/callback                                    | Yes                            | OIDC authorization code flow with PKCE                               | Not run        | Not run          |
| Customer standalone showtimes, account and booking history | Placeholders                   | No completed page integration                                        | Not run        | Not run          |

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

| Runtime URL                         | Reported OpenAPI version | Inspected schemas                                                                                   |
| ----------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `http://localhost:8081/v3/api-docs` | 3.0.1                    | CreateMovieScreeningVersionRequest, SaveMovieScreeningVersionRequest, MovieScreeningVersionResponse |
| `http://localhost:8083/v3/api-docs` | 3.1.0                    | ShowtimeScreeningVersionResponse, RoomLayoutMatrixInput, RoomLayoutMatrixResponse                   |

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
